import { MinHeap } from "~/assets/utils/routing/MinHeap";
import { getBearing, getAngleDiff } from "~/assets/utils/map/maths";

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

const U_TURN_PENALTY = 100_000_000;
function calculateTurnPenalty(
    currentArrivalHeading: number,
    edge: any,
    currentEdgeId: number,
    startEdgeId: number,
    startHeading: number | null,
    startType: "road" | "yard",
    currentLng: number,
    currentLat: number,
    nextLng: number,
    nextLat: number,
) {
    if (currentEdgeId === startEdgeId && startHeading !== null) {
        const roadBearing = getBearing(
            [currentLng, currentLat],
            [nextLng, nextLat],
        );
        const angleDiff = Math.abs(getAngleDiff(startHeading, roadBearing));

        if (angleDiff > 75) return U_TURN_PENALTY;
        if (angleDiff > 45) return 1000;
        return startType === "yard" ? 10 : 0;
    }

    if (currentEdgeId !== startEdgeId && edge.hOut !== undefined) {
        let angleDiff = Math.abs(currentArrivalHeading - edge.hOut);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

        if (edge.maneuverType === 3) {
            return angleDiff > 1.0 ? 50 : 0;
        }

        if (angleDiff > 2.8) return U_TURN_PENALTY;
        if (angleDiff > 1.5) return 10_000;
        if (angleDiff > 1.0) return 1000;
        if (angleDiff > 0.4) return 500;
    }

    return 0;
}

function reconstructPath(
    foundEndEdgeId: number,
    startNodeId: number,
    startEdgeId: number,
    flatCoords: Float64Array,
) {
    const path: [number, number][] = [];
    const nodeSequence: number[] = [];
    let currEdgeId = foundEndEdgeId;

    while (currEdgeId !== startEdgeId && currEdgeId !== -1) {
        const nodeId = edge_target[currEdgeId]!;
        path.unshift([flatCoords[nodeId * 2]!, flatCoords[nodeId * 2 + 1]!]);
        nodeSequence.unshift(nodeId);
        currEdgeId = cache_previous[currEdgeId]!;
        if (path.length > 20000) break;
    }

    path.unshift([
        flatCoords[startNodeId * 2]!,
        flatCoords[startNodeId * 2 + 1]!,
    ]);
    nodeSequence.unshift(startNodeId);

    return {
        path,
        nodeSequence,
        endId: nodeSequence[nodeSequence.length - 1]!,
    };
}

/**
 * Computes the optimal path from a starting node to any of the candidate target nodes
 *  using an edge-expanded A* search with heading alignment and turn penatlies.
 *
 * @param start - Starting graph node ID (where the truck or segment begins).
 * @param possibleEnds - Set of acceptable target graph node Ids near the destination.
 * @param startHeading - Initial compass heading of the truck to prevent starting in reverse.
 * @param adjacency - Graph road network mapping node IDs to outgoing edges.
 * @param nodeCoords - Node coordinate lookup mapping node IDs to [lng, lat].
 * @param startType - Starting road: "road" (strict angles) or "yard" (relaxed depot turns).
 * @param ownedDlcs - Array of owned DLC IDs used to filter out innacessible map areas.
 * @param targetLocation - Optional exact [lng, lat] coordinates of the destination.
 * @returns Object containing the path coordinates, node sequence, and final end node ID, or `null` if unreachable.
 */
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
                const nLng = flatCoords[neighborNodeId * 2]!;
                const nLat = flatCoords[neighborNodeId * 2 + 1]!;

                stepCost += calculateTurnPenalty(
                    currentArrivalHeading!,
                    edge,
                    currentEdgeId,
                    START_EDGE_ID,
                    startHeading,
                    startType,
                    cLng,
                    cLat,
                    nLng,
                    nLat,
                );
            }

            const tentativeG = currentG + Math.max(1, stepCost);

            if (tentativeG < cache_costs[neighborEdgeId]!) {
                cache_previous[neighborEdgeId] = currentEdgeId;
                cache_costs[neighborEdgeId] = tentativeG;
                cache_is_ferry[neighborEdgeId] = edge.isFerry
                    ? 5
                    : Math.max(0, ferryGraceCounter! - 1);

                openHeap.push(
                    neighborEdgeId,
                    tentativeG + getHeuristic(neighborNodeId),
                );
            }
        }
    }

    if (foundEndEdgeId === null) return null;

    return reconstructPath(foundEndEdgeId, start, START_EDGE_ID, flatCoords);
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
