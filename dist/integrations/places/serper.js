import { AuthError, TransientError, RateLimitedError } from '../../services/errors.js';
export class SerperProvider {
    id = 'serper';
    async testConnection(auth) {
        if (!auth.apiKey)
            throw new AuthError('Serper API key is required');
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
        }
        catch (err) {
            if (err instanceof AuthError || err instanceof RateLimitedError || err instanceof TransientError)
                throw err;
            throw new TransientError(`Failed to reach Serper: ${err.message}`);
        }
    }
    async search(q, auth) {
        if (!auth.apiKey)
            throw new AuthError('Serper API key is required');
        const countryCode = (q.country || 'us').toLowerCase();
        const query = q.cell ? `${q.keyword} near ${q.cell.lat},${q.cell.lng}` : q.keyword;
        // Multi-page batch fetching: request page 1 and page 2 for high-yield lead density (up to 40-50 leads per cell)
        const fetchPage = async (page) => {
            const res = await fetch('https://google.serper.dev/places', {
                method: 'POST',
                headers: {
                    'X-API-KEY': auth.apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    q: query,
                    gl: countryCode,
                    page,
                }),
                signal: AbortSignal.timeout(15000),
            });
            if (!res.ok) {
                if (res.status === 401 || res.status === 403)
                    throw new AuthError('Serper unauthorized');
                if (res.status === 429)
                    throw new RateLimitedError('Serper rate limited');
                return [];
            }
            const data = await res.json();
            return data.places || [];
        };
        let allPlaces = [];
        try {
            const p1 = await fetchPage(1);
            allPlaces.push(...p1);
            // If page 1 returned a full batch, fetch page 2 to double the leads per credit
            if (p1.length >= 10) {
                const p2 = await fetchPage(2).catch(() => []);
                allPlaces.push(...p2);
            }
        }
        catch (err) {
            if (err instanceof AuthError || err instanceof RateLimitedError)
                throw err;
            throw new TransientError(`Serper error: ${err.message}`);
        }
        return allPlaces.map((item) => ({
            placeKey: `serper_${item.cid || (item.title || 'biz').replace(/\s+/g, '_')}_${item.latitude || ''}_${item.longitude || ''}`,
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
//# sourceMappingURL=serper.js.map