import mongoose from 'mongoose';
import { ProviderKind, ProviderId } from '../shared/index.js';
import { Provider } from '../db/models/Provider.js';
import { prisma } from '../db/prisma.js';
import { keyPool, ActiveKey } from './keyPool.js';
import {
  AllProvidersExhaustedError,
  PermanentError,
  RateLimitedError,
  TransientError,
  QuotaExceededError,
  AuthError,
} from './errors.js';
import { logger } from './logger.js';

export interface FailoverOptions {
  pinnedProviderId?: ProviderId;
  pinnedKeyId?: string;
}

export class FailoverService {
  /**
   * Run an external operation with automatic key rotation and provider failover
   */
  async run<T>(
    kind: ProviderKind,
    operation: (key: ActiveKey) => Promise<T>,
    options: FailoverOptions = {}
  ): Promise<T> {
    let providers: ProviderId[] = [];

    const masterFallbackChain: ProviderId[] =
      kind === 'places'
        ? [
            'serper',
            'geoapify' as any,
            'gemini_places' as any,
            'gemini' as any,
            'overpass',
            'google_places',
            'serpapi',
            'apify',
          ]
        : kind === 'ai'
        ? ['groq' as any, 'gemini', 'openrouter' as any]
        : ['smtp', 'brevo', 'gmail', 'resend'];

    if (options.pinnedProviderId) {
      providers = [
        options.pinnedProviderId,
        ...masterFallbackChain.filter((p) => p !== options.pinnedProviderId),
      ];
    } else {
      let dbProviders: any[] = [];
      try {
        if (mongoose.connection.readyState !== 1) {
          dbProviders = await prisma.provider.findMany({
            where: { kind, enabled: true },
            orderBy: { chainOrder: 'asc' },
          });
        } else {
          dbProviders = await Provider.find({ kind, enabled: true }).sort({ chainOrder: 1 });
        }
      } catch (err: any) {
        logger.warn('failover', `Could not read providers from DB: ${err.message}`);
      }

      const activeDbList = dbProviders.map((p) => p.providerId as ProviderId);
      // Combine DB configured providers with master fallback chain so no provider is ever missed
      providers = Array.from(new Set([...activeDbList, ...masterFallbackChain]));
    }

    if (providers.length === 0) {
      providers = masterFallbackChain;
    }

    let lastError: Error | null = null;

    for (const providerId of providers) {
      logger.debug('failover', `Attempting provider: ${providerId} for kind: ${kind}`);

      const keys = await keyPool.getAvailableKeys(
        providerId,
        providerId === options.pinnedProviderId ? options.pinnedKeyId : undefined
      );

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
        } catch (err: unknown) {
          lastError = err as Error;

          // If it's a Permanent bad request, don't keep rotating keys - fail immediately
          if (err instanceof PermanentError) {
            logger.error('failover', `Permanent error encountered: ${err.message}`);
            throw err;
          }

          // Record failure on this specific key (triggers cooldown or status change)
          await keyPool.recordFailure(activeKey.id, err);

          logger.warn(
            'failover',
            `Key [${activeKey.label}] failed with ${err instanceof Error ? err.name : 'Error'}: ${
              err instanceof Error ? err.message : String(err)
            }. Retrying with next key...`
          );
        }
      }
    }

    logger.error('failover', `All providers and keys exhausted for kind: ${kind}`, {
      lastError: lastError?.message,
    });
    throw new AllProvidersExhaustedError(
      `All providers and keys exhausted for ${kind}. Last error: ${lastError?.message || 'unknown'}`
    );
  }
}

export const failover = new FailoverService();
