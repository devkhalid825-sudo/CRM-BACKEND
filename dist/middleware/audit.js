import { AuditLog } from '../db/models/AuditLog.js';
import { ActivityLog } from '../db/models/ActivityLog.js';
import { maskKey } from '../services/crypto.js';
import { logger } from '../services/logger.js';
/**
 * Mask sensitive values in audit payloads before storing in DB
 */
export function maskSensitiveFields(obj) {
    if (!obj || typeof obj !== 'object')
        return null;
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
        if (/key|secret|password|token|auth/i.test(key) && typeof val === 'string') {
            result[key] = maskKey(val);
        }
        else if (typeof val === 'object' && val !== null) {
            result[key] = maskSensitiveFields(val);
        }
        else {
            result[key] = val;
        }
    }
    return result;
}
/**
 * Record an audit log for an Admin Console action
 */
export async function recordAuditLog(req, action, target, before, after) {
    try {
        const actorId = req.user?.id;
        const actorEmail = req.user?.email;
        const ip = req.ip || req.socket.remoteAddress;
        await AuditLog.create({
            actorId,
            actorEmail,
            action,
            target,
            beforeMasked: before ? maskSensitiveFields(before) : null,
            afterMasked: after ? maskSensitiveFields(after) : null,
            ip,
        });
    }
    catch (err) {
        logger.error('audit', 'Failed to record audit log', { error: err.message });
    }
}
/**
 * Record an activity log for state-changing operations
 */
export async function recordActivityLog(actorId, action, entity, entityId, meta) {
    try {
        await ActivityLog.create({
            actorId,
            action,
            entity,
            entityId,
            meta: meta ? maskSensitiveFields(meta) : {},
        });
    }
    catch (err) {
        logger.error('activity', 'Failed to record activity log', { error: err.message });
    }
}
//# sourceMappingURL=audit.js.map