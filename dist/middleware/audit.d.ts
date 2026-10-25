import { Request } from 'express';
/**
 * Mask sensitive values in audit payloads before storing in DB
 */
export declare function maskSensitiveFields(obj: unknown): Record<string, unknown> | null;
/**
 * Record an audit log for an Admin Console action
 */
export declare function recordAuditLog(req: Request, action: string, target: string, before?: unknown, after?: unknown): Promise<void>;
/**
 * Record an activity log for state-changing operations
 */
export declare function recordActivityLog(actorId: string | undefined, action: string, entity: string, entityId?: string, meta?: Record<string, unknown>): Promise<void>;
//# sourceMappingURL=audit.d.ts.map