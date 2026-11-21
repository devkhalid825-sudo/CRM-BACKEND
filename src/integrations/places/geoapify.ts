import { PlacesProvider, PlaceResult, GridCell } from './PlacesProvider.js';
import { AuthError, TransientError, RateLimitedError } from '../../services/errors.js';
import { logger } from '../../services/logger.js';

export class GeoapifyProvider implements PlacesProvider {
  id = 'geoapify' as const;

  async testConnection(auth: { apiKey?: string }): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
    if (!auth.apiKey) throw new AuthError('Geoapify API key is required');
    const start = Date.now();
    try {
      const url = `https://api.geoapify.com/v1/geocode/search?text=Dubai&limit=1&apiKey=${encodeURIComponent(auth.apiKey)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const latencyMs = Date.now() - start;
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) throw new AuthError('Invalid Geoapify API key');
        if (res.status === 429) throw new RateLimitedError('Geoapify rate limit reached');
        throw new TransientError(`Geoapify error HTTP ${res.status}`);
      }
      return { ok: true, message: `Geoapify connected successfully (${latencyMs}ms) - 3,000/day Free`, latencyMs };
    } catch (err: unknown) {
      if (err instanceof AuthError || err instanceof RateLimitedError || err instanceof TransientError) throw err;
      throw new TransientError(`Failed to reach Geoapify: ${(err as Error).message}`);
    }
  }

  async search(
    q: { keyword: string; country: string; cell?: GridCell; language?: string },
    auth: { apiKey?: string }
  ): Promise<PlaceResult[]> {
    if (!auth.apiKey) throw new AuthError('Geoapify API key is required');

    const lat = q.cell?.lat || 25.2048;
    const lng = q.cell?.lng || 55.2708;
    const radiusMeters = Math.min((q.cell?.radiusKm || 3) * 1000, 5000);

    // Map keyword to optimal Geoapify categories
    const kw = q.keyword.toLowerCase();
    let categories = 'commercial,service';
    if (kw.includes('estate') || kw.includes('property')) categories = 'commercial.real_estate,commercial,service';
    else if (kw.includes('clinic') || kw.includes('doctor') || kw.includes('dental') || kw.includes('health')) categories = 'healthcare,healthcare.clinic,healthcare.dentist';
    else if (kw.includes('law') || kw.includes('legal')) categories = 'service.legal,service';
    else if (kw.includes('car') || kw.includes('auto')) categories = 'service.vehicle,commercial.vehicle';
    else if (kw.includes('restaurant') || kw.includes('cafe') || kw.includes('food')) categories = 'catering.restaurant,catering.cafe';

    try {
      // 1. First attempt: Geoapify Places V2 circle category query
      const url = `https://api.geoapify.com/v2/places?categories=${categories}&filter=circle:${lng},${lat},${radiusMeters}&bias=proximity:${lng},${lat}&limit=40&apiKey=${encodeURIComponent(auth.apiKey)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });

      if (res.ok) {
        const data = await res.json();
        const features: any[] = data.features || [];
        if (features.length > 0) {
          return features
            .filter((f) => f.properties && (f.properties.name || f.properties.address_line1))
            .map((f, idx) => {
              const p = f.properties;
              const name = p.name || p.address_line1 || 'Business';
              const phone = p.datasource?.raw?.phone || p.contact?.phone || '';
              const website = p.datasource?.raw?.website || p.website || p.contact?.url || '';
              const address = p.formatted || p.address_line2 || '';
              const city = p.city || q.country;

              return {
                placeKey: `geoapify_${(p.place_id || name).replace(/\s+/g, '_')}_${idx}`,
                name,
                phone,
                website,
                address,
                city,
                rating: 4.5,
                lat: p.lat || lat,
                lng: p.lon || lng,
                country: q.country,
                raw: p,
              };
            });
        }
      }

      // 2. Fallback: text search if category query returned few results
      const textQuery = `${q.keyword} ${q.country}`;
      const searchUrl = `https://api.geoapify.com/v2/places?text=${encodeURIComponent(textQuery)}&filter=circle:${lng},${lat},${radiusMeters}&bias=proximity:${lng},${lat}&limit=30&apiKey=${encodeURIComponent(auth.apiKey)}`;
      const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(12000) });

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const searchFeatures: any[] = searchData.features || [];
        return searchFeatures
          .filter((f) => f.properties && (f.properties.name || f.properties.address_line1))
          .map((f, idx) => {
            const p = f.properties;
            const phone =
              p.datasource?.raw?.phone ||
              p.contact?.phone ||
              p.datasource?.raw?.['contact:phone'] ||
              p.datasource?.raw?.['contact:mobile'] ||
              '';
            const website =
              p.datasource?.raw?.website ||
              p.website ||
              p.contact?.url ||
              p.datasource?.raw?.['contact:website'] ||
              '';
            return {
              placeKey: `geoapify_text_${(p.place_id || p.name || 'biz').replace(/\s+/g, '_')}_${idx}`,
              name: p.name || p.address_line1,
              phone,
              website,
              address: p.formatted || '',
              city: p.city || q.country,
              rating: 4.5,
              lat: p.lat || lat,
              lng: p.lon || lng,
              country: q.country,
              raw: p,
            };
          });
      }

      return [];
    } catch (err: any) {
      if (err instanceof AuthError || err instanceof RateLimitedError) throw err;
      logger.warn('geoapify', `Geoapify search warning: ${err.message}`);
      throw new TransientError(`Geoapify error: ${err.message}`);
    }
  }
}

export const geoapifyProvider = new GeoapifyProvider();
