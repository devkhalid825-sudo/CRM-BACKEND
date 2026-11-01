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
        const prompt = `You are a world-class B2B digital agency sales strategist. Analyze this prospective business client and identify what tech and digital services they need most, and craft cold outreach pitches for them:
- Custom Website Development (Next.js / WordPress / Web Apps)
- Mobile App Development (iOS, Android, Flutter)
- Custom CRM & Lead Automation Systems
- Shopify & E-Commerce Store Architecture
- AI Video Ads & Explainer Video Production
- Commercial Product Photography & AI Visuals
- SEO & Google Search Ranking
- Dedicated Remote Staff Augmentation (Developers, Marketers, Editors)

Business Name: ${lead.name}
Category/Industry: ${lead.categoryName || 'Business'}
Location: ${lead.city}, ${lead.country}
Website: ${lead.website || 'No website available'}
Rating: ${lead.rating || 'N/A'}
Current Tags: ${Array.isArray(lead.tags) ? lead.tags.join(', ') : 'None'}

Return ONLY a valid JSON object with these exact keys:
{
  "neededServices": ["Service 1", "Service 2", "Service 3", "Service 4"],
  "businessOpportunity": "1-2 sentences explaining why this business needs tech help and what growth opportunities they have.",
  "painPoints": ["Pain point 1", "Pain point 2"],
  "whatsappPitchScript": "A catchy, personalized 2-sentence WhatsApp outreach message to the owner offering digital services.",
  "callPitchHook": "1-sentence hook to say when they answer a cold call.",
  "remoteStaffPitch": "Pitch offering dedicated remote developer/staff to save 60% hiring cost.",
  "estimatedDealValue": "$800 - $2,500/mo"
}`;
        // Check Meta Pixel if website exists
        let hasMetaPixel = false;
        if (lead.website) {
            try {
                const targetUrl = lead.website.startsWith('http') ? lead.website : `https://${lead.website}`;
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 3500);
                const res = await fetch(targetUrl, {
                    signal: controller.signal,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
                });
                clearTimeout(timeout);
                if (res.ok) {
                    const html = await res.text();
                    if (html.includes('fbq(') || html.includes('connect.facebook.net') || html.includes('fbevents.js')) {
                        hasMetaPixel = true;
                    }
                }
            }
            catch {
                // network or timeout
            }
        }
        const metaAudit = {
            hasWebsite: !!lead.website,
            hasMetaPixel,
            adStatus: !lead.website
                ? 'No Website (High-Priority Website/Funnel Pitch)'
                : !hasMetaPixel
                    ? 'Website Found, Missing Meta Pixel (Wasted Ad Spend)'
                    : 'Active Funnel (UGC Video Creatives & ROAS Scaling)',
            metaPitchScript: !lead.website
                ? `Hi ${lead.name}, noticed your brand advertising on Meta/Instagram! Since you don't have a dedicated landing page or store, you're losing over 50% of interested buyers. We can build a fast, high-converting mobile store with Meta Pixel in 48 hours to double your sales!`
                : !hasMetaPixel
                    ? `Hi ${lead.name}, I checked your online store and noticed your Meta Tracking Pixel isn't active. This means Facebook cannot track purchases or retarget buyers, wasting your daily ad budget. We can fix your Pixel + Conversions API so your ROAS increases immediately.`
                    : `Hi ${lead.name}, saw your ads on Instagram! Static photo ads get very low click rates today. We create scroll-stopping UGC (User-Generated Content) video ads and high-converting hooks that 2x your ROAS. Would you like to see 2 quick video concepts for ${lead.name}?`,
            recommendedService: !lead.website
                ? 'Landing Page / E-Commerce Store Development ($500 - $1,200)'
                : !hasMetaPixel
                    ? 'Meta Pixel & Conversion API Setup + Funnel Optimization ($350 - $600)'
                    : 'High-Converting UGC Video Ads & Ad Creatives ($400 - $800/mo)',
        };
        const remoteStaffPitch = `Hi ${lead.name}, noticed your growing team in ${lead.city}! Instead of spending $5,000+/mo on local tech hires, we provide dedicated, pre-vetted remote software developers, video editors, and digital marketers starting at $1,200/mo. Can I send you 2 senior candidate profiles?`;
        let result = {
            neededServices: [
                lead.website ? 'Custom Web App / Next.js Redesign' : 'Modern Website Development (Next.js / WordPress)',
                'Mobile App Development (iOS, Android, Flutter)',
                'Custom CRM & Lead Automation Architecture',
                'Shopify & E-Commerce Store Development',
                'AI Video Ads & Commercial Explainer Production',
                'Commercial Product Photography & AI Visuals',
                'SEO & High-Intent Google Search Ranking',
                'Dedicated Remote Staff (Developers, Marketers, Editors)',
            ],
            businessOpportunity: `${lead.name} in ${lead.city} has high scaling potential. They can significantly cut overheads and accelerate delivery by deploying custom tech solutions and remote agency talent.`,
            painPoints: [
                lead.website ? 'Website may lack high-converting funnels or mobile responsiveness' : 'Missing official web platform, losing customers to modern competitors',
                'High cost of local hiring ($4,000 - $7,000/mo per in-house employee)',
                'Lack of custom CRM automation to capture and convert incoming leads',
                'Need for scroll-stopping video ads and commercial visual content',
            ],
            whatsappPitchScript: `Hi ${lead.name}, noticed your business in ${lead.city}! We help businesses in your space scale revenue with custom web/app systems and dedicated remote tech staff. Open to a quick 2-minute overview?`,
            callPitchHook: `Hi, I saw ${lead.name} in ${lead.city} and noticed a huge opportunity to cut your tech costs by 60% with dedicated custom development. Do you have 30 seconds?`,
            remoteStaffPitch,
            estimatedDealValue: '$800 - $2,500/mo',
            metaAudit,
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