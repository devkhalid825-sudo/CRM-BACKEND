import { PlacesProvider, PlaceResult, GridCell } from './PlacesProvider.js';
export declare class ApifyProvider implements PlacesProvider {
    id: "apify";
    testConnection(auth: {
        apiKey?: string;
    }): Promise<{
        ok: boolean;
        message: string;
        latencyMs?: number;
    }>;
    search(q: {
        keyword: string;
        country: string;
        cell?: GridCell;
        language?: string;
    }, auth: {
        apiKey?: string;
    }): Promise<PlaceResult[]>;
}
export declare const apifyProvider: ApifyProvider;
//# sourceMappingURL=apify.d.ts.map