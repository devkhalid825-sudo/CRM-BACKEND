/**
 * Splits a geographic area into square/hexagonal grid cells (default 2km)
 * 1 degree latitude ~ 111 km
 * 1 degree longitude ~ 111 km * cos(latitude)
 */
export function generateGeoGrid(centerLat, centerLng, areaRadiusKm = 10, cellSizeKm = 2) {
    const cells = [];
    const latDeltaPerKm = 1 / 110.574;
    const lngDeltaPerKm = 1 / (111.32 * Math.cos((centerLat * Math.PI) / 180));
    const latStep = cellSizeKm * latDeltaPerKm;
    const lngStep = cellSizeKm * lngDeltaPerKm;
    const latMin = centerLat - areaRadiusKm * latDeltaPerKm;
    const latMax = centerLat + areaRadiusKm * latDeltaPerKm;
    const lngMin = centerLng - areaRadiusKm * lngDeltaPerKm;
    const lngMax = centerLng + areaRadiusKm * lngDeltaPerKm;
    for (let lat = latMin; lat <= latMax; lat += latStep) {
        for (let lng = lngMin; lng <= lngMax; lng += lngStep) {
            // Calculate distance from center to include only within radius circle
            const dLat = (lat - centerLat) / latDeltaPerKm;
            const dLng = (lng - centerLng) / lngDeltaPerKm;
            const distFromCenter = Math.sqrt(dLat * dLat + dLng * dLng);
            if (distFromCenter <= areaRadiusKm) {
                cells.push({
                    lat: Number(lat.toFixed(6)),
                    lng: Number(lng.toFixed(6)),
                    radiusKm: cellSizeKm,
                });
            }
        }
    }
    // If no cells created (very small radius), return at least center cell
    if (cells.length === 0) {
        cells.push({
            lat: centerLat,
            lng: centerLng,
            radiusKm: cellSizeKm,
        });
    }
    return cells;
}
//# sourceMappingURL=geoGrid.js.map