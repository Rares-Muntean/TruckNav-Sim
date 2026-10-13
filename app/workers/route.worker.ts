let adjacency: Map<number, RoadEdge[]> | null = null;
let nodeCoordsF64: Float64Array | null = null;
let nodeCoordsMapInstance: TypedNodeCoordsMap | null = null;

import {
    calculateRoute,
    type WorkerCityArea,
} from "~/assets/utils/routing/algorithm";
import {
    buildDisplayCoordinatesForNodes,
    executeMultiRoute,
    finalizeAndSendRouteResult,
} from "~/assets/utils/routing/routeExecution";
import { TypedNodeCoordsMap } from "~/assets/utils/routing/TypedNodeCoordsMap";
import type { MapScaleConfig } from "~/composables/CityData";
import type { CalcMultiRoutePayload, RoadEdge } from "~/types";

let cityNodes: WorkerCityArea[] | null = null;
let geometryF32: Float32Array | null = null;
let workerScaleConfig: MapScaleConfig = {
    ruralScale: 19,
    urbanScale: 3,
    hasUkRule: true,
};

self.onmessage = async (e: MessageEvent) => {
    const { type, payload } = e.data;

    if (type === "INIT_GRAPH") {
        try {
            const {
                nodesCoordsBuffer,
                graphBuffer,
                geometryBuffer,
                cities,
                scaleConfig,
            } = payload;

            geometryF32 = new Float32Array(geometryBuffer);
            const graphF32 = new Float32Array(graphBuffer);

            nodeCoordsF64 = new Float64Array(nodesCoordsBuffer);
            nodeCoordsMapInstance = new TypedNodeCoordsMap(nodeCoordsF64);

            adjacency = new Map();
            if (cities) cityNodes = cities;
            if (scaleConfig) workerScaleConfig = scaleConfig;

            for (let i = 0; i < graphF32.length; i += 12) {
                const u = graphF32[i]!;
                const v = graphF32[i + 1]!;
                const w = graphF32[i + 2]!;
                const hIn = graphF32[i + 3]!;
                const hOut = graphF32[i + 4]!;
                const isFerry = graphF32[i + 5] === 1;
                const requiredDlc = graphF32[i + 6];
                const vPrefabId = graphF32[i + 7];
                const startIndex = graphF32[i + 8]!;
                const pointCount = graphF32[i + 9]!;
                const maneuverType = graphF32[i + 10]!;
                const exitNumber = graphF32[i + 11]!;

                if (!adjacency.has(u)) adjacency.set(u, []);
                adjacency.get(u)!.push({
                    to: v,
                    weight: w,
                    hIn,
                    hOut,
                    isFerry,
                    requiredDlc,
                    vPrefabId,
                    startIndex,
                    pointCount,
                    maneuverType,
                    exitNumber,
                });
            }
            self.postMessage({ type: "READY" });
        } catch (err) {
            console.error("Error during INIT_GRAPH inside worker:", err);
        }
    }

    if (type === "CALC_ROUTE") {
        try {
            if (!adjacency || !nodeCoordsMapInstance || !geometryF32) {
                self.postMessage({ type: "RESULT", payload: null });
                return;
            }

            const {
                startId,
                possibleEnds,
                heading,
                startType,
                targetCoords,
                ownedDlcs,
                selectedGame,
                sdkScale,
                avgSpeed,
            } = payload;

            const result = calculateRoute(
                startId,
                new Set(possibleEnds),
                heading,
                adjacency,
                nodeCoordsMapInstance as any,
                startType,
                ownedDlcs,
                targetCoords,
            );

            if (!result || !result.path || !result.nodeSequence) {
                self.postMessage({ type: "RESULT", payload: null });
                return;
            }

            const rawDisplayPath = buildDisplayCoordinatesForNodes(
                adjacency,
                geometryF32,
                result.nodeSequence,
                result.path,
            );

            finalizeAndSendRouteResult({
                rawCoordinates: rawDisplayPath,
                nodeSequence: result.nodeSequence,
                cityNodes,
                selectedGame,
                sdkScale,
                avgSpeed,
                scaleConfig: workerScaleConfig,
                adjacency,
                nodeCoordsMap: nodeCoordsMapInstance,
            });
        } catch (error) {
            console.error("Web Worker calculation crash caught:", error);
            self.postMessage({ type: "RESULT", payload: null });
        }
    }

    if (type === "CALC_MULTI_ROUTE") {
        try {
            if (!adjacency || !nodeCoordsMapInstance || !geometryF32) {
                self.postMessage({ type: "RESULT", payload: null });
                return;
            }

            const multiResult = executeMultiRoute(
                payload as CalcMultiRoutePayload,
                adjacency,
                nodeCoordsMapInstance,
                geometryF32,
            );

            if (!multiResult) {
                self.postMessage({ type: "RESULT", payload: null });
                return;
            }

            const { selectedGame, sdkScale, avgSpeed } =
                payload as CalcMultiRoutePayload;

            finalizeAndSendRouteResult({
                rawCoordinates: multiResult.combinedPathCoords,
                nodeSequence: multiResult.combinedNodeSequence,
                snappedNodeIds: multiResult.snappedNodeIds,
                skippedWaypoints: multiResult.skippedWaypointIndices,
                cityNodes,
                selectedGame,
                sdkScale,
                avgSpeed,
                scaleConfig: workerScaleConfig,
                adjacency,
                nodeCoordsMap: nodeCoordsMapInstance,
            });
        } catch (error) {
            console.error("Multi-routing worker error:", error);
            self.postMessage({ type: "RESULT", payload: null });
        }
    }
};
