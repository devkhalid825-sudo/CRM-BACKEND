import { PlacesProvider } from './PlacesProvider.js';
import { googlePlacesProvider } from './googlePlaces.js';
import { serpApiProvider } from './serpapi.js';
import { serperProvider } from './serper.js';
import { apifyProvider } from './apify.js';
import { overpassProvider } from './overpass.js';

export * from './PlacesProvider.js';
export * from './googlePlaces.js';
export * from './serpapi.js';
export * from './serper.js';
export * from './apify.js';
export * from './overpass.js';

export const placesProviders: Record<string, PlacesProvider> = {
  google_places: googlePlacesProvider,
  serper: serperProvider,
  serpapi: serpApiProvider,
  apify: apifyProvider,
  overpass: overpassProvider,
};
