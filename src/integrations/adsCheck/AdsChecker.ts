export interface AdsCheckResult {
  running: boolean;
  platforms: string[];
  checkedAt: string;
  autoTags: string[];
}

export interface AdsChecker {
  check(domainOrName: string, country?: string): Promise<AdsCheckResult>;
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

    // Default simulation/heuristics for Phase 2:
    // Can be connected to Apify Meta Ad Library actor when key is configured in Console
    return {
      running: false,
      platforms: [],
      checkedAt,
      autoTags: [],
    };
  }
}

export const adsChecker = new DefaultAdsChecker();
