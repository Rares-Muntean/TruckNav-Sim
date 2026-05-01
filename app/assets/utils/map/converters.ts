const MERCATOR_R = 300000.0;

/**
 * Euro Truck Simulator 2 (Flat Canvas)
 */
export function convertEts2ToGeo(
    gameX: number,
    gameZ: number,
): [number, number] {
    const lon = (gameX / MERCATOR_R) * (180.0 / Math.PI);
    const y_merc = -gameZ / MERCATOR_R;
    const latRad = 2.0 * Math.atan(Math.exp(y_merc)) - Math.PI / 2.0;
    const lat = latRad * (180.0 / Math.PI);

    return [lon, lat];
}

export function convertGeoToEts2(lng: number, lat: number): [number, number] {
    const gameX = lng * (Math.PI / 180.0) * MERCATOR_R;

    // Reverse the Web Mercator math to get back to game Y/Z
    const latRad = lat * (Math.PI / 180.0);
    const y_merc = Math.log(Math.tan((latRad + Math.PI / 2.0) / 2.0));
    const gameZ = -y_merc * MERCATOR_R;

    return [gameX, gameZ];
}

/**
 * American Truck Simulator (Flat Canvas)
 */
export function convertAtsToGeo(
    gameX: number,
    gameY: number,
): [number, number] {
    const lon = (gameX / MERCATOR_R) * (180.0 / Math.PI);
    const y_merc = -gameY / MERCATOR_R;
    const latRad = 2.0 * Math.atan(Math.exp(y_merc)) - Math.PI / 2.0;
    const lat = latRad * (180.0 / Math.PI);

    return [lon, lat];
}

export function convertGeoToAts(lng: number, lat: number): [number, number] {
    const gameX = lng * (Math.PI / 180.0) * MERCATOR_R;

    // Reverse the Web Mercator math to get back to game Y
    const latRad = lat * (Math.PI / 180.0);
    const y_merc = Math.log(Math.tan((latRad + Math.PI / 2.0) / 2.0));
    const gameY = -y_merc * MERCATOR_R;

    return [gameX, gameY];
}
