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
      [out:json][timeout:25];
      (
        node["name"](around:${radiusMeters},${lat},${lng});
        way["name"](around:${radiusMeters},${lat},${lng});
      );
      out center 50;
    `;

    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) {
        throw new TransientError(`Overpass server HTTP ${res.status}`);
      }

      const data = await res.json();
      const elements: any[] = data.elements || [];

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
    } catch (err: any) {
      logger.warn('overpass', `Overpass search failed: ${err.message}`);
      return [];
    }
  }
}

export const overpassProvider = new OverpassProvider();
