import { ProviderId } from '../../shared/index.js';

export interface GridCell {
  lat: number;
  lng: number;
  radiusKm: number;
}

export interface PlaceResult {
  placeKey: string;
  name: string;
  phone?: string;
  website?: string;
  address?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  category?: string;
  country: string;
  city?: string;
  raw?: unknown;
}

export interface PlacesProvider {
  id: ProviderId;
  search(
    q: { keyword: string; country: string; cell?: GridCell; language?: string },
    auth: { apiKey?: string }
  ): Promise<PlaceResult[]>;
  testConnection(auth: { apiKey?: string }): Promise<{ ok: boolean; message: string; latencyMs?: number }>;
}
