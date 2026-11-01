import ExcelJS from 'exceljs';
export interface LeadFilters {
    country?: string;
    city?: string;
    categoryId?: string;
    status?: string;
    ownerId?: string;
    tag?: string;
    search?: string;
    page?: number;
    limit?: number;
}
export declare class LeadsService {
    getLeads(filters: LeadFilters, userRole?: string, userId?: string): Promise<{
        items: {
            status: string;
            name: string;
            archivedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            id: string;
            country: string;
            city: string;
            lat: number | null;
            lng: number | null;
            categoryId: string | null;
            placeKey: string;
            phones: import("@prisma/client/runtime/library").JsonValue;
            phoneNorm: string | null;
            emails: import("@prisma/client/runtime/library").JsonValue;
            website: string | null;
            websiteNorm: string | null;
            address: string | null;
            categoryName: string | null;
            rating: number | null;
            source: string;
            tags: import("@prisma/client/runtime/library").JsonValue;
            score: import("@prisma/client/runtime/library").JsonValue | null;
            lostReason: string | null;
            ownerId: string | null;
            adsInfo: import("@prisma/client/runtime/library").JsonValue | null;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getLeadById(id: string): Promise<{
        status: string;
        name: string;
        archivedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        country: string;
        city: string;
        lat: number | null;
        lng: number | null;
        categoryId: string | null;
        placeKey: string;
        phones: import("@prisma/client/runtime/library").JsonValue;
        phoneNorm: string | null;
        emails: import("@prisma/client/runtime/library").JsonValue;
        website: string | null;
        websiteNorm: string | null;
        address: string | null;
        categoryName: string | null;
        rating: number | null;
        source: string;
        tags: import("@prisma/client/runtime/library").JsonValue;
        score: import("@prisma/client/runtime/library").JsonValue | null;
        lostReason: string | null;
        ownerId: string | null;
        adsInfo: import("@prisma/client/runtime/library").JsonValue | null;
    } | null>;
    updateLead(id: string, data: any): Promise<{
        status: string;
        name: string;
        archivedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        country: string;
        city: string;
        lat: number | null;
        lng: number | null;
        categoryId: string | null;
        placeKey: string;
        phones: import("@prisma/client/runtime/library").JsonValue;
        phoneNorm: string | null;
        emails: import("@prisma/client/runtime/library").JsonValue;
        website: string | null;
        websiteNorm: string | null;
        address: string | null;
        categoryName: string | null;
        rating: number | null;
        source: string;
        tags: import("@prisma/client/runtime/library").JsonValue;
        score: import("@prisma/client/runtime/library").JsonValue | null;
        lostReason: string | null;
        ownerId: string | null;
        adsInfo: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    /**
     * Scrapes website of a single lead to discover contact emails
     */
    scrapeLeadEmail(id: string): Promise<{
        lead: {
            status: string;
            name: string;
            archivedAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
            id: string;
            country: string;
            city: string;
            lat: number | null;
            lng: number | null;
            categoryId: string | null;
            placeKey: string;
            phones: import("@prisma/client/runtime/library").JsonValue;
            phoneNorm: string | null;
            emails: import("@prisma/client/runtime/library").JsonValue;
            website: string | null;
            websiteNorm: string | null;
            address: string | null;
            categoryName: string | null;
            rating: number | null;
            source: string;
            tags: import("@prisma/client/runtime/library").JsonValue;
            score: import("@prisma/client/runtime/library").JsonValue | null;
            lostReason: string | null;
            ownerId: string | null;
            adsInfo: import("@prisma/client/runtime/library").JsonValue | null;
        };
        found: number;
        emails: string[];
    }>;
    /**
     * Batch enriches all leads that have a website but no email
     */
    enrichAllLeadEmails(limit?: number): Promise<{
        scanned: number;
        enriched: number;
    }>;
    /**
     * Analyzes a company's profile to discover:
     * 1. What services they need most (Website, SEO, Ads, Chatbots, etc.)
     * 2. Their core pain points
     * 3. Perfect cold pitch script (WhatsApp / Phone)
     * 4. Suggested budget range
     */
    analyzeLeadNeeds(leadId: string): Promise<{
        neededServices: string[];
        businessOpportunity: string;
        painPoints: string[];
        whatsappPitchScript: string;
        callPitchHook: string;
        estimatedDealValue: string;
    }>;
    /**
     * Generates a fully-formatted Excel workbook (.xlsx)
     */
    generateExcelWorkbook(filters: LeadFilters, userRole?: string, userId?: string): Promise<ExcelJS.Buffer>;
}
export declare const leadsService: LeadsService;
//# sourceMappingURL=service.d.ts.map