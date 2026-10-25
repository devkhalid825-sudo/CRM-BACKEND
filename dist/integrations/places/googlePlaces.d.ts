import { PlacesProvider, PlaceResult, GridCell } from './PlacesProvider.js';
export declare class GooglePlacesProvider implements PlacesProvider {
    id: "google_places";
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
export declare const googlePlacesProvider: GooglePlacesProvider;
//# sourceMappingURL=googlePlaces.d.ts.map