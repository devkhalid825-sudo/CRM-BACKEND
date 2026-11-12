import { PlacesProvider, PlaceResult, GridCell } from './PlacesProvider.js';
export declare class GeminiPlacesProvider implements PlacesProvider {
    id: any;
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
export declare const geminiPlacesProvider: GeminiPlacesProvider;
//# sourceMappingURL=geminiPlaces.d.ts.map