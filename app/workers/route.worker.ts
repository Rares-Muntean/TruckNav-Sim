let adjacency: Map<number, any[]> | null = null;
let nodeCoords: Map<number, [number, number]> | null = null;

import {
    buildRouteStatsCache,
    calculateRoute,
    type WorkerCityArea,
    simplifyPath,
    smoothPath,
} from "~/assets/utils/routing/algorithm";

let cityNodes: WorkerCityArea[] | null = null;
let geometryF32: Float32Array | null = null;

self.onmessage = async (e: MessageEvent) => {
    const { type, payload } = e.data;

    if (type === "INIT_GRAPH") {
        const { nodes, graphBuffer, geometryBuffer, cities } = payload;

        geometryF32 = new Float32Array(geometryBuffer);
        const graphF32 = new Float32Array(graphBuffer);

        nodeCoords = new Map(nodes);
        adjacency = new Map();
        if (cities) cityNodes = cities;

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
    }

    if (type === "CALC_ROUTE") {
        if (!adjacency || !nodeCoords || !geometryF32) return;

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
            nodeCoords,
            startType,
            ownedDlcs,
            targetCoords,
        );

        if (result && result.path && result.nodeSequence) {
            let fullPath = [...result.path];
            let rawDisplayPath: [number, number][] = [];

            // Map exact node indices to the raw path
            const nodeIndices = new Int32Array(result.nodeSequence.length);

            for (let i = 0; i < result.nodeSequence.length - 1; i++) {
                nodeIndices[i] = rawDisplayPath.length;
                const u = result.nodeSequence[i]!;
                const v = result.nodeSequence[i + 1]!;

                const edge = adjacency.get(u)?.find((e) => e.to === v);

                if (edge && edge.startIndex !== undefined) {
                    for (let p = 0; p < edge.pointCount; p++) {
                        const lng = geometryF32[edge.startIndex + p * 2]!;
                        const lat = geometryF32[edge.startIndex + p * 2 + 1]!;
                        if (
                            rawDisplayPath.length > 0 &&
                            rawDisplayPath[rawDisplayPath.length - 1]![0] ===
                                lng &&
                            rawDisplayPath[rawDisplayPath.length - 1]![1] ===
                                lat
                        )
                            continue;
                        rawDisplayPath.push([lng, lat]);
                    }
                } else {
                    rawDisplayPath.push(fullPath[i]!);
                }
            }
            nodeIndices[result.nodeSequence.length - 1] = rawDisplayPath.length;
            rawDisplayPath.push(fullPath[fullPath.length - 1]!);

            const simplified = simplifyPath(rawDisplayPath, 0.00003);
            const finalSmoothedPath = smoothPath(simplified, 4);

            const finalStatsCache = buildRouteStatsCache(
                finalSmoothedPath,
                cityNodes,
                selectedGame,
                sdkScale,
                avgSpeed,
            );

            const nodeKms = new Float32Array(result.nodeSequence.length);
            for (let i = 0; i < result.nodeSequence.length; i++) {
                const originalNodePos = nodeCoords.get(result.nodeSequence[i]!);
                if (!originalNodePos) continue;

                let minDistSq = Infinity;
                let bestIdx = 0;
                for (let j = 0; j < finalSmoothedPath.length; j++) {
                    const p = finalSmoothedPath[j]!;
                    const dSq =
                        Math.pow(p[0] - originalNodePos[0], 2) +
                        Math.pow(p[1] - originalNodePos[1], 2);
                    if (dSq < minDistSq) {
                        minDistSq = dSq;
                        bestIdx = j;
                    }
                }
                nodeKms[i] = finalStatsCache[bestIdx * 2]!;
            }

            const sequenceManeuvers = new Int8Array(result.nodeSequence.length);
            const sequenceExits = new Int8Array(result.nodeSequence.length);

            for (let i = 0; i < result.nodeSequence.length - 1; i++) {
                const u = result.nodeSequence[i]!;
                const v = result.nodeSequence[i + 1]!;
                const edge = adjacency.get(u)?.find((e) => e.to === v);

                let mType = edge ? edge.maneuverType || 0 : 0;
                let extNum = edge ? edge.exitNumber || 0 : 0;

                if (mType === 3) {
                    if (extNum === -3) {
                        let skippedExits = 0;

                        for (
                            let j = i + 1;
                            j < result.nodeSequence.length - 1;
                            j++
                        ) {
                            const scanU = result.nodeSequence[j]!;
                            const scanV = result.nodeSequence[j + 1]!;
                            const scanEdge = adjacency
                                .get(scanU)
                                ?.find((e) => e.to === scanV);

                            if (!scanEdge || scanEdge.maneuverType !== 3) break;

                            if (scanEdge.exitNumber === -2) {
                                extNum = skippedExits + 1;
                                break;
                            } else if (scanEdge.exitNumber === -1) {
                                const neighbors = adjacency.get(scanU) || [];
                                for (const n of neighbors) {
                                    if (
                                        n.maneuverType === 3 &&
                                        n.exitNumber === -2 &&
                                        n.to !== scanV
                                    ) {
                                        skippedExits++;
                                    }
                                }
                            } else {
                                break;
                            }
                        }

                        if (extNum === -3) extNum = 1;
                    } else if (extNum === -1 || extNum === -2) {
                        mType = 0;
                        extNum = 0;
                    }
                }

                sequenceManeuvers[i] = mType;
                sequenceExits[i] = extNum;
            }

            self.postMessage(
                {
                    type: "RESULT",
                    payload: {
                        ...result,
                        rawPath: finalSmoothedPath,
                        displayPath: finalSmoothedPath,
                        stats: finalStatsCache,
                        nodeKms: nodeKms,
                        sequenceManeuvers: sequenceManeuvers,
                        sequenceExits: sequenceExits,
                    },
                },
                [
                    finalStatsCache.buffer,
                    nodeKms.buffer,
                    sequenceManeuvers.buffer,
                    sequenceExits.buffer,
                ],
            );
        } else {
            self.postMessage({ type: "RESULT", payload: null });
        }
    }
};
