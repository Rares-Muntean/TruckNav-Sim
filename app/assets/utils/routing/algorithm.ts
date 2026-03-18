import { MinHeap } from "~/assets/utils/routing/MinHeap";
import {
    getBearing,
    getAngleDiff,
    getSignedAngle,
} from "~/assets/utils/map/maths";
import { convertGeoToAts, convertGeoToEts2 } from "../map/converters";
import type { GameType } from "~/types";

const MAX_NODES = 900000;

const cache_costs = new Float64Array(MAX_NODES);
const cache_previous = new Int32Array(MAX_NODES);
const cache_visited = new Uint8Array(MAX_NODES);
const openHeap = new MinHeap(50000);

let cache_flatCoords: Float64Array | null = null;

export interface SimpleCityNode {
    x: number; // Game X (Converted from Lng)
    z: number; // Game Z (Converted from Lat)
    radius: number; // calculated from scaleRank
}

function ensureCoordCache(nodeCoords: Map<number, [number, number]>) {
    if (cache_flatCoords && cache_flatCoords.length > 0) return;

    cache_flatCoords = new Float64Array(MAX_NODES * 2);

    for (const [id, [lng, lat]] of nodeCoords) {
        if (id * 2 + 1 < cache_flatCoords.length) {
            cache_flatCoords[id * 2] = lng;
            cache_flatCoords[id * 2 + 1] = lat;
        }
    }
}

export function getScaleMultiplier(
    gameX: number,
    gameZ: number,
    cities: SimpleCityNode[] | null,
    selectedGame: string | null,
): number {
    if (!cities) return selectedGame === "ats" ? 20 : 19;

    for (let i = 0; i < cities.length; i++) {
        const city = cities[i]!;
        const dx = gameX - city.x;
        const dy = gameZ - city.z;

        if (dx * dx + dy * dy < city.radius * city.radius) {
            return 3;
        }
    }

    return selectedGame === "ats" ? 20 : 19;
}

function fastDistKm(
    lng1: number,
    lat1: number,
    lng2: number,
    lat2: number,
): number {
    const ky = 111.0;
    const kx = 111.0 * 0.65;

    const dy = (lat1 - lat2) * ky;
    const dx = (lng1 - lng2) * kx;

    return Math.sqrt(dx * dx + dy * dy);
}

function getHeading(x1: number, y1: number, x2: number, y2: number): number {
    return Math.atan2(y2 - y1, x2 - x1);
}

function getRadianAngleDiff(a1: number, a2: number): number {
    let diff = Math.abs(a1 - a2);
    if (diff > Math.PI) {
        diff = 2 * Math.PI - diff;
    }
    return diff;
}

export const calculateRoute = (
    start: number,
    possibleEnds: Set<number | undefined>,
    startHeading: number | null,
    adjacency: Map<
        number,
        { to: number; weight: number; r: number; dlc: number }[]
    >,
    nodeCoords: Map<number, [number, number]>,
    startType: "road" | "yard" = "road",
    ownedDlcs: number[],
    targetLocation?: [number, number],
): { path: [number, number][]; endId: number } | null => {
    ensureCoordCache(nodeCoords);
    const flatCoords = cache_flatCoords!;

    cache_costs.fill(Infinity);
    cache_previous.fill(-1);
    cache_visited.fill(0);
    openHeap.clear();

    let destLng = 0,
        destLat = 0;
    let foundDest = false;

    if (targetLocation) {
        destLng = targetLocation[0];
        destLat = targetLocation[1];
        foundDest = true;
    } else {
        const firstEndId = [...possibleEnds][0];
        if (firstEndId !== undefined) {
            destLng = flatCoords[firstEndId * 2]!;
            destLat = flatCoords[firstEndId * 2 + 1]!;
            foundDest = true;
        }
    }

    if (!foundDest) return null;

    const startLng = flatCoords[start * 2]!;
    const startLat = flatCoords[start * 2 + 1]!;

    const distKm = fastDistKm(startLng, startLat, destLng, destLat);
    const maxIterations = 70000 + distKm * 5000;

    const HEURISTIC_SCALE = 2.0;

    const getHeuristic = (id: number) => {
        const nLng = flatCoords[id * 2]!;
        const nLat = flatCoords[id * 2 + 1]!;
        const dx = nLng - destLng;
        const dy = nLat - destLat;
        return Math.sqrt(dx * dx + dy * dy) * 100 * HEURISTIC_SCALE;
    };

    cache_costs[start] = 0;
    openHeap.push(start, 0);

    let foundEndId: number | null = null;
    let iterations = 0;

    while (openHeap.size() > 0) {
        iterations++;
        if (iterations > maxIterations) return null;

        const currentId = openHeap.pop();
        if (currentId === undefined) break;

        if (cache_visited[currentId] === 1) continue;
        cache_visited[currentId] = 1;

        if (possibleEnds.has(currentId)) {
            foundEndId = currentId;
            break;
        }

        const currentG = cache_costs[currentId]!;
        const neighbors = adjacency.get(currentId);
        if (!neighbors) continue;

        const cLng = flatCoords[currentId * 2]!;
        const cLat = flatCoords[currentId * 2 + 1]!;
        const prevId = cache_previous[currentId]!;

        for (let i = 0; i < neighbors.length; i++) {
            const edge = neighbors[i]!;

            // DLC Check
            const dlcId = edge.dlc || 0;
            if (dlcId !== 0 && !ownedDlcs.includes(dlcId)) {
                continue;
            }

            const neighborId = edge.to;
            if (cache_visited[neighborId] === 1) continue;

            let stepCost = edge.weight || 1;

            const nLng = flatCoords[neighborId * 2]!;
            const nLat = flatCoords[neighborId * 2 + 1]!;

            if (currentId === start && startHeading !== null) {
                if (startType === "yard") {
                    stepCost += 10;
                    const dir = getBearing([cLng, cLat], [nLng, nLat]);
                    const diff = getAngleDiff(startHeading, dir);
                    if (diff > 75) stepCost += 10_000_000;
                    else if (diff > 45) stepCost += 1000;
                } else {
                    const dir = getBearing([cLng, cLat], [nLng, nLat]);
                    const diff = getAngleDiff(startHeading, dir);
                    if (diff > 75) stepCost += 10_000_000;
                    else if (diff > 45) stepCost += 1000;
                }
            } else if (prevId !== -1) {
                let pLng = flatCoords[prevId * 2]!;
                let pLat = flatCoords[prevId * 2 + 1]!;

                const angle = getSignedAngle(
                    [pLng, pLat],
                    [cLng, cLat],
                    [nLng, nLat],
                );
                const absAngle = Math.abs(angle);

                if (edge.r === 2) {
                    stepCost *= 1.1;
                    if (angle < -105) stepCost += 100_000;
                }

                if (edge.r !== 4) {
                    if (absAngle > 105) {
                        stepCost += Infinity;
                    } else if (angle < -45) {
                        stepCost += 2000;
                    } else if (angle > 45) {
                        stepCost += 500;
                    } else if (absAngle > 10) {
                        stepCost += 50;
                    }

                    let tempPrev = prevId;
                    let traveledDist = 0;
                    let maxSingleTurn = 0;

                    const currentHeading = getHeading(cLng, cLat, nLng, nLat);
                    let lastSegHeading = currentHeading;
                    let uTurnDist = -1;

                    for (let k = 0; k < 30; k++) {
                        const grandPrev = cache_previous[tempPrev]!;
                        if (grandPrev === -1) break;

                        const tLng = flatCoords[tempPrev * 2]!;
                        const tLat = flatCoords[tempPrev * 2 + 1]!;
                        const gLng = flatCoords[grandPrev * 2]!;
                        const gLat = flatCoords[grandPrev * 2 + 1]!;

                        const segDist = fastDistKm(gLng, gLat, tLng, tLat);
                        traveledDist += segDist;

                        // Calculate heading of this historical segment
                        const histHeading = getHeading(gLng, gLat, tLng, tLat);

                        // Track the sharpest individual corner
                        const turnAngle = getRadianAngleDiff(
                            histHeading,
                            lastSegHeading,
                        );
                        if (turnAngle > maxSingleTurn) {
                            maxSingleTurn = turnAngle;
                        }

                        lastSegHeading = histHeading;

                        // Check how much the overall heading has changed from the past to the future
                        const diff = getRadianAngleDiff(
                            histHeading,
                            currentHeading,
                        );

                        // If we flipped ~160+ degrees (2.8 rad) AND havent recorded it yet
                        if (diff > 2.8 && uTurnDist === -1) {
                            uTurnDist = traveledDist;
                        }

                        // Looking back a certain distance
                        if (traveledDist > 0.4) {
                            break;
                        }

                        tempPrev = grandPrev;
                    }

                    if (uTurnDist !== -1) {
                        if (maxSingleTurn > 1.2) {
                            stepCost += Infinity;
                        } else if (uTurnDist < 0.05) {
                            stepCost += Infinity;
                        }
                    }
                }
            }

            if (stepCost < 1) stepCost = 1;
            const tentativeG = currentG + stepCost;

            if (tentativeG < cache_costs[neighborId]!) {
                cache_previous[neighborId] = currentId;
                cache_costs[neighborId] = tentativeG;
                openHeap.push(
                    neighborId,
                    tentativeG + getHeuristic(neighborId),
                );
            }
        }
    }

    if (foundEndId === null) return null;

    const path: [number, number][] = [];
    let curr: number = foundEndId;

    while (curr !== -1) {
        path.unshift([flatCoords[curr * 2]!, flatCoords[curr * 2 + 1]!]);
        curr = cache_previous[curr]!;
        if (path.length > 20000) break;
    }

    return { path, endId: foundEndId };
};

export const mergeClosePoints = (
    coords: [number, number][],
    minDistanceMeters = 5,
): [number, number][] => {
    if (coords.length < 2) return coords;
    const result: [number, number][] = [];
    let i = 0;
    while (i < coords.length) {
        const current = coords[i]!;
        if (i === coords.length - 1) {
            result.push(current);
            break;
        }
        const next = coords[i + 1]!;
        const d = fastDistKm(current[0], current[1], next[0], next[1]) * 1000;

        if (d < minDistanceMeters) {
            const midPoint: [number, number] = [
                (current[0] + next[0]) / 2,
                (current[1] + next[1]) / 2,
            ];
            result.push(midPoint);
            i += 2;
        } else {
            result.push(current);
            i++;
        }
    }
    if (result.length < 2) result.push(coords[coords.length - 1]!);
    return result;
};

export function smoothPath(coords: [number, number][]): [number, number][] {
    const len = coords.length;
    if (len < 3) return coords;

    const output = new Array((len - 1) * 2 + 2);

    output[0] = coords[0];

    let outIdx = 1;

    for (let i = 0; i < len - 1; i++) {
        const p0 = coords[i]!;
        const p1 = coords[i + 1]!;

        output[outIdx++] = [
            0.75 * p0[0] + 0.25 * p1[0],
            0.75 * p0[1] + 0.25 * p1[1],
        ];

        output[outIdx++] = [
            0.25 * p0[0] + 0.75 * p1[0],
            0.25 * p0[1] + 0.75 * p1[1],
        ];
    }

    output[outIdx] = coords[len - 1];

    return output;
}

export function buildRouteStatsCache(
    pathCoords: [number, number][],
    cities: SimpleCityNode[] | null,
    selectedGame: GameType,
    sdkScale: number = 0,
    avgSpeed: number,
) {
    const cache = new Float32Array(pathCoords.length * 2);
    const isAts = selectedGame === "ats";
    const highwayScale = isAts ? 20 : 19;

    const baseHighway = isAts ? 105 : 82;
    const highwaySpeed =
        avgSpeed > 40 ? avgSpeed * 0.7 + baseHighway * 0.3 : baseHighway;

    const baseCity = isAts ? 40 : 32;
    const citySpeed =
        avgSpeed > 40
            ? avgSpeed * 0.4 + baseCity * 0.6 // Cities are always slower
            : baseCity;

    const speeds = { highway: highwaySpeed, city: citySpeed };

    const gamePoints = pathCoords.map((p) =>
        isAts ? convertGeoToAts(p[0], p[1]) : convertGeoToEts2(p[0], p[1]),
    );

    let totalKm = 0;
    let totalHours = 0;

    cache[0] = 0; // km
    cache[1] = 0; // hours

    for (let i = 0; i < pathCoords.length - 1; i++) {
        const [x1, z1] = gamePoints[i]!;
        const [x2, z2] = gamePoints[i + 1]!;

        const dx = x2 - x1;
        const dz = z2 - z1;
        const rawLength = Math.sqrt(dx * dx + dz * dz);

        let multiplier = getScaleMultiplier(
            (x1 + x2) / 2,
            (z1 + z2) / 2,
            cities,
            selectedGame,
        );

        if (i < 5 && sdkScale > 0) {
            multiplier = sdkScale;
        } else if (multiplier !== 3) {
            multiplier = highwayScale;
        }

        const segmentKm = (rawLength * multiplier) / 1000;
        const segmentSpeed = multiplier === 3 ? speeds.city : speeds.highway;

        totalKm += segmentKm;
        totalHours += segmentKm / segmentSpeed;

        const idx = (i + 1) * 2;
        cache[idx] = totalKm;
        cache[idx + 1] = totalHours;
    }

    return cache;
}
