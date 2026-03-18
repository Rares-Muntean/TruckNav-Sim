import { distance, lineString, nearestPointOnLine, point } from "@turf/turf";
import maplibregl from "maplibre-gl";
import { generateDestinationIcon } from "~/assets/utils/map/markers";
import {
    getBearing,
    getSqDistToSegment,
    DEVIATION_THRESHOLD_SQ,
    getSquaredDist,
} from "~/assets/utils/map/maths";
import {
    deleteMapLibreData,
    setMapLibreData,
} from "~/assets/utils/map/helpers";
import { generateTurnInstructions, type TurnInstruction } from "~/assets/utils/routing/turnInstructions";

export const useRouteController = (
    map: Ref<maplibregl.Map | null>,
    adjacency: Map<number, { to: number; weight: number; r: number }[]>,
    nodeCoords: Map<number, [number, number]>,
) => {
    const { getGameLocationName, getWorkerCityData } = useCityData();
    const { getClosestNodes } = useGraphSystem();
    const { settings, activeSettings, updateGlobal, updateProfile } =
        useSettings();


    const currentRoutePath = shallowRef<[number, number][] | null>(null);
    const routeStatsCache = shallowRef<Float32Array | null>(null);

    const destinationName = ref<string>("");
    const routeDistance = ref<number>(0);
    const routeEta = ref<string>("");

    const savedDestination = ref<[number, number] | null>(null);

    const isRouteActive = ref(false);
    const isYardStart = ref(false);

    const isTruckInYard = ref(false);

    const startNodeId = ref<number | null>(null);
    const endNodeId = ref<number | null>(null);
    const lastMathPos = ref<[number, number] | null>(null);

    const isCalculating = ref(false);
    const routeFound = ref<boolean | null>(null);

    const currentRouteIndex = ref(0);
    const isWorkerReady = ref(false);

    const turnInstructions = shallowRef<TurnInstruction[]>([]);
    const nextTurns = shallowRef<{ instruction: TurnInstruction; distance: number }[]>([]);
    const nextTurnIndex = ref(0);

    watch(
        () => activeSettings.value.themeColor,
        async (newColor) => {
            if (map.value && map.value.hasImage("destination-icon")) {
                const newPinImg = await generateDestinationIcon(newColor);
                map.value.updateImage("destination-icon", newPinImg);
            }
        },
    );
    watch(
        () => activeSettings.value.routeColor,
        (newColor) => {
            if (map.value && map.value.getLayer("route-line")) {
                map.value.setPaintProperty(
                    "route-line",
                    "line-color",
                    newColor,
                );
            }
        },
    );

    let worker: Worker | null = null;
    if (import.meta.client) {
        worker = new Worker(
            new URL("~/workers/route.worker.ts", import.meta.url),
            { type: "module" },
        );

        worker.onmessage = (e) => {
            if (e.data.type === "READY") console.log("Web Worker Ready.");
        };
    }

    function destroyWorker() {
        if (worker) {
            worker.terminate();
            worker = null;
        }
    }

    function initWorkerData(nodesArray: any[], edgesArray: any[]) {
        if (!worker) return;

        const cityPayload = getWorkerCityData();

        worker.postMessage({
            type: "INIT_GRAPH",
            payload: {
                nodes: nodesArray,
                edges: edgesArray,
                cities: cityPayload,
            },
        });

        isWorkerReady.value = true;
    }

    function projectPointToSegment(
        p: [number, number],
        v: [number, number],
        w: [number, number],
    ): [number, number] {
        const l2 = getSquaredDist(v, w);
        if (l2 === 0) return [v[0], v[1]];
        let t =
            ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) /
            l2;
        t = Math.max(0, Math.min(1, t));
        return [v[0] + t * (w[0] - v[0]), v[1] + t * (w[1] - v[1])];
    }

    let lastPrefabCheckTime = 0;
    let lastPrefabCheckResult = false;
    function isPositionInPrefab(coords: [number, number]): boolean {
        const now = Date.now();
        if (now - lastPrefabCheckTime < 2000) {
            return lastPrefabCheckResult;
        }
        lastPrefabCheckTime = now;

        if (!map.value || !map.value.getLayer("prefab-zones")) {
            lastPrefabCheckResult = false;
            return false;
        }

        try {
            const screenPt = map.value.project(coords);
            const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
                [screenPt.x - 20, screenPt.y - 20],
                [screenPt.x + 20, screenPt.y + 20],
            ];

            const features = map.value.queryRenderedFeatures(bbox, {
                layers: ["prefab-zones"],
            });
            lastPrefabCheckResult = features.length > 0;
            return lastPrefabCheckResult;
        } catch (e) {
            lastPrefabCheckResult = false;
            return false;
        }
    }

    function getSnappedCoords(
        truckCoords: [number, number],
        truckHeading: number,
    ): [number, number] {
        isTruckInYard.value = isPositionInPrefab(truckCoords);

        if (isTruckInYard.value) {
            return truckCoords;
        }

        if (
            isRouteActive.value &&
            currentRoutePath.value &&
            currentRoutePath.value.length > 1
        ) {
            const path = currentRoutePath.value;
            const idx = currentRouteIndex.value;

            let bestProj = truckCoords;
            let minSqDist = Infinity;
            let bestSegmentHeading = 0;

            const searchLimit = Math.min(path.length - 1, idx + 4);
            const startSearch = Math.max(0, idx - 1);

            for (let i = startSearch; i < searchLimit; i++) {
                const proj = projectPointToSegment(
                    truckCoords,
                    path[i]!,
                    path[i + 1]!,
                );
                const distSq = getSquaredDist(truckCoords, proj);

                if (distSq < minSqDist) {
                    minSqDist = distSq;
                    bestProj = proj;
                    bestSegmentHeading = getBearing(path[i]!, path[i + 1]!);
                }
            }

            const distKm = Math.sqrt(minSqDist) * 111;

            let hDiff = Math.abs(truckHeading - bestSegmentHeading);
            while (hDiff > 180) hDiff = 360 - hDiff;
            const trueDiff = hDiff > 90 ? 180 - hDiff : hDiff;

            if (distKm < 0.4 && trueDiff < 35) {
                return bestProj;
            }
        }

        const config = findBestStartConfiguration(truckCoords, truckHeading, 2);

        if (!config || !config.projectedCoords) {
            return truckCoords;
        }

        const distSq = getSquaredDist(truckCoords, config.projectedCoords);
        const distKm = Math.sqrt(distSq) * 111;

        if (distKm < 0.1) {
            return config.projectedCoords;
        }

        return truckCoords;
    }

    function calculateRouteInWorker(
        startId: number,
        possibleEnds: number[],
        heading: number,
        startType: string,
        targetCoords: [number, number],
        projectedStartCoords: [number, number],
        ownedDlcs: number[],
    ): Promise<any> {
        return new Promise((resolve) => {
            if (!worker) {
                resolve(null);
                return;
            }

            const handler = (e: MessageEvent) => {
                if (e.data.type === "RESULT") {
                    worker!.removeEventListener("message", handler);
                    resolve(e.data.payload);
                }
            };

            worker.addEventListener("message", handler);

            worker.postMessage({
                type: "CALC_ROUTE",
                payload: {
                    startId,
                    possibleEnds,
                    heading,
                    startType,
                    targetCoords,
                    projectedStartCoords,
                    ownedDlcs,
                    selectedGame: settings.value.selectedGame,
                },
            });
        });
    }

    function findBestStartConfiguration(
        truckCoords: [number, number],
        truckHeading: number,
        _ignoredLimit: number = 20,
    ) {
        if (adjacency.size === 0 || nodeCoords.size === 0) {
            console.error("CRITICAL: Graph data is empty!");
            return null;
        }

        const nearbyNodes = getClosestNodes(truckCoords, 5, 0.1);

        if (nearbyNodes.length === 0) {
            return null;
        }

        let bestEdge = null;
        let minScore = Infinity;

        for (const fromNodeId of nearbyNodes) {
            const neighbors = adjacency.get(fromNodeId);
            const fromPos = nodeCoords.get(fromNodeId);
            if (!neighbors || !fromPos) continue;

            for (const edge of neighbors) {
                const toPos = nodeCoords.get(edge.to);
                if (!toPos) continue;

                let roadBearing = getBearing(fromPos, toPos);

                let diff = Math.abs(truckHeading - roadBearing);
                if (diff > 180) diff = 360 - diff;

                const isOpposite = diff > 90;
                const trueDiff = isOpposite ? 180 - diff : diff;
                if (trueDiff > 45) continue;

                const visualRoadBearing = isOpposite
                    ? (roadBearing + 180) % 360
                    : roadBearing;

                const projected = projectPointToSegment(
                    truckCoords,
                    fromPos,
                    toPos,
                );
                const distSq = getSquaredDist(truckCoords, projected);
                const distKm = Math.sqrt(distSq) * 111;

                const headingPenalty = Math.pow(trueDiff / 90, 2) * 0.1;
                const directionPenalty = isOpposite ? 0.05 : 0;

                const score = distKm + headingPenalty + directionPenalty;

                if (score < minScore) {
                    minScore = score;
                    bestEdge = {
                        type: "road",
                        fromId: fromNodeId,
                        toId: edge.to,
                        projectedCoords: projected,
                        bearing: visualRoadBearing,
                    };
                }
            }
        }

        if (bestEdge) return bestEdge;

        const yardCandidates = getClosestNodes(truckCoords, 2, 0.3);
        let closestNodeId: number | null = null;
        let minNodeDist = Infinity;

        for (const nodeId of yardCandidates) {
            const nodePos = nodeCoords.get(nodeId);
            if (!nodePos) continue;

            const distSq = getSquaredDist(truckCoords, nodePos);
            if (distSq < minNodeDist) {
                minNodeDist = distSq;
                closestNodeId = nodeId;
            }
        }

        if (closestNodeId !== null) {
            const nodePos = nodeCoords.get(closestNodeId);
            if (!nodePos) return;

            return {
                type: "yard",
                fromId: closestNodeId,
                toId: closestNodeId,
                projectedCoords: nodePos,
            };
        }

        return null;
    }

    async function findFlexibleRoute(
        startNodeId: number,
        targetCoords: [number, number],
        truckHeading: number,
        startType: "road" | "yard",
        projectedStartCoords: [number, number],
    ) {
        const SEARCH_RADII = [1, 2, 4, 8, 16, 32, 100, 300];
        const userDlcs = toRaw(activeSettings.value.ownedDlcs);

        for (const radius of SEARCH_RADII) {
            const candidates = getClosestNodes(targetCoords, radius, 0.1);

            if (candidates.length === 0) continue;

            const result = await calculateRouteInWorker(
                startNodeId,
                candidates,
                truckHeading,
                startType,
                targetCoords,
                projectedStartCoords,
                userDlcs,
            );

            if (result) {
                return result;
            }
        }

        return null;
    }

    function drawRouteOnMap(coords: [number, number][]) {
        if (!map.value) return;

        const rawMap = toRaw(map.value);
        setMapLibreData(rawMap, "route-line", "LineString", toRaw(coords));
    }

    function addDestinationMarker(nodeId: number) {
        const endLocation = nodeCoords.get(nodeId);
        if (!endLocation || !map.value) return;

        setMapLibreData(map.value, "destination-source", "Point", endLocation);
    }

    async function setupRouteLayer() {
        if (!map.value) return;
        if (map.value.getSource("route-line")) return;

        if (!map.value.hasImage("destination-icon")) {
            const pinImg = await generateDestinationIcon(
                activeSettings.value.themeColor,
            );
            map.value.addImage("destination-icon", pinImg, { pixelRatio: 2.5 });
        }

        map.value.addSource("route-line", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
        });

        map.value.addLayer(
            {
                id: "route-line",
                type: "line",
                source: "route-line",
                layout: { "line-join": "round", "line-cap": "round" },
                paint: {
                    "line-color": activeSettings.value.routeColor,
                    "line-width": [
                        "interpolate",
                        ["linear"],
                        ["zoom"],
                        10,
                        8,
                        10.2,
                        9,
                        10.5,
                        6,
                        11.5,
                        11,
                    ],
                },
            },
            "all-sprites",
        );

        if (!map.value.getSource("destination-source")) {
            map.value.addSource("destination-source", {
                type: "geojson",
                data: { type: "FeatureCollection", features: [] },
            });

            map.value.addLayer({
                id: "destination-layer",
                type: "symbol",
                source: "destination-source",
                layout: {
                    "icon-image": "destination-icon",
                    "icon-anchor": "bottom",
                    "icon-allow-overlap": true,
                    "icon-ignore-placement": true,
                },
            });

            map.value.on("click", "destination-layer", () => {
                clearRouteState();
            });
            map.value.on("mouseenter", "destination-layer", () => {
                map.value!.getCanvas().style.cursor = "pointer";
            });
            map.value.on("mouseleave", "destination-layer", () => {
                map.value!.getCanvas().style.cursor = "";
            });
        }
    }

    async function handleRouteClick(
        clickCoords: [number, number],
        truckCoords: [number, number],
        truckHeading: number,
        createEndMarker: boolean,
    ) {
        if (adjacency.size === 0 || isCalculating.value || !isWorkerReady)
            return;

        isCalculating.value = true;
        routeFound.value = null;

        savedDestination.value = clickCoords;

        try {
            const startConfig = findBestStartConfiguration(
                truckCoords,
                truckHeading,
                10,
            );

            if (!startConfig) return;
            isYardStart.value = startConfig.type === "yard";

            startNodeId.value = startConfig.toId;
            const result = await findFlexibleRoute(
                startNodeId.value!,
                toRaw(clickCoords),
                truckHeading,
                startConfig.type as "road" | "yard",
                startConfig.projectedCoords,
            );

            if (result) {
                isRouteActive.value = true;

                endNodeId.value = result.endId;

                const frozenRawPath = Object.freeze(result.rawPath);
                currentRoutePath.value = frozenRawPath as any;

                routeStatsCache.value = result.stats;

                const cache = result.stats;
                const lastIdx = (result.rawPath.length - 1) * 2;
                const totalKm = cache[lastIdx]!;
                const totalHours = cache[lastIdx + 1]!;

                turnInstructions.value = generateTurnInstructions(
                    result.rawPath,
                    result.stats,
                    nodeCoords,
                    adjacency,
                );
                nextTurnIndex.value = 0;

                drawRouteOnMap(result.displayPath);
                if (createEndMarker) addDestinationMarker(result.endId);

                routeDistance.value = Math.round(totalKm);
                const h = Math.floor(totalHours);
                const m = Math.round((totalHours - h) * 60);
                routeEta.value = `${h}h ${m}min`;

                destinationName.value = getGameLocationName(
                    clickCoords[0],
                    clickCoords[1],
                );

                routeFound.value = true;
                currentRouteIndex.value = 0;
                updateProfile("lastDestination", savedDestination.value);
            } else {
                routeFound.value = false;
            }
        } catch (e) {
            console.log(`Route calculation Failed: ${e}`);
            isRouteActive.value = false;
        } finally {
            isCalculating.value = false;
        }
    }

    const lastRecalcTime = ref(0);
    const updateRouteProgress = (
        truckCoords: [number, number],
        truckHeading: number,
    ) => {
        if (!currentRoutePath.value || currentRoutePath.value.length < 2)
            return;
        const cache = routeStatsCache.value;
        if (!cache) return;

        if (lastMathPos.value) {
            const sqDist = getSquaredDist(lastMathPos.value, truckCoords);
            if (sqDist < 0.000000001) return;
        }
        lastMathPos.value = truckCoords;

        const path = currentRoutePath.value;
        let bestIndex = currentRouteIndex.value;
        let minSqDist = Infinity;

        const searchLimit = Math.min(path.length - 1, bestIndex + 50);
        const startSearch = Math.max(0, bestIndex - 5);

        for (let i = startSearch; i < searchLimit; i++) {
            const distSq = getSqDistToSegment(
                truckCoords,
                path[i]!,
                path[i + 1]!,
            );

            if (distSq < minSqDist) {
                minSqDist = distSq;
                bestIndex = i;
            }
        }

        currentRouteIndex.value = bestIndex;
        const now = Date.now();
        if (now - lastRecalcTime.value < 5000) return;

        let activeThreshold = DEVIATION_THRESHOLD_SQ;

        if (isTruckInYard.value) {
            activeThreshold = 0.05;
        } else if (isYardStart.value) {
            if (bestIndex > 0) {
                isYardStart.value = false;
            } else {
                activeThreshold = 0.005;
            }
        }

        if (minSqDist > activeThreshold) {
            if (!isCalculating.value && savedDestination.value) {
                lastRecalcTime.value = now;
                console.log("Deviation detected! Recalculating...");
                handleRouteClick(
                    toRaw(savedDestination.value),
                    truckCoords,
                    truckHeading,
                    false,
                );
                return;
            }
        }

        const distToEndSq = getSquaredDist(truckCoords, path[path.length - 1]!);
        if (distToEndSq < 0.000005) {
            clearRouteState();
            return;
        }

        const lastIdx = (path.length - 1) * 2;
        const currentIdx = bestIndex * 2;

        const totalKm = cache[lastIdx]!;
        const totalHours = cache[lastIdx + 1]!;

        const currentKm = cache[currentIdx] || 0;
        const currentHours = cache[currentIdx + 1]!;

        while (
            nextTurnIndex.value < turnInstructions.value.length &&
            turnInstructions.value[nextTurnIndex.value].distance - currentKm < 0.05
        ) {
            nextTurnIndex.value++;
        }

        nextTurns.value = turnInstructions.value
            .slice(nextTurnIndex.value, nextTurnIndex.value + 2)
            .map(instr => ({
                instruction: instr,
                distance: Math.max(instr.distance - currentKm, 0)
            }));

        const remKm = totalKm - currentKm;
        const remHours = totalHours - currentHours;

        routeDistance.value = Math.round(remKm);

        if (remHours > 0) {
            const h = Math.floor(remHours);
            const m = Math.round((remHours - h) * 60);
            routeEta.value = `${h}h ${m}min`;
        } else {
            routeEta.value = "Arriving...";
        }
    };

    function clearRouteState() {
        if (!map.value) return;

        deleteMapLibreData(map.value, "route-line");
        deleteMapLibreData(map.value, "destination-source");

        isRouteActive.value = false;
        endNodeId.value = null;
        currentRoutePath.value = null;
        savedDestination.value = null;
        isYardStart.value = false;
        turnInstructions.value = [];
        updateProfile("lastDestination", null);
    }

    return {
        worker,
        destinationName,
        routeDistance,
        routeEta,
        isCalculating,
        routeFound,
        currentRoutePath,
        isWorkerReady,
        isRouteActive,
        initWorkerData,
        destroyWorker,
        setupRouteLayer,
        handleRouteClick,
        findBestStartConfiguration,
        updateRouteProgress,
        getSnappedCoords,
        clearRouteState,
        turnInstructions,
        nextTurns,
    };
};
