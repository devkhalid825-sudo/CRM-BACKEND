import { PlacesProvider, PlaceResult, GridCell } from './PlacesProvider.js';
import { AuthError, TransientError, RateLimitedError } from '../../services/errors.js';

export class SerperProvider implements PlacesProvider {
  id = 'serper' as any;

  async testConnection(auth: { apiKey?: string }): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
    if (!auth.apiKey) throw new AuthError('Serper API key is required');
    const start = Date.now();
    try {
      const res = await fetch('https://google.serper.dev/places', {
        method: 'POST',
        headers: {
          'X-API-KEY': auth.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: 'coffee', gl: 'us', num: 1 }),
        signal: AbortSignal.timeout(10000),
      });
      const latencyMs = Date.now() - start;
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new AuthError('Invalid Serper API key');
        }
        if (res.status === 429) {
          throw new RateLimitedError('Serper rate limit or credits exhausted');
        }
        throw new TransientError(`Serper error HTTP ${res.status}`);
      }
      return { ok: true, message: `Serper connected successfully (${latencyMs}ms)`, latencyMs };
    } catch (err: unknown) {
      if (err instanceof AuthError || err instanceof RateLimitedError || err instanceof TransientError) throw err;
      throw new TransientError(`Failed to reach Serper: ${(err as Error).message}`);
    }
  }

  async search(
    q: { keyword: string; country: string; cell?: GridCell; language?: string },
    auth: { apiKey?: string }
  ): Promise<PlaceResult[]> {
    if (!auth.apiKey) throw new AuthError('Serper API key is required');

    const countryCode = (q.country || 'us').toLowerCase();
    const query = q.cell ? `${q.keyword} near ${q.cell.lat},${q.cell.lng}` : q.keyword;

    const res = await fetch('https://google.serper.dev/places', {
      method: 'POST',
      headers: {
        'X-API-KEY': auth.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        gl: countryCode,
        num: 20,
      }),
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) throw new AuthError('Serper unauthorized');
      if (res.status === 429) throw new RateLimitedError('Serper rate limited');
      throw new TransientError(`Serper HTTP ${res.status}`);
    }

    const data = await res.json();
    const places = data.places || [];

    return places.map((item: any) => ({
      placeKey: `serper_${item.cid || item.title?.replace(/\s+/g, '_')}_${item.latitude || ''}_${item.longitude || ''}`,
      name: item.title,
      phone: item.phoneNumber,
      website: item.website,
      address: item.address,
      rating: item.rating,
      lat: item.latitude ? parseFloat(item.latitude) : undefined,
      lng: item.longitude ? parseFloat(item.longitude) : undefined,
      country: q.country,
      raw: item,
    }));
  }
}

export const serperProvider = new SerperProvider();
