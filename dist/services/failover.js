import mongoose from 'mongoose';
import { Provider } from '../db/models/Provider.js';
import { prisma } from '../db/prisma.js';
import { keyPool } from './keyPool.js';
import { AllProvidersExhaustedError, PermanentError, } from './errors.js';
import { logger } from './logger.js';
export class FailoverService {
    /**
     * Run an external operation with automatic key rotation and provider failover
     */
    async run(kind, operation, options = {}) {
        let providers = [];
        if (options.pinnedProviderId) {
            providers = [options.pinnedProviderId];
        }
        else {
            // Find all enabled providers for this kind ordered by chainOrder
            if (mongoose.connection.readyState !== 1) {
                const dbProviders = await prisma.provider.findMany({
                    where: { kind, enabled: true },
                    orderBy: { chainOrder: 'asc' },
                });
                providers = dbProviders.map((p) => p.providerId);
            }
            else {
                const dbProviders = await Provider.find({ kind, enabled: true }).sort({ chainOrder: 1 });
                providers = dbProviders.map((p) => p.providerId);
            }
        }
        if (providers.length === 0) {
            // Fallback: if none configured in DB, check standard default provider for kind
            if (kind === 'places')
                providers = ['google_places', 'serpapi', 'apify', 'overpass'];
            else if (kind === 'ai')
                providers = ['gemini'];
            else if (kind === 'email')
                providers = ['smtp', 'brevo', 'resend', 'gmail'];
        }
        let lastError = null;
        for (const providerId of providers) {
            logger.debug('failover', `Attempting provider: ${providerId} for kind: ${kind}`);
            const keys = await keyPool.getAvailableKeys(providerId, options.pinnedKeyId);
            if (keys.length === 0) {
                logger.warn('failover', `No available healthy keys found for provider: ${providerId}`);
                continue;
            }
            for (const activeKey of keys) {
                try {
                    logger.debug('failover', `Calling operation with key [${activeKey.label}] for ${providerId}`);
                    const result = await operation(activeKey);
                    await keyPool.recordSuccess(activeKey.id);
                    return result;
                }
                catch (err) {
                    lastError = err;
                    // If it's a Permanent bad request, don't keep rotating keys - fail immediately
                    if (err instanceof PermanentError) {
                        logger.error('failover', `Permanent error encountered: ${err.message}`);
                        throw err;
                    }
                    // Record failure on this specific key (triggers cooldown or status change)
                    await keyPool.recordFailure(activeKey.id, err);
                    logger.warn('failover', `Key [${activeKey.label}] failed with ${err instanceof Error ? err.name : 'Error'}: ${err instanceof Error ? err.message : String(err)}. Retrying with next key...`);
                }
            }
        }
        logger.error('failover', `All providers and keys exhausted for kind: ${kind}`, {
            lastError: lastError?.message,
        });
        throw new AllProvidersExhaustedError(`All providers and keys exhausted for ${kind}. Last error: ${lastError?.message || 'unknown'}`);
    }
}
export const failover = new FailoverService();
//# sourceMappingURL=failover.js.map