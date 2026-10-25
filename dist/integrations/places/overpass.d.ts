import { PlacesProvider, PlaceResult, GridCell } from './PlacesProvider.js';
export declare class OverpassProvider implements PlacesProvider {
    id: "overpass";
    testConnection(): Promise<{
        ok: boolean;
        message: string;
        latencyMs?: number;
    }>;
    search(q: {
        keyword: string;
        country: string;
        cell?: GridCell;
        language?: string;
    }): Promise<PlaceResult[]>;
}
export declare const overpassProvider: OverpassProvider;
//# sourceMappingURL=overpass.d.ts.map