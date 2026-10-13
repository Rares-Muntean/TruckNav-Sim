import type { CalcMultiRoutePayload, RoadEdge, TripSegment } from "~/types";
import { getRadianAngleDiff, radianToCompassDegrees } from "../map/maths";
import type { TypedNodeCoordsMap } from "./TypedNodeCoordsMap";
import { calculateRoute } from "./algorithm";
import {
    buildRouteStatsCache,
    simplifyPath,
    smoothPath,
    type WorkerCityArea,
} from "./routeStats";

const MAX_ALLOWED_TURN_ANGLE_RAD = 2.4;

export function getRoadBetweenNodes(
    adjacency: Map<number, RoadEdge[]>,
    fromNodeId: number,
    toNodeId: number,
): RoadEdge | undefined {
    const upcomingRoads = adjacency.get(fromNodeId);
    return upcomingRoads?.find((r) => r.to === toNodeId);
}

/**
 * Checks for illegal U-turns by calculating the angle difference between the
 * current road edge and the upcoming edges along the path.
 *
 * @param adjacency - Road network graph mapping node IDs to their outgoing edges.
 * @param incomingHeadingRad - Initial heading angle in radians entering this segment.
 * @param nodeSequence - Ordered list of node IDs that forms the route segment.
 * @returns True if any turn exeeds the maximum turn thershold, false otherwise
 */
export function routeHasIllegalUTurn(
    adjacency: Map<number, RoadEdge[]>,
    incomingHeadingRad: number | undefined,
    nodeSequence: number[],
): boolean {
    let currentHeading = incomingHeadingRad;

    for (let i = 0; i < nodeSequence.length - 1; i++) {
        const fromNode = nodeSequence[i]!;
        const toNode = nodeSequence[i + 1]!;
        const road = getRoadBetweenNodes(adjacency, fromNode, toNode);

        if (!road) continue;

        if (
            currentHeading !== undefined &&
            road.hOut !== undefined &&
            getRadianAngleDiff(currentHeading, road.hOut) >
                MAX_ALLOWED_TURN_ANGLE_RAD
        ) {
            return true;
        }

        currentHeading = road.hIn;
    }

    return false;
}

export function buildDisplayCoordinatesForNodes(
    adjacency: Map<number, RoadEdge[]>,
    geometryF32: Float32Array | null,
    nodeSequence: number[],
    fallbackPath: [number, number][],
): [number, number][] {
    if (!geometryF32) return fallbackPath;

    const visualCoordinates: [number, number][] = [];

    for (let i = 0; i < nodeSequence.length - 1; i++) {
        const fromNode = nodeSequence[i]!;
        const toNode = nodeSequence[i + 1]!;
        const road = getRoadBetweenNodes(adjacency, fromNode, toNode);

        if (road && road.startIndex !== undefined) {
            for (let p = 0; p < road.pointCount; p++) {
                const lng = geometryF32[road.startIndex + p * 2]!;
                const lat = geometryF32[road.startIndex + p * 2 + 1]!;

                const lastPoint =
                    visualCoordinates[visualCoordinates.length - 1];
                if (lastPoint && lastPoint[0] === lng && lastPoint[1] === lat) {
                    continue;
                }

                visualCoordinates.push([lng, lat]);
            }
        } else if (fallbackPath[i]) {
            visualCoordinates.push(fallbackPath[i]!);
        }
    }

    return visualCoordinates;
}

/**
 * Calculates a single segment of a multi-stop trip between two waypoints,
 * resolving both the node path and the visual road coordinates.
 *
 * @param adjacency - Road network graph mapping node IDs to their outgoing edges.
 * @param nodeCoordsMapInstance - Fast lookup wrapper for node [lng, lat] coordinates along the path.
 * @param geometryF32 - Raw binary buffer holding curved road geometry points for visuals.
 * @param fromNodeId - Graph node ID where this segment starts.
 * @param fromHeading - Starting heading angle of the truck.
 * @param fromType  - Starting position ("road" or "yard").
 * @param candidateEndNodes - List of potential graph node IDs near the target waypoint.
 * @param targetCoords - Geographic [lng, lat] coordinates of the target waypoint.
 * @param ownedDlcs - Array of owned DLC IDs allowed for routing.
 * @returns A `TripSegment` object with path data and arrival headings, or `null` if unreachable
 */
export function calculateSingleTripSegment(
    adjacency: Map<number, RoadEdge[]>,
    nodeCoordsMapInstance: TypedNodeCoordsMap,
    geometryF32: Float32Array | null,
    fromNodeId: number,
    fromHeading: number,
    fromType: "road" | "yard",
    candidateEndNodes: number[],
    targetCoords: [number, number],
    ownedDlcs: number[],
): TripSegment | null {
    const result = calculateRoute(
        fromNodeId,
        new Set<number>(candidateEndNodes),
        fromHeading,
        adjacency,
        nodeCoordsMapInstance as any,
        fromType,
        ownedDlcs,
        targetCoords,
    );

    if (!result) return null;

    const totalNodes = result.nodeSequence.length;
    const lastRoad =
        totalNodes >= 2
            ? getRoadBetweenNodes(
                  adjacency,
                  result.nodeSequence[totalNodes - 2]!,
                  result.nodeSequence[totalNodes - 1]!,
              )
            : undefined;

    return {
        startNodeId: fromNodeId,
        startHeading: fromHeading,
        startType: fromType,
        nodeSequence: result.nodeSequence,
        displayCoordinates: buildDisplayCoordinatesForNodes(
            adjacency,
            geometryF32,
            result.nodeSequence,
            result.path as [number, number][],
        ),
        endNodeId: result.endId,
        arrivalHeadingRad: lastRoad?.hIn,
        arrivalCompassDegrees: lastRoad
            ? radianToCompassDegrees(lastRoad.hIn)
            : 0,
    };
}

/**
 * Executes a multi-stop route across all waypoints, stitching individual
 * segments together and automatically skipping any intermediate stops that
 * have illegal U-turns.
 *
 * @param payload - Multi-route parameters containing start position, waypoints, and game settings.
 * @param adjacency - Road network graph mapping node IDs to their outgoing edges.
 * @param nodeCoordsMapInstance - Fast lookup wrapper for node [lng, lat] coordinates along the path.
 * @param geometryF32 - Raw binary buffer holding curved road geometry points for visuals.
 * @returns Combined node sequence, complete visual path coordinates, snapped target coords,
 * and a list of skipped waypoint indices, or `null` if copmletely unreachable.
 */
export function executeMultiRoute(
    payload: CalcMultiRoutePayload,
    adjacency: Map<number, RoadEdge[]>,
    nodeCoordsMapInstance: TypedNodeCoordsMap,
    geometryF32: Float32Array | null,
): {
    combinedNodeSequence: number[];
    combinedPathCoords: [number, number][];
    snappedNodeIds: number[];
    skippedWaypointIndices: number[];
} | null {
    const {
        startId,
        waypointsCoords,
        waypointsNodeGroups,
        heading,
        startType,
        ownedDlcs,
    } = payload;

    const finishedSegments: TripSegment[] = [];
    const waypointIndicesForSegments: number[] = [];
    const skippedWaypointIndices: number[] = [];

    let currentStartId = startId;
    let currentStartHeading = heading;
    let currentStartType = startType;

    for (let i = 0; i < waypointsNodeGroups.length; i++) {
        let currentSegment = calculateSingleTripSegment(
            adjacency,
            nodeCoordsMapInstance,
            geometryF32,
            currentStartId,
            currentStartHeading,
            currentStartType,
            waypointsNodeGroups[i]!,
            waypointsCoords[i]!,
            ownedDlcs,
        );

        if (!currentSegment) return null;

        const previousSegment = finishedSegments[finishedSegments.length - 1];

        if (
            previousSegment &&
            routeHasIllegalUTurn(
                adjacency,
                previousSegment.arrivalHeadingRad,
                currentSegment.nodeSequence,
            )
        ) {
            const directSegmentWithoutBadWaypoint = calculateSingleTripSegment(
                adjacency,
                nodeCoordsMapInstance,
                geometryF32,
                previousSegment.startNodeId,
                previousSegment.startHeading,
                previousSegment.startType,
                waypointsNodeGroups[i]!,
                waypointsCoords[i]!,
                ownedDlcs,
            );

            const segmentBeforePrevious =
                finishedSegments[finishedSegments.length - 2];

            if (
                directSegmentWithoutBadWaypoint &&
                !routeHasIllegalUTurn(
                    adjacency,
                    segmentBeforePrevious?.arrivalHeadingRad,
                    directSegmentWithoutBadWaypoint.nodeSequence,
                )
            ) {
                finishedSegments.pop();
                const badWaypointIndex = waypointIndicesForSegments.pop()!;
                skippedWaypointIndices.push(badWaypointIndex);

                currentSegment = directSegmentWithoutBadWaypoint;
            }
        }

        finishedSegments.push(currentSegment);
        waypointIndicesForSegments.push(i);

        currentStartId = currentSegment.endNodeId;
        currentStartHeading = currentSegment.arrivalCompassDegrees;
        currentStartType = "road";
    }

    const combinedNodeSequence: number[] = [];
    const combinedPathCoords: [number, number][] = [];
    const snappedNodeIds: number[] = [];

    for (const segment of finishedSegments) {
        snappedNodeIds.push(segment.endNodeId);

        if (combinedNodeSequence.length > 0) {
            combinedNodeSequence.pop();
        }

        combinedNodeSequence.push(...segment.nodeSequence);
        combinedPathCoords.push(...segment.displayCoordinates);
    }

    return {
        combinedNodeSequence,
        combinedPathCoords,
        snappedNodeIds,
        skippedWaypointIndices,
    };
}

export interface FinalizeRouteParams {
    rawCoordinates: [number, number][];
    nodeSequence: number[];
    snappedNodeIds?: number[];
    skippedWaypoints?: number[];
    cityNodes: WorkerCityArea[] | null;
    selectedGame: "ets2" | "ats";
    sdkScale: number;
    avgSpeed: number;
    scaleConfig: MapScaleConfig;
    adjacency: Map<number, RoadEdge[]>;
    nodeCoordsMap: TypedNodeCoordsMap;
}

/**
 * Processes the raw route geometry (simplification, smoothing, distance/ETA caching,
 * turn maneuver extraction) and transfers the final binary result to the main thread.
 *
 * @param params - Route parameters containing raw coordinates, node sequence, scale settings,
 * and graph lookup references required for processing.
 */
export function finalizeAndSendRouteResult(params: FinalizeRouteParams) {
    const {
        rawCoordinates,
        nodeSequence,
        snappedNodeIds,
        skippedWaypoints,
        cityNodes,
        selectedGame,
        sdkScale,
        avgSpeed,
        scaleConfig,
        adjacency,
        nodeCoordsMap,
    } = params;

    const simplified = simplifyPath(rawCoordinates, 0.00003);
    const finalSmoothedPath = smoothPath(simplified, 4);

    const statsCache = buildRouteStatsCache(
        finalSmoothedPath,
        cityNodes,
        selectedGame,
        sdkScale,
        avgSpeed,
        scaleConfig,
    );

    const nodeKms = new Float32Array(nodeSequence.length);
    for (let i = 0; i < nodeSequence.length; i++) {
        const nodePosition = nodeCoordsMap.get(nodeSequence[i]!);
        if (!nodePosition) continue;

        let minDistSq = Infinity;
        let bestIdx = 0;
        for (let j = 0; j < finalSmoothedPath.length; j++) {
            const point = finalSmoothedPath[j]!;
            const distSq =
                Math.pow(point[0] - nodePosition[0], 2) +
                Math.pow(point[1] - nodePosition[1], 2);

            if (distSq < minDistSq) {
                minDistSq = distSq;
                bestIdx = j;
            }
        }
        nodeKms[i] = statsCache[bestIdx * 3]!;
    }

    const sequenceManeuvers = new Int8Array(nodeSequence.length);
    const sequenceExits = new Int8Array(nodeSequence.length);

    for (let i = 0; i < nodeSequence.length - 1; i++) {
        const u = nodeSequence[i]!;
        const v = nodeSequence[i + 1]!;
        const road = adjacency.get(u)?.find((edge) => edge.to === v);

        let maneuverType = road ? road.maneuverType || 0 : 0;
        let exitNum = road ? road.exitNumber || 0 : 0;

        if (maneuverType === 3 && exitNum === -3) exitNum = 1;

        sequenceManeuvers[i] = maneuverType;
        sequenceExits[i] = exitNum;
    }

    self.postMessage(
        {
            type: "RESULT",
            payload: {
                nodeSequence,
                displayPath: finalSmoothedPath,
                stats: statsCache,
                nodeKms,
                sequenceManeuvers,
                sequenceExits,
                snappedNodeIds: snappedNodeIds || [],
                skippedWaypoints: skippedWaypoints || [],
                endId: nodeSequence[nodeSequence.length - 1],
            },
        },
        [
            statsCache.buffer,
            nodeKms.buffer,
            sequenceManeuvers.buffer,
            sequenceExits.buffer,
        ],
    );
}
