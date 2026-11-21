import { PlacesProvider, PlaceResult, GridCell } from './PlacesProvider.js';
import { TransientError } from '../../services/errors.js';
import { logger } from '../../services/logger.js';

export class OverpassProvider implements PlacesProvider {
  id = 'overpass' as const;

  async testConnection(): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
    const start = Date.now();
    try {
      const res = await fetch('https://overpass-api.de/api/status', {
        signal: AbortSignal.timeout(10000),
      });
      const latencyMs = Date.now() - start;
      if (!res.ok) throw new TransientError(`Overpass returned HTTP ${res.status}`);
      return {
        ok: true,
        message: `Overpass OpenStreetMap server is reachable (${latencyMs}ms) - 100% Free & Unlimited`,
        latencyMs,
      };
    } catch (err: unknown) {
      throw new TransientError(`Failed to reach Overpass: ${(err as Error).message}`);
    }
  }

  async search(
    q: { keyword: string; country: string; cell?: GridCell; language?: string }
  ): Promise<PlaceResult[]> {
    const lat = q.cell?.lat || 25.2048;
    const lng = q.cell?.lng || 55.2708;
    const radiusMeters = Math.min((q.cell?.radiusKm || 2) * 1000, 4000);

    // Overpass QL query: extract amenity, shop, office, commercial nodes/ways around lat,lng
    const query = `
      [out:json][timeout:20];
      (
        node["name"]["amenity"](around:${radiusMeters},${lat},${lng});
        node["name"]["shop"](around:${radiusMeters},${lat},${lng});
        node["name"]["office"](around:${radiusMeters},${lat},${lng});
        node["name"]["healthcare"](around:${radiusMeters},${lat},${lng});
        way["name"]["shop"](around:${radiusMeters},${lat},${lng});
        way["name"]["office"](around:${radiusMeters},${lat},${lng});
      );
      out center 50;
    `;

    // 1. Try public Overpass API endpoints
    const overpassEndpoints = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
    ];

    for (const endpoint of overpassEndpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          signal: AbortSignal.timeout(15000),
        });

        if (res.ok) {
          const data = await res.json();
          const elements: any[] = data.elements || [];

          if (elements.length > 0) {
            return elements
              .filter((el) => el.tags && el.tags.name)
              .map((el) => {
                const tags = el.tags || {};
                const itemLat = el.lat || el.center?.lat || lat;
                const itemLng = el.lon || el.center?.lon || lng;
                const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'] || undefined;
                const website = tags.website || tags['contact:website'] || undefined;
                const address = [tags['addr:street'], tags['addr:housenumber'], tags['addr:city'], tags['addr:country']]
                  .filter(Boolean)
                  .join(', ') || undefined;

                return {
                  placeKey: `overpass_${el.id}_${itemLat}_${itemLng}`,
                  name: tags.name,
                  phone,
                  website,
                  address,
                  city: tags['addr:city'] || undefined,
                  lat: itemLat,
                  lng: itemLng,
                  country: q.country,
                  raw: el,
                };
              });
          }
        }
      } catch (err: any) {
        logger.warn('overpass', `Overpass endpoint ${endpoint} failed: ${err.message}`);
      }
    }

    // 2. OpenStreetMap Nominatim 100% Free Search Fallback
    try {
      const nominatimQuery = `${q.keyword} ${q.country}`;
      const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(nominatimQuery)}&format=json&addressdetails=1&extratags=1&limit=30`;
      const nomRes = await fetch(nomUrl, {
        headers: { 'User-Agent': 'Global-CRM-LeadFinder/1.0' },
        signal: AbortSignal.timeout(12000),
      });

      if (nomRes.ok) {
        const nomData: any[] = await nomRes.json();
        if (Array.isArray(nomData) && nomData.length > 0) {
          return nomData.map((item, idx) => {
            const extra = item.extratags || {};
            const addr = item.address || {};
            const phone = extra.phone || extra['contact:phone'] || extra['contact:mobile'] || undefined;
            const website = extra.website || extra['contact:website'] || extra.url || undefined;
            return {
              placeKey: `nominatim_${item.place_id || idx}_${lat}_${lng}`,
              name: item.name || item.display_name?.split(',')[0] || q.keyword,
              phone,
              website,
              address: item.display_name,
              city: addr.city || addr.town || addr.state || q.country,
              lat: parseFloat(item.lat) || lat,
              lng: parseFloat(item.lon) || lng,
              country: q.country,
              raw: item,
            };
          });
        }
      }
    } catch (err: any) {
      logger.warn('overpass', `Nominatim fallback failed: ${err.message}`);
    }

    return [];
  }
}

export const overpassProvider = new OverpassProvider();
