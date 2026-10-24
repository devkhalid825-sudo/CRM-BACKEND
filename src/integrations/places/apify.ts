import { PlacesProvider, PlaceResult, GridCell } from './PlacesProvider.js';
import { AuthError, TransientError } from '../../services/errors.js';

export class ApifyProvider implements PlacesProvider {
  id = 'apify' as const;

  async testConnection(auth: { apiKey?: string }): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
    if (!auth.apiKey) throw new AuthError('Apify API token is required');
    const start = Date.now();
    try {
      const url = `https://api.apify.com/v2/users/me?token=${encodeURIComponent(auth.apiKey)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const latencyMs = Date.now() - start;
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new AuthError('Invalid Apify token');
        }
        throw new TransientError(`Apify error HTTP ${res.status}`);
      }
      return { ok: true, message: `Apify connected successfully (${latencyMs}ms)`, latencyMs };
    } catch (err: unknown) {
      if (err instanceof AuthError || err instanceof TransientError) throw err;
      throw new TransientError(`Failed to reach Apify: ${(err as Error).message}`);
    }
  }

  async search(
    q: { keyword: string; country: string; cell?: GridCell; language?: string },
    auth: { apiKey?: string }
  ): Promise<PlaceResult[]> {
    return [];
  }
}

export const apifyProvider = new ApifyProvider();
