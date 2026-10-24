import mongoose from 'mongoose';
import { runtimeConfig } from '../../config/runtimeConfig.js';
import { SystemLog } from '../../db/models/SystemLog.js';
import { AuditLog } from '../../db/models/AuditLog.js';
import { ProviderKey } from '../../db/models/ProviderKey.js';
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

      // Remove surrounding quotes if present
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

    const limit = Math.min(query.limit || 100, 500);
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
    const filter: Record<string, unknown> = {};
    if (query.action && query.action !== 'all') {
      filter.action = query.action;
    }

    const limit = Math.min(query.limit || 100, 500);
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
    uptimeSeconds: number;
    memoryUsageMB: number;
    keysSummary: { total: number; healthy: number; invalid: number };
    version: string;
  }> {
    const start = Date.now();
    let mongoConnected = false;
    let pingMs = 0;

    try {
      if (mongoose.connection.db) {
        await mongoose.connection.db.admin().ping();
        mongoConnected = true;
        pingMs = Date.now() - start;
      }
    } catch {
      mongoConnected = false;
    }

    const allKeys = await ProviderKey.find().lean();
    const healthyCount = allKeys.filter((k) => k.status === 'healthy' && k.enabled).length;
    const invalidCount = allKeys.filter((k) => k.status === 'invalid').length;

    const memory = process.memoryUsage();
    const memoryMB = Math.round(memory.rss / (1024 * 1024));

    return {
      status: mongoConnected ? 'healthy' : 'unhealthy',
      mongo: { connected: mongoConnected, pingMs },
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
