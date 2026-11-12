import ExcelJS from 'exceljs';
import { prisma } from '../../db/prisma.js';
import { extractEmailsFromWebsite } from '../../services/scraper.js';
import { scanLeadWebsiteForMeta } from '../../services/metaDetector.js';
import { AppError } from '../../services/errors.js';
import { keyPool } from '../../services/keyPool.js';
import { geminiProvider } from '../../integrations/ai/gemini.js';

export interface LeadFilters {
  country?: string;
  city?: string;
  categoryId?: string;
  status?: string;
  ownerId?: string;
  tag?: string;
  search?: string;
  metaIntegrated?: boolean | string;
  runningAds?: boolean | string;
  page?: number;
  limit?: number;
}

export class LeadsService {
  async getLeads(filters: LeadFilters, userRole?: string, userId?: string) {
    const page = Math.max(filters.page || 1, 1);
    const limit = Math.min(filters.limit || 50, 200);
    const skip = (page - 1) * limit;

    const where: any = {
      archivedAt: null,
    };

    // Role-based scoping
    if (userRole === 'sales' && userId) {
      where.ownerId = userId;
    } else if (filters.ownerId) {
      where.ownerId = filters.ownerId;
    }

    if (filters.country) where.country = filters.country;
    if (filters.city) where.city = { equals: filters.city, mode: 'insensitive' };
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { address: { contains: filters.search, mode: 'insensitive' } },
        { website: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const isMeta = filters.metaIntegrated === 'true' || filters.metaIntegrated === true;
    const isAds = filters.runningAds === 'true' || filters.runningAds === true;

    try {
      // Query with filters
      let items = await prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      // In-memory filter for flexible JSON tags & adsInfo
      if (isMeta || isAds || filters.tag) {
        items = items.filter((lead) => {
          const leadTags = Array.isArray(lead.tags) ? (lead.tags as string[]) : [];
          const ads = (lead.adsInfo as any) || {};

          if (isMeta) {
            const hasMeta =
              leadTags.includes('Meta Integrated') ||
              leadTags.includes('Meta Pixel Active') ||
              ads.pixelDetected === true ||
              lead.source === 'meta_integrated';
            if (!hasMeta) return false;
          }

          if (isAds) {
            const hasAds =
              leadTags.includes('Meta Ads Active') ||
              ads.running === true;
            if (!hasAds) return false;
          }

          if (filters.tag && !leadTags.includes(filters.tag)) {
            return false;
          }

          return true;
        });
      }

      const total = items.length;
      const paginatedItems = items.slice(skip, skip + limit);

      return {
        items: paginatedItems,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch {
      // Direct simple fallback
      const [items, total] = await Promise.all([
        prisma.lead.findMany({
          where: { archivedAt: null },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.lead.count({ where: { archivedAt: null } }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }
  }

  async getLeadById(id: string) {
    return prisma.lead.findUnique({ where: { id } });
  }

  async updateLead(id: string, data: any) {
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
  async scrapeLeadEmail(id: string) {
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new AppError(`Lead with ID '${id}' not found`, 404);
    if (!lead.website) return { lead, found: 0, emails: [] };

    const emails = await extractEmailsFromWebsite(lead.website);
    if (emails.length > 0) {
      const existingEmails = Array.isArray(lead.emails) ? (lead.emails as string[]) : [];
      const mergedEmails = Array.from(new Set([...existingEmails, ...emails]));
      const existingTags = Array.isArray(lead.tags) ? (lead.tags as string[]) : [];
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
   * Scans lead website for Meta Pixel, Instagram, Facebook links, and active Ads status
   */
  async scanLeadMeta(id: string) {
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new AppError(`Lead with ID '${id}' not found`, 404);

    const metaResult = await scanLeadWebsiteForMeta(lead.website || '', lead.name);

    const existingTags = Array.isArray(lead.tags) ? (lead.tags as string[]) : [];
    const newTags = new Set(existingTags);

    if (metaResult.isMetaIntegrated) {
      newTags.add('Meta Integrated');
    }
    if (metaResult.hasMetaPixel) {
      newTags.add('Meta Pixel Active');
      newTags.delete('Missing Meta Pixel');
    } else if (lead.website) {
      newTags.add('Missing Meta Pixel');
    }

    if (metaResult.runningAds) {
      newTags.add('Meta Ads Active');
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        tags: Array.from(newTags),
        adsInfo: {
          running: metaResult.runningAds,
          platforms: metaResult.runningAds ? ['Facebook', 'Instagram', 'Meta'] : [],
          pixelDetected: metaResult.hasMetaPixel,
          pixelIds: metaResult.pixelIds,
          facebookUrl: metaResult.facebookUrl,
          instagramUrl: metaResult.instagramUrl,
          adLibraryUrl: metaResult.adLibraryUrl,
          checkedAt: new Date().toISOString(),
        },
      },
    });

    return { lead: updated, metaResult };
  }

  /**
   * Batch scans leads for Meta Pixel & Ads Intelligence
   */
  async scanAllLeadsMeta(limit = 50) {
    const leads = await prisma.lead.findMany({
      where: {
        website: { not: null },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    let scannedCount = 0;
    let metaCount = 0;

    for (const lead of leads) {
      try {
        const res = await this.scanLeadMeta(lead.id);
        scannedCount++;
        if (res.metaResult.isMetaIntegrated) metaCount++;
      } catch {
        // ignore individual errors
      }
    }

    return { scanned: scannedCount, metaIntegrated: metaCount };
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
          if (res.found > 0) enrichedCount++;
        } catch {
          // ignore individual scraper errors
        }
      }
    }
    return { scanned: leads.length, enriched: enrichedCount };
  }

  /**
   * Analyzes a company's profile to discover needs and pitches
   */
  async analyzeLeadNeeds(leadId: string) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw new AppError('Lead not found', 404);

    const prompt = `You are a world-class B2B digital agency sales strategist. Analyze this prospective business client and identify what tech and digital services they need most:
- Custom Website Development (Next.js / WordPress / Web Apps)
- Mobile App Development (iOS, Android, Flutter)
- Custom CRM & Lead Automation Systems
- Shopify & E-Commerce Store Architecture
- AI Video Ads & Explainer Video Production
- Commercial Product Photography & AI Visuals
- SEO & Google Search Ranking
- Dedicated Remote Staff Augmentation

Business Name: ${lead.name}
Category/Industry: ${lead.categoryName || 'Business'}
Location: ${lead.city}, ${lead.country}
Website: ${lead.website || 'No website available'}
Rating: ${lead.rating || 'N/A'}
Current Tags: ${Array.isArray(lead.tags) ? (lead.tags as string[]).join(', ') : 'None'}

Return ONLY a valid JSON object:
{
  "neededServices": ["Service 1", "Service 2", "Service 3", "Service 4"],
  "businessOpportunity": "1-2 sentences explaining growth opportunities.",
  "painPoints": ["Pain point 1", "Pain point 2"],
  "whatsappPitchScript": "Catchy 2-sentence WhatsApp outreach message.",
  "callPitchHook": "1-sentence cold call hook.",
  "remoteStaffPitch": "Remote developer offer saving 60% cost.",
  "estimatedDealValue": "$800 - $2,500/mo"
}`;

    // Meta Pixel & Ads quick check
    let hasMetaPixel = false;
    let pixelIds: string[] = [];
    if (lead.website) {
      try {
        const metaRes = await scanLeadWebsiteForMeta(lead.website, lead.name);
        hasMetaPixel = metaRes.hasMetaPixel;
        pixelIds = metaRes.pixelIds;
      } catch {
        // ignore
      }
    }

    const metaAudit = {
      hasWebsite: !!lead.website,
      hasMetaPixel,
      pixelIds,
      adLibraryUrl: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(
        lead.name
      )}`,
      adStatus: !lead.website
        ? 'No Website (High-Priority Website/Funnel Pitch)'
        : !hasMetaPixel
        ? 'Website Found, Missing Meta Pixel (Wasted Ad Spend)'
        : 'Active Meta Funnel (UGC Video Creatives & ROAS Scaling)',
      metaPitchScript: !lead.website
        ? `Hi ${lead.name}, noticed your brand advertising on Meta/Instagram! Since you don't have a dedicated landing page or store, you're losing over 50% of interested buyers. We can build a fast, high-converting mobile store with Meta Pixel in 48 hours to double your sales!`
        : !hasMetaPixel
        ? `Hi ${lead.name}, I checked your website and noticed your Meta Tracking Pixel isn't active. This means Facebook cannot track purchases or retarget buyers, wasting your daily ad budget. We can fix your Pixel + Conversions API so your ROAS increases immediately.`
        : `Hi ${lead.name}, saw your ads on Instagram! Static photo ads get very low click rates today. We create scroll-stopping UGC (User-Generated Content) video ads and high-converting hooks that 2x your ROAS. Would you like to see 2 quick video concepts for ${lead.name}?`,
      recommendedService: !lead.website
        ? 'Landing Page / E-Commerce Store Development ($500 - $1,200)'
        : !hasMetaPixel
        ? 'Meta Pixel & Conversion API Setup + Funnel Optimization ($350 - $600)'
        : 'High-Converting UGC Video Ads & Ad Creatives ($400 - $800/mo)',
    };

    const remoteStaffPitch = `Hi ${lead.name}, noticed your growing team in ${lead.city}! Instead of spending $5,000+/mo on local tech hires, we provide dedicated, pre-vetted remote software developers, video editors, and digital marketers starting at $1,200/mo. Can I send you 2 senior candidate profiles?`;

    let result: any = {
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
        result = { ...result, ...parsed, metaAudit };
      }
    } catch {
      // fallback to rich heuristics
    }

    return result;
  }

  /**
   * Generates a fully-formatted Excel workbook (.xlsx) with Meta & Ads intel
   */
  async generateExcelWorkbook(filters: LeadFilters, userRole?: string, userId?: string): Promise<ExcelJS.Buffer> {
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
      { header: 'Meta Integrated', key: 'metaIntegrated', width: 18 },
      { header: 'Active Meta Ads', key: 'runningAds', width: 18 },
      { header: 'Meta Ad Library', key: 'adLibraryUrl', width: 35 },
      { header: 'Address', key: 'address', width: 30 },
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
      const phones = Array.isArray(lead.phones) ? (lead.phones as string[]).join(', ') : lead.phoneNorm || '';
      const emails = Array.isArray(lead.emails) ? (lead.emails as string[]).join(', ') : '';
      const tags = Array.isArray(lead.tags) ? (lead.tags as string[]).join(', ') : '';
      const ads = (lead.adsInfo as any) || {};
      const isMetaIntegrated = tags.includes('Meta Integrated') || ads.pixelDetected ? 'YES' : 'NO';
      const isRunningAds = tags.includes('Meta Ads Active') || ads.running ? 'YES' : 'NO';
      const adLibraryUrl =
        ads.adLibraryUrl ||
        `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&q=${encodeURIComponent(
          lead.name
        )}`;

      sheet.addRow({
        name: lead.name,
        phone: phones,
        email: emails,
        website: lead.website || '',
        metaIntegrated: isMetaIntegrated,
        runningAds: isRunningAds,
        adLibraryUrl,
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
