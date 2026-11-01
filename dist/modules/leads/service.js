import ExcelJS from 'exceljs';
import { prisma } from '../../db/prisma.js';
import { extractEmailsFromWebsite } from '../../services/scraper.js';
import { AppError } from '../../services/errors.js';
import { keyPool } from '../../services/keyPool.js';
import { geminiProvider } from '../../integrations/ai/gemini.js';
export class LeadsService {
    async getLeads(filters, userRole, userId) {
        const page = Math.max(filters.page || 1, 1);
        const limit = Math.min(filters.limit || 50, 200);
        const skip = (page - 1) * limit;
        const where = {
            archivedAt: null,
        };
        // Role-based scoping (Rule 5 & Acceptance check: Sales see only own assigned leads)
        if (userRole === 'sales' && userId) {
            where.ownerId = userId;
        }
        else if (filters.ownerId) {
            where.ownerId = filters.ownerId;
        }
        if (filters.country)
            where.country = filters.country;
        if (filters.city)
            where.city = { equals: filters.city, mode: 'insensitive' };
        if (filters.categoryId)
            where.categoryId = filters.categoryId;
        if (filters.status)
            where.status = filters.status;
        if (filters.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { address: { contains: filters.search, mode: 'insensitive' } },
                { website: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        const [items, total] = await Promise.all([
            prisma.lead.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.lead.count({ where }),
        ]);
        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getLeadById(id) {
        return prisma.lead.findUnique({ where: { id } });
    }
    async updateLead(id, data) {
        const existing = await prisma.lead.findUnique({ where: { id } });
        if (!existing) {
            throw new AppError(`Lead with ID '${id}' not found`, 404);
        }
        return prisma.lead.update({
            where: { id },
            data,
        });
    }
    /**
     * Scrapes website of a single lead to discover contact emails
     */
    async scrapeLeadEmail(id) {
        const lead = await prisma.lead.findUnique({ where: { id } });
        if (!lead)
            throw new AppError(`Lead with ID '${id}' not found`, 404);
        if (!lead.website)
            return { lead, found: 0, emails: [] };
        const emails = await extractEmailsFromWebsite(lead.website);
        if (emails.length > 0) {
            const existingEmails = Array.isArray(lead.emails) ? lead.emails : [];
            const mergedEmails = Array.from(new Set([...existingEmails, ...emails]));
            const existingTags = Array.isArray(lead.tags) ? lead.tags : [];
            const updatedTags = Array.from(new Set([...existingTags, 'Has Email']));
            const updated = await prisma.lead.update({
                where: { id },
                data: {
                    emails: mergedEmails,
                    tags: updatedTags,
                },
            });
            return { lead: updated, found: emails.length, emails };
        }
        return { lead, found: 0, emails: [] };
    }
    /**
     * Batch enriches all leads that have a website but no email
     */
    async enrichAllLeadEmails(limit = 50) {
        const leads = await prisma.lead.findMany({
            where: {
                website: { not: null },
                emails: { equals: [] },
            },
            take: limit,
        });
        let enrichedCount = 0;
        for (const lead of leads) {
            if (lead.website) {
                try {
                    const res = await this.scrapeLeadEmail(lead.id);
                    if (res.found > 0)
                        enrichedCount++;
                }
                catch {
                    // ignore individual scraper errors
                }
            }
        }
        return { scanned: leads.length, enriched: enrichedCount };
    }
    /**
     * Analyzes a company's profile to discover:
     * 1. What services they need most (Website, SEO, Ads, Chatbots, etc.)
     * 2. Their core pain points
     * 3. Perfect cold pitch script (WhatsApp / Phone)
     * 4. Suggested budget range
     */
    async analyzeLeadNeeds(leadId) {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead)
            throw new AppError('Lead not found', 404);
        const prompt = `You are a world-class B2B agency sales strategist. Analyze this prospective business client and identify what high-ticket services they need most right now and how to pitch them:

Business Name: ${lead.name}
Category/Industry: ${lead.categoryName || 'Business'}
Location: ${lead.city}, ${lead.country}
Website: ${lead.website || 'No website available'}
Rating: ${lead.rating || 'N/A'}
Current Tags: ${Array.isArray(lead.tags) ? lead.tags.join(', ') : 'None'}

Return ONLY a valid JSON object with these exact keys:
{
  "neededServices": ["Service 1", "Service 2", "Service 3"],
  "businessOpportunity": "1-2 sentences explaining why this business needs help and what gaps they have.",
  "painPoints": ["Pain point 1", "Pain point 2"],
  "whatsappPitchScript": "A catchy, personalized 2-sentence WhatsApp outreach message to the owner.",
  "callPitchHook": "1-sentence hook to say when they answer a cold call.",
  "estimatedDealValue": "$500 - $1,500"
}`;
        let result = {
            neededServices: [
                lead.website ? 'High-Converting Website Redesign' : 'Modern Professional Website Development',
                'Google Maps & Local SEO Ranking',
                'Targeted Meta (Facebook & Instagram) Ad Campaigns',
                'AI Customer Support Chatbot & WhatsApp Automation',
            ],
            businessOpportunity: `${lead.name} in ${lead.city} has strong market potential but needs a modern digital customer acquisition system to outpace local competitors.`,
            painPoints: [
                lead.website ? 'Website may not be optimized for mobile conversion or fast page speed' : 'Missing official website, losing high-intent buyers to competitors',
                'Lack of automated lead capture and instant WhatsApp response',
                'Competitors ranking higher on Google Maps searches',
            ],
            whatsappPitchScript: `Hi ${lead.name}, noticed your business in ${lead.city}! We help businesses in your space generate 20+ qualified inquiries every month through targeted local funnels. Open to a quick 2-minute overview?`,
            callPitchHook: `Hi, I noticed ${lead.name} in ${lead.city} and saw a big opportunity to boost your customer inquiries this month. Do you have 30 seconds?`,
            estimatedDealValue: '$500 - $1,500',
        };
        // Try Gemini AI if available
        try {
            const keys = await keyPool.getAvailableKeys('gemini');
            const rawKey = keys[0]?.rawKey || process.env.GEMINI_API_KEY || '';
            if (rawKey) {
                const generated = await geminiProvider.generate(prompt, { apiKey: rawKey });
                const clean = generated.replace(/```json|```/g, '').trim();
                const parsed = JSON.parse(clean);
                result = { ...result, ...parsed };
            }
        }
        catch {
            // fallback to rich heuristics
        }
        return result;
    }
    /**
     * Generates a fully-formatted Excel workbook (.xlsx)
     */
    async generateExcelWorkbook(filters, userRole, userId) {
        const { items } = await this.getLeads({ ...filters, limit: 5000 }, userRole, userId);
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Global Lead CRM';
        workbook.created = new Date();
        const sheet = workbook.addWorksheet('Business Leads', {
            views: [{ state: 'frozen', ySplit: 1 }],
        });
        sheet.columns = [
            { header: 'Business Name', key: 'name', width: 28 },
            { header: 'Phone Number', key: 'phone', width: 18 },
            { header: 'Email Address', key: 'email', width: 25 },
            { header: 'Website', key: 'website', width: 25 },
            { header: 'Address', key: 'address', width: 35 },
            { header: 'City', key: 'city', width: 15 },
            { header: 'Country', key: 'country', width: 12 },
            { header: 'Rating', key: 'rating', width: 10 },
            { header: 'Status', key: 'status', width: 14 },
            { header: 'Tags', key: 'tags', width: 22 },
            { header: 'Lead Source', key: 'source', width: 16 },
            { header: 'Added Date', key: 'createdAt', width: 18 },
        ];
        // Format Header Row
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF16A34A' }, // Emerald green
        };
        for (const lead of items) {
            const phones = Array.isArray(lead.phones) ? lead.phones.join(', ') : lead.phoneNorm || '';
            const emails = Array.isArray(lead.emails) ? lead.emails.join(', ') : '';
            const tags = Array.isArray(lead.tags) ? lead.tags.join(', ') : '';
            sheet.addRow({
                name: lead.name,
                phone: phones,
                email: emails,
                website: lead.website || '',
                address: lead.address || '',
                city: lead.city,
                country: lead.country,
                rating: lead.rating || 'N/A',
                status: lead.status.toUpperCase(),
                tags,
                source: lead.source,
                createdAt: new Date(lead.createdAt).toLocaleDateString(),
            });
        }
        return await workbook.xlsx.writeBuffer();
    }
}
export const leadsService = new LeadsService();
//# sourceMappingURL=service.js.map