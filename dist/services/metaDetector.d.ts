export interface MetaDetectionResult {
    hasMetaPixel: boolean;
    pixelIds: string[];
    hasMetaTags: boolean;
    hasFacebookLink: boolean;
    hasInstagramLink: boolean;
    facebookUrl?: string;
    instagramUrl?: string;
    isMetaIntegrated: boolean;
    runningAds: boolean;
    adLibraryUrl: string;
}
/**
 * Checks an HTML string for Meta/Facebook tracking pixels, social links, and OpenGraph tags
 */
export declare function detectMetaFromHtml(html: string, businessName: string): MetaDetectionResult;
/**
 * Fetches website and scans for Meta assets with timeout safety
 */
export declare function scanLeadWebsiteForMeta(websiteUrl: string, businessName: string): Promise<MetaDetectionResult>;
//# sourceMappingURL=metaDetector.d.ts.map