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
export declare class DefaultAdsChecker implements AdsChecker {
    check(domainOrName: string): Promise<AdsCheckResult>;
    /**
     * Search Meta Ad Library using official Graph API if META_ACCESS_TOKEN is configured
     */
    searchMetaAdLibrary(keyword: string, country?: string): Promise<MetaAdItem[]>;
}
export declare const adsChecker: DefaultAdsChecker;
//# sourceMappingURL=AdsChecker.d.ts.map