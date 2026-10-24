import { PlacesProvider } from './PlacesProvider.js';
import { googlePlacesProvider } from './googlePlaces.js';
import { serpApiProvider } from './serpapi.js';
import { apifyProvider } from './apify.js';
import { overpassProvider } from './overpass.js';

export * from './PlacesProvider.js';
export * from './googlePlaces.js';
export * from './serpapi.js';
export * from './apify.js';
export * from './overpass.js';

export const placesProviders: Record<string, PlacesProvider> = {
  google_places: googlePlacesProvider,
  serpapi: serpApiProvider,
  apify: apifyProvider,
  overpass: overpassProvider,
};
