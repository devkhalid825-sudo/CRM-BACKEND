export interface AdsCheckResult {
    running: boolean;
    platforms: string[];
    checkedAt: string;
    autoTags: string[];
}
export interface AdsChecker {
    check(domainOrName: string, country?: string): Promise<AdsCheckResult>;
}
export declare class DefaultAdsChecker implements AdsChecker {
    check(domainOrName: string): Promise<AdsCheckResult>;
}
export declare const adsChecker: DefaultAdsChecker;
//# sourceMappingURL=AdsChecker.d.ts.map