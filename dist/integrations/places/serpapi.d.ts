import { PlacesProvider, PlaceResult, GridCell } from './PlacesProvider.js';
export declare class SerpApiProvider implements PlacesProvider {
    id: "serpapi";
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
export declare const serpApiProvider: SerpApiProvider;
//# sourceMappingURL=serpapi.d.ts.map