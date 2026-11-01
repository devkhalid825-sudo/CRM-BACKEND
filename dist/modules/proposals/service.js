import { prisma } from '../../db/prisma.js';
import { geminiProvider } from '../../integrations/ai/gemini.js';
import { keyPool } from '../../services/keyPool.js';
import { logger } from '../../services/logger.js';
export class ProposalsService {
    /**
     * Create a new commercial proposal with unique public token
     */
    async createProposal(input) {
        const totalAmount = input.items.reduce((sum, it) => sum + it.qty * it.rate, 0);
        const proposal = await prisma.proposal.create({
            data: {
                leadId: input.leadId,
                userId: input.userId,
                title: input.title,
                currency: input.currency || 'USD',
                items: input.items,
                totalAmount,
                status: 'draft',
                notes: input.notes,
                validUntil: input.validUntil,
            },
        });
        // Record on lead timeline
        await prisma.leadEvent.create({
            data: {
                leadId: input.leadId,
                type: 'proposal',
                actorId: input.userId,
                payload: {
                    proposalId: proposal.id,
                    title: proposal.title,
                    totalAmount,
                    currency: proposal.currency,
                    token: proposal.token,
                },
            },
        });
        // Advance lead status to 'proposal' if not already won
        const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
        if (lead && lead.status !== 'won') {
            await prisma.lead.update({
                where: { id: input.leadId },
                data: { status: 'proposal' },
            });
        }
        return proposal;
    }
    /**
     * List proposals for CRM dashboard
     */
    async listProposals(query) {
        const where = {};
        if (query.leadId)
            where.leadId = query.leadId;
        if (query.userId)
            where.userId = query.userId;
        return prisma.proposal.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }
    /**
     * Get single proposal by ID
     */
    async getProposalById(id) {
        return prisma.proposal.findUnique({ where: { id } });
    }
    /**
     * Public Client Portal: Get proposal by public token (tracks viewedAt)
     */
    async getProposalByToken(token) {
        const proposal = await prisma.proposal.findUnique({ where: { token } });
        if (!proposal)
            return null;
        // Track first view
        if (!proposal.viewedAt) {
            await prisma.proposal.update({
                where: { id: proposal.id },
                data: { viewedAt: new Date(), status: proposal.status === 'draft' ? 'sent' : proposal.status },
            });
            await prisma.leadEvent.create({
                data: {
                    leadId: proposal.leadId,
                    type: 'proposal',
                    payload: {
                        action: 'proposal_viewed',
                        title: proposal.title,
                        token,
                    },
                },
            });
        }
        const lead = await prisma.lead.findUnique({
            where: { id: proposal.leadId },
            select: { name: true, city: true, country: true, website: true },
        });
        return { ...proposal, lead };
    }
    /**
     * Public Client Portal: Accept or reject proposal
     */
    async updatePublicProposalAction(token, action, clientNotes) {
        const proposal = await prisma.proposal.findUnique({ where: { token } });
        if (!proposal)
            throw new Error('Proposal not found');
        const newStatus = action === 'accept' ? 'accepted' : 'rejected';
        const acceptedAt = action === 'accept' ? new Date() : null;
        const updated = await prisma.proposal.update({
            where: { id: proposal.id },
            data: {
                status: newStatus,
                acceptedAt,
                notes: clientNotes ? `${proposal.notes || ''}\nClient feedback: ${clientNotes}`.trim() : proposal.notes,
            },
        });
        // If accepted, advance lead status to 'won'
        if (action === 'accept') {
            await prisma.lead.update({
                where: { id: proposal.leadId },
                data: { status: 'won' },
            });
        }
        // Log event on lead timeline
        await prisma.leadEvent.create({
            data: {
                leadId: proposal.leadId,
                type: 'status',
                payload: {
                    action: action === 'accept' ? 'proposal_accepted' : 'proposal_rejected',
                    proposalTitle: proposal.title,
                    totalAmount: proposal.totalAmount,
                    currency: proposal.currency,
                    clientNotes,
                },
            },
        });
        return updated;
    }
    /**
     * Generate Proposal Scope & Items with Gemini AI
     */
    async generateAIProposalDraft(leadId) {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead)
            throw new Error('Lead not found');
        const prompt = `You are a B2B sales strategist. Create a tailored service proposal for this business:
Business Name: ${lead.name}
Category: ${lead.categoryName || 'Local Business'}
Location: ${lead.city}, ${lead.country}
Website: ${lead.website || 'None'}

Return ONLY a valid JSON object in this exact format:
{
  "title": "Comprehensive Growth & Digital Strategy Proposal for ${lead.name}",
  "notes": "A 2-3 paragraph executive summary outlining the value proposition, deliverables, and projected timeline.",
  "items": [
    { "item": "Core Service / Setup", "qty": 1, "rate": 500 },
    { "item": "Monthly Retainer / Optimization", "qty": 1, "rate": 750 },
    { "item": "Audit & Strategy Session", "qty": 1, "rate": 250 }
  ]
}`;
        // Try available active key from keyPool for gemini
        const keys = await keyPool.getAvailableKeys('gemini');
        const rawKey = keys[0]?.rawKey || process.env.GEMINI_API_KEY || '';
        if (!rawKey) {
            // Fallback proposal if no Gemini key available
            return {
                title: `Comprehensive Growth Package for ${lead.name}`,
                notes: `Tailored commercial proposal designed to elevate market position and client acquisition for ${lead.name} in ${lead.city}.`,
                items: [
                    { item: 'Full Digital Presence & Local SEO Optimization', qty: 1, rate: 450 },
                    { item: 'Customer Acquisition & Funnel Management', qty: 1, rate: 650 },
                    { item: 'Reputation Management & Review Acceleration', qty: 1, rate: 200 },
                ],
            };
        }
        try {
            const generatedText = await geminiProvider.generate(prompt, { apiKey: rawKey });
            const cleanJson = generatedText.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            return {
                title: parsed.title || `Growth Proposal for ${lead.name}`,
                notes: parsed.notes || 'Executive proposal summary.',
                items: Array.isArray(parsed.items) && parsed.items.length > 0
                    ? parsed.items
                    : [{ item: 'Strategic Growth Services', qty: 1, rate: 1000 }],
            };
        }
        catch (err) {
            logger.warn('proposals', `AI Proposal generation fallback: ${err.message}`);
            return {
                title: `Commercial Service Proposal for ${lead.name}`,
                notes: `Designed specifically for ${lead.name} to accelerate business performance in ${lead.city}.`,
                items: [
                    { item: 'Core Service Delivery & Strategy', qty: 1, rate: 500 },
                    { item: 'Monthly Growth & Performance Maintenance', qty: 1, rate: 500 },
                ],
            };
        }
    }
}
export const proposalsService = new ProposalsService();
//# sourceMappingURL=service.js.map