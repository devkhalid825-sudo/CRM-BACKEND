export interface CreateFollowupRuleInput {
    name: string;
    triggerOn: string;
    conditionJson: Record<string, any>;
    templateId?: string;
    delayHours: number;
}
export declare class FollowupService {
    /**
     * Seed standard sales follow-up rules if none exist
     */
    ensureDefaultRules(): Promise<void>;
    /**
     * List follow-up rules
     */
    listRules(): Promise<{
        name: string;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        triggerOn: string;
        conditionJson: import("@prisma/client/runtime/library").JsonValue;
        templateId: string | null;
        delayHours: number;
    }[]>;
    /**
     * Create a new follow-up rule
     */
    createRule(input: CreateFollowupRuleInput): Promise<{
        name: string;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        triggerOn: string;
        conditionJson: import("@prisma/client/runtime/library").JsonValue;
        templateId: string | null;
        delayHours: number;
    }>;
    /**
     * Toggle a rule's active state
     */
    toggleRule(ruleId: string): Promise<{
        name: string;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
        id: string;
        triggerOn: string;
        conditionJson: import("@prisma/client/runtime/library").JsonValue;
        templateId: string | null;
        delayHours: number;
    }>;
    /**
     * List follow-up tasks
     */
    listTasks(status?: string): Promise<{
        status: string;
        createdAt: Date;
        id: string;
        error: string | null;
        leadId: string;
        ruleId: string;
        scheduledFor: Date;
        sentAt: Date | null;
    }[]>;
    /**
     * Execute follow-up check scan across all leads
     */
    runFollowupCheck(): Promise<{
        scheduledCount: number;
        evaluatedCount: number;
    }>;
}
export declare const followupService: FollowupService;
//# sourceMappingURL=service.d.ts.map