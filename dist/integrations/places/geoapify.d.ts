import { PlacesProvider, PlaceResult, GridCell } from './PlacesProvider.js';
export declare class GeoapifyProvider implements PlacesProvider {
    id: "geoapify";
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
export declare const geoapifyProvider: GeoapifyProvider;
//# sourceMappingURL=geoapify.d.ts.map