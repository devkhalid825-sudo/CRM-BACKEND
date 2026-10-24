import { PlacesProvider, PlaceResult, GridCell } from './PlacesProvider.js';
import { TransientError } from '../../services/errors.js';

export class OverpassProvider implements PlacesProvider {
  id = 'overpass' as const;

  async testConnection(): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
    const start = Date.now();
    try {
      const res = await fetch('https://overpass-api.de/api/status', { signal: AbortSignal.timeout(10000) });
      const latencyMs = Date.now() - start;
      if (!res.ok) throw new TransientError(`Overpass returned HTTP ${res.status}`);
      return { ok: true, message: `Overpass OpenStreetMap server is reachable (${latencyMs}ms)`, latencyMs };
    } catch (err: unknown) {
      throw new TransientError(`Failed to reach Overpass: ${(err as Error).message}`);
    }
  }

  async search(
    q: { keyword: string; country: string; cell?: GridCell; language?: string }
  ): Promise<PlaceResult[]> {
    return [];
  }
}

export const overpassProvider = new OverpassProvider();
