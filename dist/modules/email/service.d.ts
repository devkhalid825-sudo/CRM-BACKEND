export interface SendEmailInput {
    leadId?: string;
    userId: string;
    to: string;
    subject: string;
    bodyText?: string;
    bodyHtml?: string;
    templateId?: string;
}
export interface CreateTemplateInput {
    name: string;
    subject: string;
    bodyHtml: string;
    bodyText?: string;
    category?: string;
}
export interface AddEmailAccountInput {
    userId: string;
    provider: string;
    email: string;
    senderName: string;
    credentials: Record<string, any>;
    isDefault?: boolean;
}
export declare class EmailService {
    /**
     * Seed default sales email templates if none exist
     */
    ensureDefaultTemplates(): Promise<void>;
    /**
     * Send an email and attach it to the Lead timeline
     */
    sendEmail(input: SendEmailInput): Promise<{
        delivered: boolean;
        deliveryNotice: string | undefined;
        status: string;
        createdAt: Date;
        id: string;
        error: string | null;
        userId: string;
        leadId: string | null;
        direction: string;
        subject: string;
        bodyHtml: string | null;
        bodyText: string | null;
        from: string;
        to: string;
        messageId: string | null;
    }>;
    /**
     * List email messages
     */
    listEmails(query: {
        leadId?: string;
        userId?: string;
        limit?: number;
    }): Promise<{
        status: string;
        createdAt: Date;
        id: string;
        error: string | null;
        userId: string;
        leadId: string | null;
        direction: string;
        subject: string;
        bodyHtml: string | null;
        bodyText: string | null;
        from: string;
        to: string;
        messageId: string | null;
    }[]>;
    /**
     * List email templates
     */
    getTemplates(): Promise<{
        name: string;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        category: string | null;
        subject: string;
        bodyHtml: string;
        bodyText: string | null;
        variables: import("@prisma/client/runtime/library").JsonValue | null;
    }[]>;
    /**
     * Create an email template
     */
    createTemplate(input: CreateTemplateInput): Promise<{
        name: string;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        category: string | null;
        subject: string;
        bodyHtml: string;
        bodyText: string | null;
        variables: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    /**
     * Add email account credentials (encrypted)
     */
    addEmailAccount(input: AddEmailAccountInput): Promise<{
        email: string;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        userId: string;
        provider: string;
        senderName: string;
        credentialsEnc: string;
        isDefault: boolean;
    }>;
    /**
     * List accounts configured for user
     */
    getEmailAccounts(userId: string): Promise<{
        id: string;
        email: string;
        provider: string;
        senderName: string;
        isDefault: boolean;
        createdAt: Date;
    }[]>;
}
export declare const emailService: EmailService;
//# sourceMappingURL=service.d.ts.map