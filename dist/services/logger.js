import pino from 'pino';
import mongoose from 'mongoose';
import { SystemLog } from '../db/models/SystemLog.js';
import { prisma } from '../db/prisma.js';
import { maskKey } from './crypto.js';
const pinoLogger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                ignore: 'pid,hostname',
            },
        }
        : undefined,
});
let broadcastLog = null;
export function registerLogBroadcaster(fn) {
    broadcastLog = fn;
}
/**
 * Sanitize any object or error to ensure secrets are never logged
 */
function sanitizeMeta(meta) {
    if (!meta || typeof meta !== 'object') {
        return { data: meta };
    }
    const copy = {};
    for (const [k, v] of Object.entries(meta)) {
        if (/key|secret|password|token|auth/i.test(k) && typeof v === 'string') {
            copy[k] = maskKey(v);
        }
        else if (typeof v === 'object' && v !== null) {
            copy[k] = sanitizeMeta(v);
        }
        else {
            copy[k] = v;
        }
    }
    return copy;
}
export function log(level, moduleName, msg, meta) {
    const safeMeta = meta ? sanitizeMeta(meta) : {};
    // 1. Pino console/stream output
    pinoLogger[level]({ module: moduleName, ...safeMeta }, msg);
    const entry = {
        level,
        module: moduleName,
        msg,
        meta: safeMeta,
        createdAt: new Date().toISOString(),
    };
    // 2. Broadcast to live tail via socket if connected
    if (broadcastLog) {
        try {
            broadcastLog(entry);
        }
        catch {
            // ignore
        }
    }
    // 3. Persist to SQL (Prisma) or MongoDB without blocking
    if (mongoose.connection.readyState === 1) {
        SystemLog.create({
            level,
            module: moduleName,
            msg,
            meta: safeMeta,
            createdAt: new Date(entry.createdAt),
        }).catch(() => {
            // Avoid recursion if log persistence fails
        });
    }
    else {
        prisma.systemLog.create({
            data: {
                level,
                module: moduleName,
                msg,
                meta: safeMeta,
                createdAt: new Date(entry.createdAt),
            },
        }).catch(() => {
            // Background non-blocking
        });
    }
}
export const logger = {
    info: (moduleName, msg, meta) => log('info', moduleName, msg, meta),
    warn: (moduleName, msg, meta) => log('warn', moduleName, msg, meta),
    error: (moduleName, msg, meta) => log('error', moduleName, msg, meta),
    debug: (moduleName, msg, meta) => log('debug', moduleName, msg, meta),
};
//# sourceMappingURL=logger.js.map