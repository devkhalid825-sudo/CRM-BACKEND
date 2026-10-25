import mongoose from 'mongoose';
import { runtimeConfig } from '../../config/runtimeConfig.js';
import { SystemLog } from '../../db/models/SystemLog.js';
import { AuditLog } from '../../db/models/AuditLog.js';
import { ProviderKey } from '../../db/models/ProviderKey.js';
import { prisma } from '../../db/prisma.js';
import { maskKey } from '../../services/crypto.js';
import {
  AppConfigDTO,
  ImportEnvItem,
  ImportEnvPreview,
  SystemLogDTO,
  AuditLogDTO,
} from '../../shared/index.js';

const BOOTSTRAP_KEYS = new Set([
  'NODE_ENV',
  'PORT',
  'DATABASE_URL',
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'ENCRYPTION_MASTER_KEY',
  'CLIENT_ORIGIN',
  'PUBLIC_BASE_URL',
  'GOOGLE_OAUTH_CLIENT_ID',
  'GOOGLE_OAUTH_CLIENT_SECRET',
]);

export class ConsoleService {
  private isMongo(): boolean {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Get all runtime configs masked
   */
  async getConfig(): Promise<AppConfigDTO[]> {
    return runtimeConfig.getAllMasked();
  }

  /**
   * Update or create a single runtime config
   */
  async setConfig(key: string, value: string, group = 'general', userId?: string): Promise<void> {
    await runtimeConfig.set(key, value, group, userId);
  }

  /**
   * Parse .env file and classify keys into runtime vs bootstrap
   */
  parseEnv(content: string): ImportEnvPreview {
    const lines = content.split(/\r?\n/);
    const items: ImportEnvItem[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eqIdx = trimmed.indexOf('=');
      if (eqIdx <= 0) continue;

      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      const isBootstrap = BOOTSTRAP_KEYS.has(key);
      const group = key.startsWith('GEMINI') || key.startsWith('AI')
        ? 'ai'
        : key.startsWith('GOOGLE') || key.startsWith('MAPS') || key.startsWith('SERP') || key.startsWith('APIFY')
        ? 'places'
        : key.startsWith('SMTP') || key.startsWith('EMAIL') || key.startsWith('BREVO') || key.startsWith('RESEND')
        ? 'email'
        : key.startsWith('TWILIO') || key.startsWith('WHATSAPP')
        ? 'comms'
        : 'general';

      items.push({
        key,
        value,
        type: isBootstrap ? 'bootstrap' : 'runtime',
        group,
      });
    }

    const runtimeCount = items.filter((i) => i.type === 'runtime').length;
    const bootstrapCount = items.filter((i) => i.type === 'bootstrap').length;

    return { items, runtimeCount, bootstrapCount };
  }

  /**
   * Apply runtime keys from parsed env into app_config
   */
  async applyEnvImport(items: ImportEnvItem[], userId?: string): Promise<number> {
    let applied = 0;
    for (const item of items) {
      if (item.type === 'runtime' && item.value) {
        await runtimeConfig.set(item.key, item.value, item.group || 'env_import', userId);
        applied += 1;
      }
    }
    await runtimeConfig.reload();
    return applied;
  }

  /**
   * Query system logs
   */
  async getLogs(query: {
    level?: string;
    module?: string;
    limit?: number;
    search?: string;
  }): Promise<SystemLogDTO[]> {
    const limit = Math.min(query.limit || 100, 500);

    if (!this.isMongo()) {
      const where: any = {};
      if (query.level && query.level !== 'all') {
        where.level = query.level;
      }
      if (query.module && query.module !== 'all') {
        where.module = query.module;
      }
      if (query.search) {
        where.msg = { contains: query.search, mode: 'insensitive' };
      }

      const logs = await prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return logs.map((l) => ({
        id: l.id,
        level: l.level as any,
        module: l.module,
        msg: l.msg,
        meta: l.meta as any,
        createdAt: l.createdAt.toISOString(),
      }));
    }

    const filter: Record<string, unknown> = {};
    if (query.level && query.level !== 'all') {
      filter.level = query.level;
    }
    if (query.module && query.module !== 'all') {
      filter.module = query.module;
    }
    if (query.search) {
      filter.msg = { $regex: query.search, $options: 'i' };
    }

    const logs = await SystemLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();

    return logs.map((l) => ({
      id: l._id.toString(),
      level: l.level,
      module: l.module,
      msg: l.msg,
      meta: l.meta,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  /**
   * Query audit logs
   */
  async getAuditLogs(query: {
    action?: string;
    limit?: number;
  }): Promise<AuditLogDTO[]> {
    const limit = Math.min(query.limit || 100, 500);

    if (!this.isMongo()) {
      const where: any = {};
      if (query.action && query.action !== 'all') {
        where.action = query.action;
      }

      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return logs.map((l) => ({
        id: l.id,
        actorId: l.actorId || undefined,
        actorEmail: l.actorEmail || undefined,
        action: l.action,
        target: l.target,
        beforeMasked: l.beforeMasked as any,
        afterMasked: l.afterMasked as any,
        ip: l.ip || undefined,
        createdAt: l.createdAt.toISOString(),
      }));
    }

    const filter: Record<string, unknown> = {};
    if (query.action && query.action !== 'all') {
      filter.action = query.action;
    }

    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();

    return logs.map((l) => ({
      id: l._id.toString(),
      actorId: l.actorId?.toString(),
      actorEmail: l.actorEmail,
      action: l.action,
      target: l.target,
      beforeMasked: l.beforeMasked,
      afterMasked: l.afterMasked,
      ip: l.ip,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  /**
   * System health check
   */
  async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    mongo: { connected: boolean; pingMs: number };
    sql: { connected: boolean; pingMs: number };
    uptimeSeconds: number;
    memoryUsageMB: number;
    keysSummary: { total: number; healthy: number; invalid: number };
    version: string;
  }> {
    const start = Date.now();
    let mongoConnected = false;
    let mongoPingMs = 0;
    let sqlConnected = false;
    let sqlPingMs = 0;

    // Check MongoDB if configured
    try {
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
        mongoConnected = true;
        mongoPingMs = Date.now() - start;
      }
    } catch {
      mongoConnected = false;
    }

    // Check SQL (Prisma)
    const sqlStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      sqlConnected = true;
      sqlPingMs = Date.now() - sqlStart;
    } catch {
      sqlConnected = false;
    }

    let allKeys: any[] = [];
    if (!this.isMongo()) {
      allKeys = await prisma.providerKey.findMany();
    } else {
      allKeys = await ProviderKey.find().lean();
    }

    const healthyCount = allKeys.filter((k) => k.status === 'healthy' && k.enabled).length;
    const invalidCount = allKeys.filter((k) => k.status === 'invalid').length;

    const memory = process.memoryUsage();
    const memoryMB = Math.round(memory.rss / (1024 * 1024));

    const overallHealthy = sqlConnected || mongoConnected;

    return {
      status: overallHealthy ? 'healthy' : 'unhealthy',
      mongo: { connected: mongoConnected, pingMs: mongoPingMs },
      sql: { connected: sqlConnected, pingMs: sqlPingMs },
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMB: memoryMB,
      keysSummary: {
        total: allKeys.length,
        healthy: healthyCount,
        invalid: invalidCount,
      },
      version: '1.0.0',
    };
  }
}

export const consoleService = new ConsoleService();
