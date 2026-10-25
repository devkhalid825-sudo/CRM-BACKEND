import { TransientError } from '../../services/errors.js';
export class OverpassProvider {
    id = 'overpass';
    async testConnection() {
        const start = Date.now();
        try {
            const res = await fetch('https://overpass-api.de/api/status', { signal: AbortSignal.timeout(10000) });
            const latencyMs = Date.now() - start;
            if (!res.ok)
                throw new TransientError(`Overpass returned HTTP ${res.status}`);
            return { ok: true, message: `Overpass OpenStreetMap server is reachable (${latencyMs}ms)`, latencyMs };
        }
        catch (err) {
            throw new TransientError(`Failed to reach Overpass: ${err.message}`);
        }
    }
    async search(q) {
        return [];
    }
}
export const overpassProvider = new OverpassProvider();
//# sourceMappingURL=overpass.js.map