import { ProviderKey } from '../db/models/ProviderKey.js';
import { decrypt } from './crypto.js';
import { logger } from './logger.js';
import { AuthError, QuotaExceededError, RateLimitedError, TransientError } from './errors.js';
export class KeyPoolService {
    /**
     * Resets usage counters for a key if the date has passed UTC midnight
     */
    checkAndResetDailyUsage(key) {
        const now = new Date();
        const lastReset = key.usageResetAt ? new Date(key.usageResetAt) : new Date(0);
        const isDifferentDay = now.getUTCFullYear() !== lastReset.getUTCFullYear() ||
            now.getUTCMonth() !== lastReset.getUTCMonth() ||
            now.getUTCDate() !== lastReset.getUTCDate();
        if (isDifferentDay) {
            key.usageToday = 0;
            key.usageResetAt = now;
            if (key.status === 'quota_over') {
                key.status = 'healthy';
                key.cooldownUntil = null;
            }
            return true;
        }
        return false;
    }
    /**
     * Get all eligible healthy keys for a provider, sorted by priority then least-used
     */
    async getAvailableKeys(providerId, pinnedKeyId) {
        const now = new Date();
        const query = {
            providerId,
            enabled: true,
            status: { $nin: ['invalid', 'disabled'] },
        };
        if (pinnedKeyId && pinnedKeyId !== 'auto') {
            query._id = pinnedKeyId;
        }
        const keys = await ProviderKey.find(query).sort({ priority: 1, usageToday: 1 });
        const eligible = [];
        for (const key of keys) {
            const reset = this.checkAndResetDailyUsage(key);
            if (reset) {
                await key.save();
            }
            // Check cooldown
            if (key.cooldownUntil && key.cooldownUntil > now) {
                continue;
            }
            // Check daily cap
            if (key.dailyCap > 0 && key.usageToday >= key.dailyCap) {
                if (key.status !== 'quota_over') {
                    key.status = 'quota_over';
                    await key.save();
                }
                continue;
            }
            try {
                const rawKey = decrypt(key.encryptedKey);
                eligible.push({
                    id: key._id.toString(),
                    providerId: key.providerId,
                    rawKey,
                    label: key.label,
                });
            }
            catch (err) {
                logger.error('keyPool', `Failed to decrypt key: ${key._id}`, { error: err.message });
            }
        }
        return eligible;
    }
    /**
     * Mark success: increment usage and set status to healthy
     */
    async recordSuccess(keyId) {
        try {
            const key = await ProviderKey.findById(keyId);
            if (!key)
                return;
            this.checkAndResetDailyUsage(key);
            key.usageToday += 1;
            key.lastUsedAt = new Date();
            key.status = 'healthy';
            key.cooldownUntil = null;
            key.lastError = null;
            await key.save();
        }
        catch (err) {
            logger.error('keyPool', `Failed to record key success: ${keyId}`, { error: err.message });
        }
    }
    /**
     * Mark error: adjust status, set cooldown or disable key on auth error
     */
    async recordFailure(keyId, error) {
        try {
            const key = await ProviderKey.findById(keyId);
            if (!key)
                return;
            const now = new Date();
            const errorMessage = error instanceof Error ? error.message : String(error);
            key.lastError = errorMessage;
            if (error instanceof RateLimitedError || error instanceof TransientError) {
                // Cooldown for 5 to 60 minutes
                key.status = 'cooling_down';
                key.cooldownUntil = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes default
                logger.warn('keyPool', `Key [${key.label}] cooling down until ${key.cooldownUntil.toISOString()}`);
            }
            else if (error instanceof QuotaExceededError) {
                key.status = 'quota_over';
                // Cooldown until midnight UTC
                const midnight = new Date();
                midnight.setUTCHours(24, 0, 0, 0);
                key.cooldownUntil = midnight;
                logger.warn('keyPool', `Key [${key.label}] quota exceeded. Cooldown until ${midnight.toISOString()}`);
            }
            else if (error instanceof AuthError) {
                key.status = 'invalid';
                key.enabled = false;
                logger.error('keyPool', `Key [${key.label}] has INVALID credentials and was disabled`);
            }
            await key.save();
        }
        catch (err) {
            logger.error('keyPool', `Failed to record key failure: ${keyId}`, { error: err.message });
        }
    }
}
export const keyPool = new KeyPoolService();
//# sourceMappingURL=keyPool.js.map