export interface AdsCheckResult {
  running: boolean;
  platforms: string[];
  checkedAt: string;
  autoTags: string[];
}

export interface MetaAdItem {
  id: string;
  pageName: string;
  adText?: string;
  snapshotUrl?: string;
  publisherPlatforms?: string[];
  startDate?: string;
}

export interface AdsChecker {
  check(domainOrName: string, country?: string): Promise<AdsCheckResult>;
  searchMetaAdLibrary(keyword: string, country?: string): Promise<MetaAdItem[]>;
}

export class DefaultAdsChecker implements AdsChecker {
  async check(domainOrName: string): Promise<AdsCheckResult> {
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
   * Search Meta Ad Library using official Graph API if META_ACCESS_TOKEN or KeyPool is configured
   */
  async searchMetaAdLibrary(keyword: string, country = 'ALL'): Promise<MetaAdItem[]> {
    let token = process.env.META_ACCESS_TOKEN;
    if (!token) {
      try {
        const { keyPool } = await import('../../services/keyPool.js');
        const keys = await keyPool.getAvailableKeys('meta');
        token = keys[0]?.rawKey;
      } catch {
        // keyPool fallback
      }
    }
    if (!token) return [];

    try {
      const url = `https://graph.facebook.com/v19.0/ads_archive?access_token=${encodeURIComponent(
        token
      )}&ad_reached_countries=['${country}']&search_terms=${encodeURIComponent(
        keyword
      )}&ad_type=ALL&fields=id,page_name,ad_creative_bodies,ad_snapshot_url,publisher_platforms,ad_delivery_start_time&limit=25`;

      const res = await fetch(url);
      if (!res.ok) return [];
      const json: any = await res.json();
      const data = json.data || [];

      return data.map((item: any) => ({
        id: item.id,
        pageName: item.page_name,
        adText: item.ad_creative_bodies?.[0] || '',
        snapshotUrl: item.ad_snapshot_url,
        publisherPlatforms: item.publisher_platforms || ['facebook', 'instagram'],
        startDate: item.ad_delivery_start_time,
      }));
    } catch {
      return [];
    }
  }
}

export const adsChecker = new DefaultAdsChecker();
