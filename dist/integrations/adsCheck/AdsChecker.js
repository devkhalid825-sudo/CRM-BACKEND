export class DefaultAdsChecker {
    async check(domainOrName) {
        const checkedAt = new Date().toISOString();
        if (!domainOrName) {
            return {
                running: false,
                platforms: [],
                checkedAt,
                autoTags: ['No Website'],
            };
        }
        return {
            running: false,
            platforms: [],
            checkedAt,
            autoTags: [],
        };
    }
    /**
     * Search Meta Ad Library using official Graph API if META_ACCESS_TOKEN, META_GRAPH_ACCESS_TOKEN or KeyPool is configured
     */
    async searchMetaAdLibrary(keyword, country = 'ALL') {
        let token = process.env.META_ACCESS_TOKEN || process.env.META_GRAPH_ACCESS_TOKEN;
        if (!token) {
            try {
                const { keyPool } = await import('../../services/keyPool.js');
                const keys = (await keyPool.getAvailableKeys('meta_ad_library')) || (await keyPool.getAvailableKeys('meta'));
                token = keys[0]?.rawKey;
            }
            catch {
                // keyPool fallback
            }
        }
        if (!token)
            return [];
        try {
            const url = `https://graph.facebook.com/v19.0/ads_archive?access_token=${encodeURIComponent(token)}&ad_reached_countries=['${country}']&search_terms=${encodeURIComponent(keyword)}&ad_type=ALL&fields=id,page_name,ad_creative_bodies,ad_snapshot_url,publisher_platforms,ad_delivery_start_time&limit=25`;
            const res = await fetch(url);
            if (!res.ok)
                return [];
            const json = await res.json();
            const data = json.data || [];
            return data.map((item) => ({
                id: item.id,
                pageName: item.page_name,
                adText: item.ad_creative_bodies?.[0] || '',
                snapshotUrl: item.ad_snapshot_url,
                publisherPlatforms: item.publisher_platforms || ['facebook', 'instagram'],
                startDate: item.ad_delivery_start_time,
            }));
        }
        catch {
            return [];
        }
    }
}
export const adsChecker = new DefaultAdsChecker();
//# sourceMappingURL=AdsChecker.js.map