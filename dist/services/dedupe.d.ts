/**
 * Normalizes phone numbers to standard international E.164 format (+XXXXXXXXXXX)
 */
export declare function normalizePhone(rawPhone: string, countryCode?: string): string | null;
/**
 * Normalizes website URLs to a clean canonical domain (e.g. "example.com")
 */
export declare function normalizeWebsite(rawUrl: string): string | null;
/**
 * Generates an immutable, collision-resistant placeKey for a lead to guarantee zero duplicates
 */
export declare function generatePlaceKey(params: {
    source: string;
    providerPlaceId?: string;
    phoneNorm?: string | null;
    websiteNorm?: string | null;
    name: string;
    city: string;
}): string;
//# sourceMappingURL=dedupe.d.ts.map