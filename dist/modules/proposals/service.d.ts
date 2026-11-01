export interface ProposalItem {
    item: string;
    qty: number;
    rate: number;
}
export interface CreateProposalInput {
    leadId: string;
    userId: string;
    title: string;
    currency?: string;
    items: ProposalItem[];
    notes?: string;
    validUntil?: Date;
}
export declare class ProposalsService {
    /**
     * Create a new commercial proposal with unique public token
     */
    createProposal(input: CreateProposalInput): Promise<{
        status: string;
        token: string;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        userId: string;
        leadId: string;
        notes: string | null;
        title: string;
        currency: string;
        items: import("@prisma/client/runtime/library").JsonValue;
        totalAmount: number;
        validUntil: Date | null;
        viewedAt: Date | null;
        acceptedAt: Date | null;
    }>;
    /**
     * List proposals for CRM dashboard
     */
    listProposals(query: {
        leadId?: string;
        userId?: string;
    }): Promise<{
        status: string;
        token: string;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        userId: string;
        leadId: string;
        notes: string | null;
        title: string;
        currency: string;
        items: import("@prisma/client/runtime/library").JsonValue;
        totalAmount: number;
        validUntil: Date | null;
        viewedAt: Date | null;
        acceptedAt: Date | null;
    }[]>;
    /**
     * Get single proposal by ID
     */
    getProposalById(id: string): Promise<{
        status: string;
        token: string;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        userId: string;
        leadId: string;
        notes: string | null;
        title: string;
        currency: string;
        items: import("@prisma/client/runtime/library").JsonValue;
        totalAmount: number;
        validUntil: Date | null;
        viewedAt: Date | null;
        acceptedAt: Date | null;
    } | null>;
    /**
     * Public Client Portal: Get proposal by public token (tracks viewedAt)
     */
    getProposalByToken(token: string): Promise<{
        lead: {
            name: string;
            country: string;
            city: string;
            website: string | null;
        } | null;
        status: string;
        token: string;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        userId: string;
        leadId: string;
        notes: string | null;
        title: string;
        currency: string;
        items: import("@prisma/client/runtime/library").JsonValue;
        totalAmount: number;
        validUntil: Date | null;
        viewedAt: Date | null;
        acceptedAt: Date | null;
    } | null>;
    /**
     * Public Client Portal: Accept or reject proposal
     */
    updatePublicProposalAction(token: string, action: 'accept' | 'reject', clientNotes?: string): Promise<{
        status: string;
        token: string;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        userId: string;
        leadId: string;
        notes: string | null;
        title: string;
        currency: string;
        items: import("@prisma/client/runtime/library").JsonValue;
        totalAmount: number;
        validUntil: Date | null;
        viewedAt: Date | null;
        acceptedAt: Date | null;
    }>;
    /**
     * Generate Proposal Scope & Items with Gemini AI
     */
    generateAIProposalDraft(leadId: string): Promise<{
        title: string;
        items: ProposalItem[];
        notes: string;
    }>;
}
export declare const proposalsService: ProposalsService;
//# sourceMappingURL=service.d.ts.map