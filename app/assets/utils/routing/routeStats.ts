import {
    convertGeoToAts,
    convertGeoToEts2,
} from "~/assets/utils/map/converters";
import type { GameType } from "~/types";
import type { MapScaleConfig } from "~/composables/CityData";

export interface WorkerCityArea {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
}

export function getScaleMultiplier(
    gameX: number,
    gameZ: number,
    cityAreas: WorkerCityArea[] | null,
    selectedGame: string | null,
    scaleConfig: MapScaleConfig,
): number {
    const rural = scaleConfig.ruralScale;
    const urban = scaleConfig.urbanScale ?? 3;
    const hasUk = scaleConfig.hasUkRule;

    let highwayScale = rural;

    if (hasUk && gameX < -31100 && gameZ < -5500) {
        highwayScale = 15;
    }

    if (!cityAreas || cityAreas.length === 0) return highwayScale;

    for (let i = 0; i < cityAreas.length; i++) {
        const area = cityAreas[i]!;
        if (
            gameX >= area.minX &&
            gameX <= area.maxX &&
            gameZ >= area.minZ &&
            gameZ <= area.maxZ
        ) {
            return urban;
        }
    }

    return highwayScale;
}

export const simplifyPath = (
    points: [number, number][],
    epsilon = 0.000002,
): [number, number][] => {
    if (points.length <= 2) return points;
    const sqEpsilon = epsilon * epsilon;

    const getSqDist = (
        p: [number, number],
        a: [number, number],
        b: [number, number],
    ) => {
        let x = a[0],
            y = a[1],
            dx = b[0] - x,
            dy = b[1] - y;
        if (dx !== 0 || dy !== 0) {
            let t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
            if (t > 1) {
                x = b[0];
                y = b[1];
            } else if (t > 0) {
                x += dx * t;
                y += dy * t;
            }
        }
        dx = p[0] - x;
        dy = p[1] - y;
        return dx * dx + dy * dy;
    };

    const simplifyRecursive = (
        pts: [number, number][],
        start: number,
        end: number,
        sqEpsilon: number,
        result: [number, number][],
    ) => {
        let maxSqDist = sqEpsilon;
        let index = -1;
        for (let i = start + 1; i < end; i++) {
            let d = getSqDist(pts[i]!, pts[start]!, pts[end]!);
            if (d > maxSqDist) {
                index = i;
                maxSqDist = d;
            }
        }
        if (index !== -1) {
            simplifyRecursive(pts, start, index, sqEpsilon, result);
            result.push(pts[index]!);
            simplifyRecursive(pts, index, end, sqEpsilon, result);
        }
    };

    const result = [points[0]!];
    simplifyRecursive(points, 0, points.length - 1, sqEpsilon, result);
    result.push(points[points.length - 1]!);
    return result;
};

export const smoothPath = (
    path: [number, number][],
    iterations = 5,
): [number, number][] => {
    if (path.length < 3) return path;
    let current = path;
    for (let it = 0; it < iterations; it++) {
        const smoothed: [number, number][] = [current[0]!];
        for (let i = 1; i < current.length - 1; i++) {
            const p = current[i - 1]!,
                c = current[i]!,
                n = current[i + 1]!;
            smoothed.push([
                p[0] * 0.25 + c[0] * 0.5 + n[0] * 0.25,
                p[1] * 0.25 + c[1] * 0.5 + n[1] * 0.25,
            ]);
        }
        smoothed.push(current[current.length - 1]!);
        current = smoothed;
    }
    return current;
};

export function buildRouteStatsCache(
    pathCoords: [number, number][],
    cities: WorkerCityArea[] | null,
    selectedGame: GameType,
    sdkScale: number = 0,
    avgSpeed: number,
    scaleConfig: MapScaleConfig,
) {
    const cache = new Float32Array(pathCoords.length * 3);
    const isAts = selectedGame === "ats";

    const baseHighway = isAts ? 105 : 82;
    const highwaySpeed =
        avgSpeed > 40 ? avgSpeed * 0.7 + baseHighway * 0.3 : baseHighway;

    const baseCity = isAts ? 40 : 32;
    const citySpeed =
        avgSpeed > 40 ? avgSpeed * 0.4 + baseCity * 0.6 : baseCity;
    const speeds = { highway: highwaySpeed, city: citySpeed };

    const gamePoints = pathCoords.map((p) =>
        isAts ? convertGeoToAts(p[0], p[1]) : convertGeoToEts2(p[0], p[1]),
    );

    let totalKm = 0;
    let totalGameHours = 0;
    let totalRealHours = 0;

    cache[0] = 0; // km
    cache[1] = 0; // game hours
    cache[2] = 0; // real hours

    for (let i = 0; i < pathCoords.length - 1; i++) {
        const [x1, z1] = gamePoints[i]!;
        const [x2, z2] = gamePoints[i + 1]!;

        const dx = x2 - x1;
        const dz = z2 - z1;
        const rawLength = Math.sqrt(dx * dx + dz * dz);

        const multiplier = getScaleMultiplier(
            (x1 + x2) / 2,
            (z1 + z2) / 2,
            cities,
            selectedGame,
            scaleConfig,
        );

        const segmentKm = (rawLength * multiplier) / 1000;
        const segmentSpeed = multiplier === 3 ? speeds.city : speeds.highway;
        const segmentGameHours = segmentKm / segmentSpeed;

        totalKm += segmentKm;
        totalGameHours += segmentGameHours;
        totalRealHours += segmentGameHours / multiplier;

        const idx = (i + 1) * 3;
        cache[idx] = totalKm;
        cache[idx + 1] = totalGameHours;
        cache[idx + 2] = totalRealHours;
    }

    return cache;
}
