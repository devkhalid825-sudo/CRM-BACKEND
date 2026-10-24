import { PlacesProvider, PlaceResult, GridCell } from './PlacesProvider.js';
import { AuthError, TransientError } from '../../services/errors.js';

export class SerpApiProvider implements PlacesProvider {
  id = 'serpapi' as const;

  async testConnection(auth: { apiKey?: string }): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
    if (!auth.apiKey) throw new AuthError('SerpAPI key is required');
    const start = Date.now();
    try {
      const url = `https://serpapi.com/account?api_key=${encodeURIComponent(auth.apiKey)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const latencyMs = Date.now() - start;
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new AuthError('Invalid SerpAPI key');
        }
        throw new TransientError(`SerpAPI error HTTP ${res.status}`);
      }
      return { ok: true, message: `SerpAPI connected successfully (${latencyMs}ms)`, latencyMs };
    } catch (err: unknown) {
      if (err instanceof AuthError || err instanceof TransientError) throw err;
      throw new TransientError(`Failed to reach SerpAPI: ${(err as Error).message}`);
    }
  }

  async search(
    q: { keyword: string; country: string; cell?: GridCell; language?: string },
    auth: { apiKey?: string }
  ): Promise<PlaceResult[]> {
    if (!auth.apiKey) throw new AuthError('SerpAPI key is required');
    const url = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(
      q.keyword
    )}&api_key=${encodeURIComponent(auth.apiKey)}`;
    const res = await fetch(url);
    const data = await res.json();
    const results = data.local_results || [];
    return results.map((item: any) => ({
      placeKey: `serp_${item.place_id || item.data_id || Math.random()}`,
      name: item.title,
      phone: item.phone,
      website: item.website,
      address: item.address,
      rating: item.rating,
      country: q.country,
      raw: item,
    }));
  }
}

export const serpApiProvider = new SerpApiProvider();
