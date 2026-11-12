export interface AdDetectionResult {
    hasMetaPixel: boolean;
    pixelIds: string[];
    hasMetaTags: boolean;
    hasFacebookLink: boolean;
    hasInstagramLink: boolean;
    facebookUrl?: string;
    instagramUrl?: string;
    isMetaIntegrated: boolean;
    runningMetaAds: boolean;
    adLibraryUrl: string;
    hasGoogleAds: boolean;
    hasGtm: boolean;
    hasGoogleAnalytics: boolean;
    googleAdsId?: string;
    gtmId?: string;
    runningGoogleAds: boolean;
    googleTransparencyUrl: string;
    runningAds: boolean;
    adPlatforms: string[];
}
/**
 * Checks an HTML string for Meta/Facebook & Google Ads tracking tags, pixels and social links
 */
export declare function detectAdsFromHtml(html: string, businessName: string): AdDetectionResult;
/**
 * Fetches website and scans for Meta & Google Ads assets with timeout safety
 */
export declare function scanLeadWebsiteForMeta(websiteUrl: string, businessName: string): Promise<AdDetectionResult>;
//# sourceMappingURL=metaDetector.d.ts.map