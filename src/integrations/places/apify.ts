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
    if (!auth.apiKey) throw new AuthError('Apify API token is required');

    const query = q.cell
      ? `${q.keyword} in ${q.country} near ${q.cell.lat},${q.cell.lng}`
      : `${q.keyword} in ${q.country}`;

    try {
      const url = `https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items?token=${encodeURIComponent(
        auth.apiKey
      )}&timeout=35`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchStringsArray: [query],
          maxCrawledPlacesPerSearch: 20,
          language: q.language || 'en',
          skipClosedPlaces: true,
        }),
        signal: AbortSignal.timeout(40000),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new AuthError('Invalid Apify token');
        throw new TransientError(`Apify run error HTTP ${response.status}`);
      }

      const items: any[] = await response.json();
      if (!Array.isArray(items)) return [];

      return items.map((item: any, idx: number) => ({
        placeKey: `apify_${item.placeId || item.cid || (item.title || 'biz').replace(/\s+/g, '_')}_${idx}`,
        name: item.title || item.name || 'Business',
        phone: item.phone || item.phoneUnformatted || '',
        website: item.website || item.url || '',
        address: item.address || item.street || '',
        city: item.city || q.country,
        rating: item.totalScore || 4.5,
        lat: item.location?.lat || q.cell?.lat,
        lng: item.location?.lng || q.cell?.lng,
        country: q.country,
        raw: item,
      }));
    } catch (err: any) {
      if (err instanceof AuthError) throw err;
      throw new TransientError(`Apify search failed: ${err.message}`);
    }
  }
}

export const apifyProvider = new ApifyProvider();
