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
        const masterFallbackChain = kind === 'places'
            ? [
                'serper',
                'geoapify',
                'gemini_places',
                'gemini',
                'overpass',
                'google_places',
                'serpapi',
                'apify',
            ]
            : kind === 'ai'
                ? ['groq', 'gemini', 'openrouter']
                : ['smtp', 'brevo', 'gmail', 'resend'];
        if (options.pinnedProviderId) {
            providers = [
                options.pinnedProviderId,
                ...masterFallbackChain.filter((p) => p !== options.pinnedProviderId),
            ];
        }
        else {
            let dbProviders = [];
            try {
                if (mongoose.connection.readyState !== 1) {
                    dbProviders = await prisma.provider.findMany({
                        where: { kind, enabled: true },
                        orderBy: { chainOrder: 'asc' },
                    });
                }
                else {
                    dbProviders = await Provider.find({ kind, enabled: true }).sort({ chainOrder: 1 });
                }
            }
            catch (err) {
                logger.warn('failover', `Could not read providers from DB: ${err.message}`);
            }
            const activeDbList = dbProviders.map((p) => p.providerId);
            // Combine DB configured providers with master fallback chain so no provider is ever missed
            providers = Array.from(new Set([...activeDbList, ...masterFallbackChain]));
        }
        if (providers.length === 0) {
            providers = masterFallbackChain;
        }
        let lastError = null;
        for (const providerId of providers) {
            logger.debug('failover', `Attempting provider: ${providerId} for kind: ${kind}`);
            const keys = await keyPool.getAvailableKeys(providerId, providerId === options.pinnedProviderId ? options.pinnedKeyId : undefined);
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