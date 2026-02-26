import proj4 from "proj4";

const EARTH_RADIUS = 6370997;
const DEG_LEN = (EARTH_RADIUS * Math.PI) / 180;

/**
 * Euro Truck Simulator 2 WGS84 properties
 */
const ETS2_PROJ_DEF =
    "+proj=lcc +lat_1=37 +lat_2=65 +lat_0=50 +lon_0=15 +R=6370997";
const ETS2_MAP_OFFSET = [16660, 4150] as const;
const ETS2_MAP_FACTOR = [-0.000171570875, 0.0001729241463] as const;
const ets2Converter = proj4(ETS2_PROJ_DEF);

export function convertEts2ToGeo(
    gameX: number,
    gameZ: number,
): [number, number] {
    let x = gameX - ETS2_MAP_OFFSET[0];
    let y = gameZ - ETS2_MAP_OFFSET[1];

    const ukScale = 0.75;
    const calaisBound = [-31100, -5500] as const;

    if (x * ukScale < calaisBound[0] && y * ukScale < calaisBound[1]) {
        x = (x + calaisBound[0] / 2) * ukScale;
        y = (y + calaisBound[1] / 2) * ukScale;
    }

    const projectedX = x * ETS2_MAP_FACTOR[1] * DEG_LEN;
    const projectedY = y * ETS2_MAP_FACTOR[0] * DEG_LEN;

    const result = ets2Converter.inverse([projectedX, projectedY]);
    return result as [number, number];
}

export function convertGeoToEts2(lng: number, lat: number): [number, number] {
    const projected = ets2Converter.forward([lng, lat]);
    const projX = projected[0]!;
    const projY = projected[1]!;

    let x = projX / (ETS2_MAP_FACTOR[1] * DEG_LEN);
    let y = projY / (ETS2_MAP_FACTOR[0] * DEG_LEN);

    const gameX = x + ETS2_MAP_OFFSET[0];
    const gameY = y + ETS2_MAP_OFFSET[1];

    return [gameX, gameY];
}

/**
 * American Truck Simulator WGS84 properties
 */
const ATS_PROJ_DEF =
    "+proj=lcc +lat_1=33 +lat_2=45 +lat_0=39 +lon_0=-96 +x_0=0 +y_0=0 +R=6370997";
const ATS_MAP_FACTOR = [-0.00017706234, 0.000176689948] as const;
const atsConverter = proj4(ATS_PROJ_DEF);

export function convertAtsToGeo(
    gameX: number,
    gameY: number,
): [number, number] {
    const projectedX = gameX * ATS_MAP_FACTOR[1] * DEG_LEN;
    const projectedY = gameY * ATS_MAP_FACTOR[0] * DEG_LEN;

    const result = atsConverter.inverse([projectedX, projectedY]);
    return result as [number, number];
}

export function convertGeoToAts(lng: number, lat: number): [number, number] {
    const projected = atsConverter.forward([lng, lat]);
    const projX = projected[0]!;
    const projY = projected[1]!;

    let x = projX / (ETS2_MAP_FACTOR[1] * DEG_LEN);
    let y = projY / (ETS2_MAP_FACTOR[0] * DEG_LEN);

    return [x, y];
}
