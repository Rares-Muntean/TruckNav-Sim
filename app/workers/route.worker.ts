let adjacency: Map<number, RoadEdge[]> | null = null;
let nodeCoordsF64: Float64Array | null = null;
let nodeCoordsMapInstance: TypedNodeCoordsMap | null = null;

import {
    executeMultiRoute,
    finalizeAndSendRouteResult,
} from "~/assets/utils/routing/routeExecution";
import type { WorkerCityArea } from "~/assets/utils/routing/routeStats";
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
    const { type, requestId, payload } = e.data;

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

            const isV2 = graphF32[0] === -2; // Checks if it's V2 (The version with the road tier property)
            const startOffset = isV2 ? 4 : 0;
            const stride = isV2 ? graphF32[2]! : 12;

            for (let i = startOffset; i < graphF32.length; i += stride) {
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
                const roadTier = isV2 ? graphF32[i + 12] ?? 0 : 0;

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
                    roadTier,
                });
            }
            self.postMessage({ type: "READY" });
        } catch (err) {
            console.error("Error during INIT_GRAPH inside worker:", err);
        }
    }

    if (type === "CALC_MULTI_ROUTE") {
        try {
            if (!adjacency || !nodeCoordsMapInstance || !geometryF32) {
                self.postMessage({ type: "RESULT", requestId, payload: null });
                return;
            }

            const multiResult = executeMultiRoute(
                payload as CalcMultiRoutePayload,
                adjacency,
                nodeCoordsMapInstance,
                geometryF32,
            );

            if (!multiResult) {
                self.postMessage({ type: "RESULT", requestId, payload: null });
                return;
            }

            const { selectedGame, sdkScale, avgSpeed, routeMode } =
                payload as CalcMultiRoutePayload;

            const isAts = selectedGame === "ats";
            let totalWeight = 0;
            let totalTime = 0;

            for (
                let i = 0;
                i < multiResult.combinedNodeSequence.length - 1;
                i++
            ) {
                const u = multiResult.combinedNodeSequence[i]!;
                const v = multiResult.combinedNodeSequence[i + 1]!;

                const road = adjacency.get(u)?.find((edge) => edge.to === v);
                if (!road) continue;

                let speed = isAts ? 60 : 48;
                if (road.isFerry) speed = 35;
                else if (road.roadTier === 3) speed = isAts ? 105 : 82;
                else if (road.roadTier === 2) speed = isAts ? 85 : 70;
                else if (road.roadTier === 1) speed = isAts ? 50 : 40;

                const w = road.weight || 1;
                totalTime += w / speed;
                totalWeight += w;
            }

            let baseRoadSpeed =
                totalTime > 0 ? totalWeight / totalTime : isAts ? 105 : 82;

            if (routeMode === "shortest") baseRoadSpeed *= 0.93;
            else if (routeMode === "scenic") baseRoadSpeed *= 0.86;

            finalizeAndSendRouteResult({
                rawCoordinates: multiResult.combinedPathCoords,
                nodeSequence: multiResult.combinedNodeSequence,
                snappedNodeIds: multiResult.snappedNodeIds,
                skippedWaypoints: multiResult.skippedWaypointIndices,
                cityNodes,
                selectedGame,
                sdkScale,
                avgSpeed,
                routeMode,
                scaleConfig: workerScaleConfig,
                adjacency,
                nodeCoordsMap: nodeCoordsMapInstance,
                requestId: requestId,
            });
        } catch (error) {
            console.error("Multi-routing worker error:", error);
            self.postMessage({ type: "RESULT", requestId, payload: null });
        }
    }
};
