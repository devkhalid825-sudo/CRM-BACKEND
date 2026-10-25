import mongoose from 'mongoose';
import { AppConfig, IAppConfig } from '../db/models/AppConfig.js';
import { prisma } from '../db/prisma.js';
import { decrypt, encrypt, maskKey } from '../services/crypto.js';
import { logger } from '../services/logger.js';

class RuntimeConfigService {
  private cache: Map<string, { value: string; group: string; version: number; updatedAt: Date }> = new Map();
  private isLoaded = false;
  private reloadListeners: Array<() => void> = [];

  private isMongo(): boolean {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Load and cache all runtime configs from SQL (Prisma) or MongoDB
   */
  async init(): Promise<void> {
    try {
      this.cache.clear();

      if (!this.isMongo()) {
        const records = await prisma.appConfig.findMany();
        for (const item of records) {
          try {
            const decryptedVal = decrypt(item.valueEnc);
            this.cache.set(item.key, {
              value: decryptedVal,
              group: item.group || 'general',
              version: item.version || 1,
              updatedAt: item.updatedAt || new Date(),
            });
          } catch (err: unknown) {
            logger.error('runtimeConfig', `Failed to decrypt config key: ${item.key}`, {
              error: (err as Error).message,
            });
          }
        }
      } else {
        const records = await AppConfig.find().lean();
        for (const item of records) {
          try {
            const decryptedVal = decrypt(item.valueEnc);
            this.cache.set(item.key, {
              value: decryptedVal,
              group: item.group || 'general',
              version: item.version || 1,
              updatedAt: item.updatedAt || new Date(),
            });
          } catch (err: unknown) {
            logger.error('runtimeConfig', `Failed to decrypt config key: ${item.key}`, {
              error: (err as Error).message,
            });
          }
        }
      }

      this.isLoaded = true;
      logger.info('runtimeConfig', `Loaded ${this.cache.size} runtime configuration keys into cache`);
    } catch (err: unknown) {
      logger.error('runtimeConfig', 'Error initializing runtime configuration', {
        error: (err as Error).message,
      });
    }
  }

  /**
   * Reload runtime config cache
   */
  async reload(): Promise<number> {
    await this.init();
    for (const listener of this.reloadListeners) {
      try {
        listener();
      } catch {
        // ignore
      }
    }
    return this.cache.size;
  }

  onReload(fn: () => void) {
    this.reloadListeners.push(fn);
  }

  /**
   * Get a config value by key
   */
  get(key: string, defaultValue = ''): string {
    const item = this.cache.get(key);
    return item ? item.value : defaultValue;
  }

  getInt(key: string, defaultValue = 0): number {
    const val = this.get(key);
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  getBool(key: string, defaultValue = false): boolean {
    const val = this.get(key);
    if (!val) return defaultValue;
    return val === 'true' || val === '1';
  }

  /**
   * Set or update a config value
   */
  async set(key: string, value: string, group = 'general', userId?: string): Promise<void> {
    const encryptedVal = encrypt(value);

    if (!this.isMongo()) {
      const existing = await prisma.appConfig.findUnique({ where: { key } });
      const version = existing ? existing.version + 1 : 1;

      await prisma.appConfig.upsert({
        where: { key },
        update: {
          valueEnc: encryptedVal,
          group,
          version,
          updatedBy: userId || null,
        },
        create: {
          key,
          valueEnc: encryptedVal,
          group,
          version: 1,
          updatedBy: userId || null,
        },
      });

      this.cache.set(key, {
        value,
        group,
        version,
        updatedAt: new Date(),
      });
    } else {
      const existing = await AppConfig.findOne({ key });
      if (existing) {
        existing.valueEnc = encryptedVal;
        existing.group = group;
        existing.version = (existing.version || 1) + 1;
        if (userId) existing.updatedBy = userId as unknown as IAppConfig['updatedBy'];
        await existing.save();
      } else {
        await AppConfig.create({
          key,
          valueEnc: encryptedVal,
          group,
          version: 1,
          updatedBy: userId,
        });
      }

      this.cache.set(key, {
        value,
        group,
        version: existing ? existing.version : 1,
        updatedAt: new Date(),
      });
    }

    logger.info('runtimeConfig', `Config key updated: ${key}`, { group });
  }

  /**
   * Return all configs with sensitive values masked
   */
  async getAllMasked(): Promise<
    Array<{ id: string; key: string; maskedValue: string; group: string; version: number; updatedAt: string }>
  > {
    if (!this.isMongo()) {
      const records = await prisma.appConfig.findMany({
        orderBy: [{ group: 'asc' }, { key: 'asc' }],
      });

      return records.map((r) => {
        let decrypted = '';
        try {
          decrypted = decrypt(r.valueEnc);
        } catch {
          decrypted = '***error***';
        }

        return {
          id: r.id,
          key: r.key,
          maskedValue: maskKey(decrypted),
          group: r.group,
          version: r.version,
          updatedAt: r.updatedAt.toISOString(),
        };
      });
    }

    const records = await AppConfig.find().sort({ group: 1, key: 1 }).lean();
    return records.map((r) => {
      let decrypted = '';
      try {
        decrypted = decrypt(r.valueEnc);
      } catch {
        decrypted = '***error***';
      }

      return {
        id: r._id.toString(),
        key: r.key,
        maskedValue: maskKey(decrypted),
        group: r.group,
        version: r.version,
        updatedAt: r.updatedAt.toISOString(),
      };
    });
  }
}

export const runtimeConfig = new RuntimeConfigService();
