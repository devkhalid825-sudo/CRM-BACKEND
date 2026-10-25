import { AppConfig } from '../db/models/AppConfig.js';
import { decrypt, encrypt, maskKey } from '../services/crypto.js';
import { logger } from '../services/logger.js';
class RuntimeConfigService {
    cache = new Map();
    isLoaded = false;
    reloadListeners = [];
    /**
     * Load and cache all runtime configs from MongoDB
     */
    async init() {
        try {
            const records = await AppConfig.find().lean();
            this.cache.clear();
            for (const item of records) {
                try {
                    const decryptedVal = decrypt(item.valueEnc);
                    this.cache.set(item.key, {
                        value: decryptedVal,
                        group: item.group || 'general',
                        version: item.version || 1,
                        updatedAt: item.updatedAt || new Date(),
                    });
                }
                catch (err) {
                    logger.error('runtimeConfig', `Failed to decrypt config key: ${item.key}`, {
                        error: err.message,
                    });
                }
            }
            this.isLoaded = true;
            logger.info('runtimeConfig', `Loaded ${this.cache.size} runtime configuration keys into cache`);
        }
        catch (err) {
            logger.error('runtimeConfig', 'Error initializing runtime configuration', {
                error: err.message,
            });
        }
    }
    /**
     * Reload runtime config cache from MongoDB
     */
    async reload() {
        await this.init();
        for (const listener of this.reloadListeners) {
            try {
                listener();
            }
            catch {
                // ignore
            }
        }
        return this.cache.size;
    }
    onReload(fn) {
        this.reloadListeners.push(fn);
    }
    /**
     * Get a config value by key
     */
    get(key, defaultValue = '') {
        const item = this.cache.get(key);
        return item ? item.value : defaultValue;
    }
    getInt(key, defaultValue = 0) {
        const val = this.get(key);
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? defaultValue : parsed;
    }
    getBool(key, defaultValue = false) {
        const val = this.get(key);
        if (!val)
            return defaultValue;
        return val === 'true' || val === '1';
    }
    /**
     * Set or update a config value
     */
    async set(key, value, group = 'general', userId) {
        const encryptedVal = encrypt(value);
        const existing = await AppConfig.findOne({ key });
        if (existing) {
            existing.valueEnc = encryptedVal;
            existing.group = group;
            existing.version = (existing.version || 1) + 1;
            if (userId)
                existing.updatedBy = userId;
            await existing.save();
        }
        else {
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
        logger.info('runtimeConfig', `Config key updated: ${key}`, { group });
    }
    /**
     * Return all configs with sensitive values masked
     */
    async getAllMasked() {
        const records = await AppConfig.find().sort({ group: 1, key: 1 }).lean();
        return records.map((r) => {
            let decrypted = '';
            try {
                decrypted = decrypt(r.valueEnc);
            }
            catch {
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
//# sourceMappingURL=runtimeConfig.js.map