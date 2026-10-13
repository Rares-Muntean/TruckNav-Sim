import { MinHeap } from "~/assets/utils/routing/MinHeap";
import { getBearing, getAngleDiff } from "~/assets/utils/map/maths";
import { convertGeoToAts, convertGeoToEts2 } from "../map/converters";
import type { GameType } from "~/types";
import type { MapScaleConfig } from "~/composables/CityData";

// Increased size to handle Directed Edges instead of Nodes
const MAX_EDGES = 4000000;

const cache_costs = new Float64Array(MAX_EDGES);
const cache_previous = new Int32Array(MAX_EDGES);
const cache_visited = new Uint8Array(MAX_EDGES);
const cache_is_ferry = new Uint8Array(MAX_EDGES);

const edge_target = new Int32Array(MAX_EDGES);
const edge_source = new Int32Array(MAX_EDGES);
const edge_hIn = new Float32Array(MAX_EDGES);

const openHeap = new MinHeap(50000);

let cache_flatCoords: Float64Array | null = null;
let isEdgesMapped = false;
let globalNextEdgeId = 0;

function ensureCoordCache(nodeCoords: Map<number, [number, number]>) {
    if (cache_flatCoords && cache_flatCoords.length > 0) return;

    cache_flatCoords = new Float64Array(900000 * 2);

    for (const [id, [lng, lat]] of nodeCoords) {
        if (id * 2 + 1 < cache_flatCoords.length) {
            cache_flatCoords[id * 2] = lng;
            cache_flatCoords[id * 2 + 1] = lat;
        }
    }
}

function ensureEdgesMapped(adjacency: Map<number, any[]>) {
    if (isEdgesMapped) return;
    globalNextEdgeId = 0;

    for (const [u, edges] of adjacency.entries()) {
        for (const edge of edges) {
            const eId = globalNextEdgeId++;
            edge.edgeId = eId;
            edge_target[eId] = edge.to;
            edge_source[eId] = u;
            edge_hIn[eId] = edge.hIn || 0;
        }
    }
    isEdgesMapped = true;
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

export const calculateRoute = (
    start: number,
    possibleEnds: Set<number | undefined>,
    startHeading: number | null,
    adjacency: Map<number, any[]>,
    nodeCoords: Map<number, [number, number]>,
    startType: "road" | "yard" = "road",
    ownedDlcs: number[],
    targetLocation?: [number, number],
): {
    path: [number, number][];
    nodeSequence: number[];
    endId: number;
} | null => {
    ensureCoordCache(nodeCoords);
    ensureEdgesMapped(adjacency);

    const flatCoords = cache_flatCoords!;

    const START_EDGE_ID = globalNextEdgeId;

    cache_costs.fill(Infinity, 0, START_EDGE_ID + 1);
    cache_previous.fill(-1, 0, START_EDGE_ID + 1);
    cache_visited.fill(0, 0, START_EDGE_ID + 1);
    cache_is_ferry.fill(0, 0, START_EDGE_ID + 1);

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

    const HEURISTIC_SCALE = 1.0;

    const getHeuristic = (id: number) => {
        const nLng = flatCoords[id * 2]!;
        const nLat = flatCoords[id * 2 + 1]!;
        const dx = nLng - destLng;
        const dy = nLat - destLat;
        return Math.sqrt(dx * dx + dy * dy) * 100 * HEURISTIC_SCALE;
    };

    cache_costs[START_EDGE_ID] = 0;
    openHeap.push(START_EDGE_ID, 0);

    let foundEndEdgeId: number | null = null;
    let iterations = 0;

    while (openHeap.size() > 0) {
        iterations++;
        if (iterations > maxIterations) return null;

        const currentEdgeId = openHeap.pop();
        if (currentEdgeId === undefined) break;

        if (cache_visited[currentEdgeId] === 1) continue;
        cache_visited[currentEdgeId] = 1;

        const currentId =
            currentEdgeId === START_EDGE_ID
                ? start
                : edge_target[currentEdgeId]!;

        if (possibleEnds.has(currentId)) {
            foundEndEdgeId = currentEdgeId;
            break;
        }

        const currentArrivalHeading =
            currentEdgeId === START_EDGE_ID ? 0 : edge_hIn[currentEdgeId];
        const prevId =
            currentEdgeId === START_EDGE_ID ? -1 : edge_source[currentEdgeId];
        const currentG = cache_costs[currentEdgeId]!;

        const neighbors = adjacency.get(currentId);
        if (!neighbors) continue;

        const cLng = flatCoords[currentId * 2]!;
        const cLat = flatCoords[currentId * 2 + 1]!;
        const ferryGraceCounter = cache_is_ferry[currentEdgeId];

        for (let i = 0; i < neighbors.length; i++) {
            const edge = neighbors[i]!;
            const neighborEdgeId = edge.edgeId;

            // DLC Check
            const dlcId = edge.requiredDlc || 0;
            if (dlcId !== 0 && !ownedDlcs.includes(dlcId)) continue;

            if (cache_visited[neighborEdgeId] === 1) continue;

            const neighborNodeId = edge.to;

            if (prevId !== -1 && neighborNodeId === prevId) {
                continue;
            }

            let stepCost = edge.weight || 1;

            if (!edge.isFerry && ferryGraceCounter === 0) {
                if (currentEdgeId === START_EDGE_ID && startHeading !== null) {
                    const nLng = flatCoords[neighborNodeId * 2]!;
                    const nLat = flatCoords[neighborNodeId * 2 + 1]!;
                    const dir = getBearing([cLng, cLat], [nLng, nLat]);
                    const diff = Math.abs(getAngleDiff(startHeading, dir));

                    if (startType === "yard") {
                        stepCost += 10;
                        if (diff > 75) stepCost += 10_000_000;
                        else if (diff > 45) stepCost += 1000;
                    } else {
                        if (diff > 75) stepCost += 10_000_000;
                        else if (diff > 45) stepCost += 1000;
                    }
                } else if (
                    currentEdgeId !== START_EDGE_ID &&
                    edge.hOut !== undefined
                ) {
                    let diff = Math.abs(currentArrivalHeading! - edge.hOut);
                    if (diff > Math.PI) diff = 2 * Math.PI - diff;

                    if (edge.maneuverType === 3) {
                        if (diff > 1.0) stepCost += 50;
                    } else {
                        if (diff > 2.8) stepCost += 100_000_000;
                        else if (diff > 1.5) stepCost += 10_000;
                        else if (diff > 1.0) stepCost += 1000;
                        else if (diff > 0.4) stepCost += 500;
                    }
                }
            }

            if (stepCost < 1) stepCost = 1;
            const tentativeG = currentG + stepCost;

            if (tentativeG < cache_costs[neighborEdgeId]!) {
                cache_previous[neighborEdgeId] = currentEdgeId;
                cache_costs[neighborEdgeId] = tentativeG;

                if (edge.isFerry) {
                    cache_is_ferry[neighborEdgeId] = 5;
                } else {
                    cache_is_ferry[neighborEdgeId] = Math.max(
                        0,
                        ferryGraceCounter! - 1,
                    );
                }

                openHeap.push(
                    neighborEdgeId,
                    tentativeG + getHeuristic(neighborNodeId),
                );
            }
        }
    }

    if (foundEndEdgeId === null) return null;

    const path: [number, number][] = [];
    const nodeSequence: number[] = [];
    let currEdgeId: number = foundEndEdgeId;

    while (currEdgeId !== START_EDGE_ID && currEdgeId !== -1) {
        const cId = edge_target[currEdgeId]!;
        path.unshift([flatCoords[cId * 2]!, flatCoords[cId * 2 + 1]!]);
        nodeSequence.unshift(cId);
        currEdgeId = cache_previous[currEdgeId]!;
        if (path.length > 20000) break;
    }

    path.unshift([flatCoords[start * 2]!, flatCoords[start * 2 + 1]!]);
    nodeSequence.unshift(start);

    return {
        path,
        nodeSequence,
        endId: nodeSequence[nodeSequence.length - 1]!,
    };
};

export const mergeClosePoints = (
    coords: [number, number][],
    minDistanceMeters = 8,
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
