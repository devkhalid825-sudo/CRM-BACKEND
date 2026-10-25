import { AuthError, QuotaExceededError, RateLimitedError, TransientError, PermanentError } from '../../services/errors.js';
export class GooglePlacesProvider {
    id = 'google_places';
    async testConnection(auth) {
        if (!auth.apiKey) {
            throw new AuthError('API key is missing');
        }
        const start = Date.now();
        try {
            const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=Google&inputtype=textquery&fields=place_id,name&key=${encodeURIComponent(auth.apiKey)}`;
            const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
            const latencyMs = Date.now() - start;
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    throw new AuthError(`HTTP ${response.status}: Google Places API authorization failed`);
                }
                throw new TransientError(`Google Places returned HTTP ${response.status}`);
            }
            const data = (await response.json());
            if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
                return {
                    ok: true,
                    message: `Connected successfully to Google Places API in ${latencyMs}ms`,
                    latencyMs,
                };
            }
            if (data.status === 'REQUEST_DENIED') {
                throw new AuthError(data.error_message || 'Google Places Request Denied (check API key or billing)');
            }
            if (data.status === 'OVER_QUERY_LIMIT') {
                throw new QuotaExceededError(data.error_message || 'Google Places query limit exceeded');
            }
            if (data.status === 'INVALID_REQUEST') {
                throw new PermanentError(data.error_message || 'Invalid request parameters');
            }
            throw new TransientError(`Google Places returned status: ${data.status}`);
        }
        catch (err) {
            if (err instanceof AuthError ||
                err instanceof QuotaExceededError ||
                err instanceof RateLimitedError ||
                err instanceof PermanentError ||
                err instanceof TransientError) {
                throw err;
            }
            throw new TransientError(`Failed to reach Google Places API: ${err.message}`);
        }
    }
    async search(q, auth) {
        if (!auth.apiKey)
            throw new AuthError('API key is required');
        let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q.keyword)}&key=${encodeURIComponent(auth.apiKey)}`;
        if (q.cell) {
            url += `&location=${q.cell.lat},${q.cell.lng}&radius=${Math.round(q.cell.radiusKm * 1000)}`;
        }
        if (q.language) {
            url += `&language=${encodeURIComponent(q.language)}`;
        }
        const res = await fetch(url);
        const data = (await res.json());
        if (data.status === 'REQUEST_DENIED')
            throw new AuthError(data.error_message || 'Request denied');
        if (data.status === 'OVER_QUERY_LIMIT')
            throw new QuotaExceededError(data.error_message || 'Quota exceeded');
        if (!data.results)
            return [];
        return data.results.map((item) => ({
            placeKey: `google_${item.place_id}`,
            name: item.name,
            address: item.formatted_address,
            lat: item.geometry?.location.lat,
            lng: item.geometry?.location.lng,
            rating: item.rating,
            country: q.country,
            raw: item,
        }));
    }
}
export const googlePlacesProvider = new GooglePlacesProvider();
//# sourceMappingURL=googlePlaces.js.map