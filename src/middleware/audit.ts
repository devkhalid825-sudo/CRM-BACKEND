import { Request } from 'express';
import mongoose from 'mongoose';
import { AuditLog } from '../db/models/AuditLog.js';
import { ActivityLog } from '../db/models/ActivityLog.js';
import { prisma } from '../db/prisma.js';
import { maskKey } from '../services/crypto.js';
import { logger } from '../services/logger.js';

function isMongo(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * Mask sensitive values in audit payloads before storing in DB
 */
export function maskSensitiveFields(obj: unknown): Record<string, unknown> | null {
  if (!obj || typeof obj !== 'object') return null;
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    if (/key|secret|password|token|auth/i.test(key) && typeof val === 'string') {
      result[key] = maskKey(val);
    } else if (typeof val === 'object' && val !== null) {
      result[key] = maskSensitiveFields(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Record an audit log for an Admin Console action
 */
export async function recordAuditLog(
  req: Request,
  action: string,
  target: string,
  before?: unknown,
  after?: unknown
): Promise<void> {
  try {
    const actorId = req.user?.id;
    const actorEmail = req.user?.email;
    const ip = req.ip || req.socket.remoteAddress;
    const beforeMasked = before ? maskSensitiveFields(before) : null;
    const afterMasked = after ? maskSensitiveFields(after) : null;

    if (!isMongo()) {
      await prisma.auditLog.create({
        data: {
          actorId,
          actorEmail,
          action,
          target,
          beforeMasked: (beforeMasked as any) || undefined,
          afterMasked: (afterMasked as any) || undefined,
          ip: ip || null,
        },
      });
      return;
    }

    await AuditLog.create({
      actorId,
      actorEmail,
      action,
      target,
      beforeMasked,
      afterMasked,
      ip,
    });
  } catch (err: unknown) {
    logger.error('audit', 'Failed to record audit log', { error: (err as Error).message });
  }
}

/**
 * Record an activity log for state-changing operations
 */
export async function recordActivityLog(
  actorId: string | undefined,
  action: string,
  entity: string,
  entityId?: string,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    const metaMasked = meta ? maskSensitiveFields(meta) : {};

    if (!isMongo()) {
      await prisma.activityLog.create({
        data: {
          actorId: actorId || null,
          action,
          entity,
          entityId: entityId || null,
          meta: (metaMasked as any) || undefined,
        },
      });
      return;
    }

    await ActivityLog.create({
      actorId,
      action,
      entity,
      entityId,
      meta: metaMasked,
    });
  } catch (err: unknown) {
    logger.error('activity', 'Failed to record activity log', { error: (err as Error).message });
  }
}
