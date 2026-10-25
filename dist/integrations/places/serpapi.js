import { AuthError, TransientError } from '../../services/errors.js';
export class SerpApiProvider {
    id = 'serpapi';
    async testConnection(auth) {
        if (!auth.apiKey)
            throw new AuthError('SerpAPI key is required');
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
        }
        catch (err) {
            if (err instanceof AuthError || err instanceof TransientError)
                throw err;
            throw new TransientError(`Failed to reach SerpAPI: ${err.message}`);
        }
    }
    async search(q, auth) {
        if (!auth.apiKey)
            throw new AuthError('SerpAPI key is required');
        const url = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(q.keyword)}&api_key=${encodeURIComponent(auth.apiKey)}`;
        const res = await fetch(url);
        const data = await res.json();
        const results = data.local_results || [];
        return results.map((item) => ({
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
//# sourceMappingURL=serpapi.js.map