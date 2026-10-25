export interface GeoCell {
    lat: number;
    lng: number;
    radiusKm: number;
}
/**
 * Splits a geographic area into square/hexagonal grid cells (default 2km)
 * 1 degree latitude ~ 111 km
 * 1 degree longitude ~ 111 km * cos(latitude)
 */
export declare function generateGeoGrid(centerLat: number, centerLng: number, areaRadiusKm?: number, cellSizeKm?: number): GeoCell[];
//# sourceMappingURL=geoGrid.d.ts.map