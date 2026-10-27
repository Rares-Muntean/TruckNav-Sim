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
import {
    generateDirectionsList,
    type DirectionStep,
} from "~/assets/utils/routing/directions";

import RouteWorker from "~/workers/route.worker?worker&inline";
import { clearTurnArrows, drawTurnArrows } from "~/assets/utils/map/turnArrows";
import type { RoadEdge } from "~/types";

const REAL_TIME_DELAY_FACTOR = 0.25;
const MAX_REAL_TIME_DELAY_MINUTES = 10;

export const useRouteController = (
    map: Ref<maplibregl.Map | null>,
    adjacency: Map<number, RoadEdge[]>,
    nodeCoords: Map<number, [number, number]>,
    stopNavigationMode: () => void,
) => {
    const { getGameLocationName, getWorkerCityData, mapScaleConfig } =
        useCityData();
    const { getClosestNodes } = useGraphSystem();
    const { settings, activeSettings, updateGlobal, updateProfile } =
        useSettings();

    const currentRoutePath = shallowRef<[number, number][] | null>(null);
    const routeStatsCache = shallowRef<Float32Array | null>(null);

    const destinationName = ref<string>("");
    const routeDistance = ref<number>(0);
    const routeEtaHours = ref<string>("");
    const routeEtaMinutes = ref<string>("");

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

    const fullRouteDirections = ref<DirectionStep[]>([]);
    const nextTurnDistance = ref<number>(0);

    const waypointList = ref<[number, number][]>([]);
    const snappedWaypointNodeIds = ref<number[]>([]);

    function updateRouteEta(gameHours: number, realHours: number) {
        const usesRealTime = settings.value.routeTimeMode === "real";
        const realTimeDelay = Math.min(
            realHours * REAL_TIME_DELAY_FACTOR,
            MAX_REAL_TIME_DELAY_MINUTES / 60,
        );
        const remainingHours = usesRealTime
            ? realHours + realTimeDelay
            : gameHours;

        if (remainingHours > 0) {
            const totalMinutes = Math.round(remainingHours * 60);
            const h = Math.floor(totalMinutes / 60);
            const m = totalMinutes % 60;
            routeEtaHours.value = `${h}`;
            routeEtaMinutes.value = `${m}`;
        }
    }

    watch(
        () => settings.value.routeTimeMode,
        () => {
            const cache = routeStatsCache.value;
            const path = currentRoutePath.value;
            if (!cache || !path) return;

            const lastIdx = (path.length - 1) * 3;
            const currentIdx = currentRouteIndex.value * 3;

            updateRouteEta(
                cache[lastIdx + 1]! - cache[currentIdx + 1]!,
                cache[lastIdx + 2]! - cache[currentIdx + 2]!,
            );
        },
    );

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

    watch(
        () => activeSettings.value.hasTurnNavigation,
        (hasGuidedNavigation) => {
            if (!map.value) return;

            if (hasGuidedNavigation) {
                if (isRouteActive.value && currentRoutePath.value) {
                    drawTurnArrows(
                        map.value,
                        fullRouteDirections.value,
                        currentRoutePath.value,
                    );
                }
            } else {
                clearTurnArrows(map.value);
            }
        },
    );

    let worker: Worker | null = null;
    if (import.meta.client) {
        worker = new RouteWorker();

        worker.onmessage = (e) => {
            if (e.data.type === "READY") console.log("Web Worker Ready.");
        };
    }

    function destroyWorker() {
        if (worker) {
            worker.terminate();
            worker = null;
        }
        isWorkerReady.value = false;
    }

    function initWorkerData(
        nodesCoordsBuffer: ArrayBuffer,
        graphBuffer: ArrayBuffer,
        geometryBuffer: ArrayBuffer,
    ) {
        if (!worker) return;
        const cityPayload = getWorkerCityData();

        const transferables: Transferable[] = [
            nodesCoordsBuffer,
            graphBuffer,
            geometryBuffer,
        ];

        worker.postMessage(
            {
                type: "INIT_GRAPH",
                payload: {
                    nodesCoordsBuffer: nodesCoordsBuffer,
                    graphBuffer: graphBuffer,
                    geometryBuffer: geometryBuffer,
                    cities: cityPayload,
                    scaleConfig: toRaw(mapScaleConfig.value),
                },
            },
            transferables,
        );

        isWorkerReady.value = true;
    }

    /**
     * Manages the full multi-stop route calculation:
     * - Snaps the truck and waypoints to the closest valid graph nodes.
     * - Sends the required data to the background Web Worker.
     * - Updated reactive route statistics (ETA, distance, turn directions)
     * - Renders the route line, markers and visual turn arrows on MapLibre.
     * @param truckCoords - In-game truck coordinates used to find the best starting road edge.
     * @param truckHeading - Current truck heading to ensure navigation starts in the driving direction.
     * @param sdkScale - Game world scale (e.g. 1:19 or 1:15 UK) for accurate real-time/distance conversion.
     * @param avgSpeed - Average driving speed used to calculate realistic travel ETA.
     * @param targetWaypoints - Temporary waypoints target to check if the route is reachable.
     */
    async function handleMultiRouteCalculation(
        truckCoords: [number, number],
        truckHeading: number,
        sdkScale: number,
        avgSpeed: number,
        targetWaypoints: [number, number][] = waypointList.value,
    ) {
        if (
            targetWaypoints.length === 0 ||
            adjacency.size === 0 ||
            isCalculating.value ||
            !isWorkerReady.value
        ) {
            return;
        }

        isCalculating.value = true;
        routeFound.value = null;

        try {
            const startConfig = findBestStartConfiguration(
                truckCoords,
                truckHeading,
                50,
            );
            if (!startConfig) {
                isCalculating.value = false;
                routeFound.value = false;
                return;
            }

            isYardStart.value = startConfig.type === "yard";
            startNodeId.value = startConfig.toId;

            const waypointsNodeGroups: number[][] = [];
            for (const waypoint of targetWaypoints) {
                let candidates = getClosestNodes(waypoint, 5, 0.001);

                if (candidates.length === 0) {
                    candidates = getClosestNodes(waypoint, 5, 0.003);
                }
                if (candidates.length === 0) {
                    candidates = getClosestNodes(waypoint, 5, 0.015);
                }
                if (candidates.length === 0) {
                    candidates = getClosestNodes(waypoint, 5, 0.05);
                }
                if (candidates.length === 0) {
                    candidates = getClosestNodes(waypoint, 5, 0.1);
                }

                waypointsNodeGroups.push(candidates);
            }

            const userDlcs = toRaw(activeSettings.value.ownedDlcs);

            const result = await calculateMultiRouteInWorker(
                startNodeId.value!,
                targetWaypoints,
                waypointsNodeGroups,
                truckHeading,
                startConfig.type as "road" | "yard",
                userDlcs,
                sdkScale,
                avgSpeed,
            );

            if (result) {
                isRouteActive.value = true;
                endNodeId.value = result.endId;
                snappedWaypointNodeIds.value = result.snappedNodeIds || [];

                let finalWaypoints = [...targetWaypoints];
                const skipped: number[] = result.skippedWaypoints || [];
                if (skipped.length > 0) {
                    finalWaypoints = finalWaypoints.filter(
                        (_, idx) => !skipped.includes(idx),
                    );
                }
                waypointList.value = finalWaypoints;

                const frozenRawPath = Object.freeze(result.displayPath);
                currentRoutePath.value = frozenRawPath as any;
                routeStatsCache.value = result.stats;

                const cache = result.stats;
                const lastIdx = (result.displayPath.length - 1) * 3;
                const totalKm = cache[lastIdx];
                const totalGameHours = cache[lastIdx + 1];
                const totalRealHours = cache[lastIdx + 2];

                drawRouteOnMap(result.displayPath);
                drawDestinationMarkers();

                routeDistance.value = Math.round(totalKm);
                updateRouteEta(totalGameHours, totalRealHours);

                const lastStop =
                    waypointList.value[waypointList.value.length - 1]!;
                destinationName.value = getGameLocationName(
                    lastStop[0],
                    lastStop[1],
                );

                fullRouteDirections.value = generateDirectionsList(
                    result.nodeSequence,
                    result.nodeKms,
                    result.sequenceManeuvers,
                    result.sequenceExits,
                    nodeCoords,
                );

                if (fullRouteDirections.value.length > 1) {
                    const upcomingTurn = fullRouteDirections.value[1];
                    if (
                        upcomingTurn &&
                        upcomingTurn.cumulativeKm !== undefined
                    ) {
                        nextTurnDistance.value = Math.max(
                            0,
                            +upcomingTurn.cumulativeKm.toFixed(1),
                        );
                    }
                } else {
                    nextTurnDistance.value = 0;
                }

                if (activeSettings.value.hasTurnNavigation) {
                    drawTurnArrows(
                        map.value,
                        fullRouteDirections.value,
                        result.displayPath,
                    );
                }

                routeFound.value = true;
                currentRouteIndex.value = 0;
                updateProfile(
                    "lastDestination",
                    waypointList.value[waypointList.value.length - 1]!,
                );
            } else {
                routeFound.value = false;
            }
        } catch (e) {
            console.error(`Route calculation failed: ${e}`);
            isRouteActive.value = false;
        } finally {
            isCalculating.value = false;
        }
    }

    function calculateMultiRouteInWorker(
        startId: number,
        waypointsCoords: [number, number][],
        waypointsNodeGroups: number[][],
        heading: number,
        startType: string,
        ownedDlcs: number[],
        sdkScale: number,
        avgSpeed: number,
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

            const cleanCoords = waypointsCoords.map((coord) => [
                Number(coord[0]),
                Number(coord[1]),
            ]);
            const cleanNodeGroups = waypointsNodeGroups.map((group) =>
                group.map((node) => Number(node)),
            );
            const cleanDlcs = ownedDlcs.map((dlc) => Number(dlc));

            worker.postMessage({
                type: "CALC_MULTI_ROUTE",
                payload: {
                    startId: Number(startId),
                    waypointsCoords: cleanCoords,
                    waypointsNodeGroups: cleanNodeGroups,
                    heading: heading !== null ? Number(heading) : null,
                    startType,
                    ownedDlcs: cleanDlcs,
                    selectedGame: settings.value.selectedGame,
                    sdkScale: Number(sdkScale),
                    avgSpeed: Number(avgSpeed),
                },
            });
        });
    }

    /**
     * Determines the optimal insertion index in `waypointList` for a newly clicked stop.
     *
     * @param clickCoords - Geographic [lng, lat] coordinates of the user's map click.
     * @returns The zero-based index where the stop should be inserted in the list.
     */
    function findBestWaypointInsertionIndex(
        clickCoords: [number, number],
    ): number {
        if (
            !isRouteActive.value ||
            !currentRoutePath.value ||
            currentRoutePath.value.length < 2 ||
            waypointList.value.length == 0
        ) {
            return waypointList.value.length;
        }

        const routePoints = currentRoutePath.value;

        const markedPositionsOnRoute: number[] = [];
        let searchStart = 0;

        for (const markedCoords of waypointList.value) {
            let closestPointIndex = searchStart;
            let shortestDistSq = Infinity;

            for (let i = searchStart; i < routePoints.length; i++) {
                const distSq = getSquaredDist(markedCoords, routePoints[i]!);
                if (distSq < shortestDistSq) {
                    shortestDistSq = distSq;
                    closestPointIndex = i;
                }
            }

            markedPositionsOnRoute.push(closestPointIndex);
            searchStart = closestPointIndex;
        }

        let clickedRoadPieceIndex = 0;
        let shortestClickDistSq = Infinity;

        for (let i = 0; i < routePoints.length - 1; i++) {
            const distSq = getSqDistToSegment(
                clickCoords,
                routePoints[i]!,
                routePoints[i + 1]!,
            );

            if (distSq < shortestClickDistSq) {
                shortestClickDistSq = distSq;
                clickedRoadPieceIndex = i;
            }
        }

        for (
            let markedIdx = 0;
            markedIdx < markedPositionsOnRoute.length;
            markedIdx++
        ) {
            const markedPosition = markedPositionsOnRoute[markedIdx]!;
            if (clickedRoadPieceIndex < markedPosition) {
                return markedIdx;
            }
        }

        return waypointList.value.length;
    }

    async function handleRouteClick(
        clickCoords: [number, number],
        truckCoords: [number, number],
        truckHeading: number,
        sdkScale: number,
        avgSpeed: number,
        isInsertMode: boolean = false,
    ) {
        let testList: [number, number][] = [];

        if (!isRouteActive.value) {
            testList = [clickCoords];
        } else if (isInsertMode) {
            const idx = findBestWaypointInsertionIndex(clickCoords);
            testList = [...waypointList.value];
            testList.splice(idx, 0, clickCoords);
        } else {
            testList = [...waypointList.value, clickCoords];
        }

        await handleMultiRouteCalculation(
            truckCoords,
            truckHeading,
            sdkScale,
            avgSpeed,
            testList,
        );
    }

    async function removeWaypointAtIndex(
        index: number,
        truckCoords: [number, number],
        truckHeading: number,
        sdkScale: number,
        avgSpeed: number,
    ) {
        waypointList.value.splice(index, 1);
        snappedWaypointNodeIds.value.splice(index, 1);

        if (waypointList.value.length === 0) {
            clearRouteState();
        } else {
            drawDestinationMarkers();

            await handleMultiRouteCalculation(
                truckCoords,
                truckHeading,
                sdkScale,
                avgSpeed,
                waypointList.value,
            );
        }
    }

    function drawDestinationMarkers() {
        if (!map.value) return;

        const source = map.value.getSource(
            "destination-source",
        ) as maplibregl.GeoJSONSource;
        if (!source) return;

        const features = waypointList.value.map((coords, idx) => {
            let markerCoords = coords;

            const targetNodeId = snappedWaypointNodeIds.value[idx];
            if (targetNodeId !== undefined) {
                const snappedCoords = nodeCoords.get(targetNodeId);
                if (snappedCoords) {
                    markerCoords = snappedCoords;
                }
            }

            return {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: markerCoords,
                },
                properties: {
                    index: idx,
                },
            };
        });

        source.setData({
            type: "FeatureCollection",
            features: features as any,
        });
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

    /**
     * Snaps the truck onto the most suitable road edge based on position and heading direction.
     *
     * @param truckCoords - Geographic [lng, lat] coordinates of the truck.
     * @param truckHeading - Compass heading (0 - 360) to match the road's one way direction.
     * @param searchLimit - Maximum number of nearby nodes to look for (default: 50).
     * @returns The matched road segment or yard configuration, or null if off-road.
     */
    function findBestStartConfiguration(
        truckCoords: [number, number],
        truckHeading: number,
        searchLimit: number = 50,
    ) {
        if (adjacency.size === 0 || nodeCoords.size === 0) {
            console.error("CRITICAL: Graph data is empty!");
            return null;
        }

        const nearbyNodes = getClosestNodes(truckCoords, searchLimit, 0.1);

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
                const directionPenalty = isOpposite ? 0.5 : 0;

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

        const yardCandidates = getClosestNodes(truckCoords, 10, 0.3);
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

    function drawRouteOnMap(coords: [number, number][]) {
        if (!map.value) return;

        const rawMap = toRaw(map.value);
        setMapLibreData(rawMap, "route-line", "LineString", toRaw(coords));
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

            map.value.on("click", "destination-layer", async (e) => {
                const { truckCoords, truckHeading, averageSpeed, scale } =
                    useEtsTelemetry();
                if (!truckCoords.value) return;

                const features = map.value!.queryRenderedFeatures(e.point, {
                    layers: ["destination-layer"],
                });

                if (features.length > 0) {
                    const index = features[0]!.properties?.index;

                    if (index !== undefined) {
                        const targetIdx = parseInt(index, 10);

                        const currentScale =
                            scale.value > 0
                                ? scale.value
                                : mapScaleConfig.value.ruralScale;

                        await removeWaypointAtIndex(
                            targetIdx,
                            truckCoords.value,
                            truckHeading.value,
                            currentScale,
                            averageSpeed.value,
                        );
                    }
                }
            });
            map.value.on("mouseenter", "destination-layer", () => {
                map.value!.getCanvas().style.cursor = "pointer";
            });
            map.value.on("mouseleave", "destination-layer", () => {
                map.value!.getCanvas().style.cursor = "";
            });
        }

        if (!map.value.hasImage("turn-arrow-icon")) {
            const arrowImg = new Image();
            arrowImg.onload = () =>
                map.value!.addImage("turn-arrow-icon", arrowImg);

            arrowImg.src =
                "data:image/svg+xml;charset=utf-8," +
                encodeURIComponent(
                    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 20L12 16L22 20L12 2Z" fill="white" stroke="#1c1c1c" stroke-width="2" stroke-linejoin="round"/></svg>',
                );
        }

        if (!map.value.getSource("turn-arrows-line-source")) {
            map.value.addSource("turn-arrows-line-source", {
                type: "geojson",
                data: { type: "FeatureCollection", features: [] },
            });

            map.value.addLayer({
                id: "turn-arrows-line-border",
                type: "line",
                source: "turn-arrows-line-source",
                layout: { "line-join": "round", "line-cap": "round" },
                paint: {
                    "line-color": "#1c1c1c",
                    "line-width": [
                        "interpolate",
                        ["linear"],
                        ["zoom"],
                        10,
                        9,
                        15,
                        15,
                    ],
                },
            });

            map.value.addLayer({
                id: "turn-arrows-line-inner",
                type: "line",
                source: "turn-arrows-line-source",
                layout: { "line-join": "round", "line-cap": "round" },
                paint: {
                    "line-color": "#ffffff",
                    "line-width": [
                        "interpolate",
                        ["linear"],
                        ["zoom"],
                        10,
                        5.5,
                        15,
                        9.5,
                    ],
                },
            });
        }

        if (!map.value.getSource("turn-arrows-head-source")) {
            map.value.addSource("turn-arrows-head-source", {
                type: "geojson",
                data: { type: "FeatureCollection", features: [] },
            });

            map.value.addLayer({
                id: "turn-arrows-head-layer",
                type: "symbol",
                source: "turn-arrows-head-source",
                layout: {
                    "icon-image": "turn-arrow-icon",
                    "icon-size": [
                        "interpolate",
                        ["linear"],
                        ["zoom"],
                        10,
                        0.83,
                        15,
                        1.33,
                    ],
                    "icon-rotation-alignment": "map",
                    "icon-rotate": ["get", "bearing"],
                    "icon-anchor": "center",
                    "icon-allow-overlap": true,
                    "icon-ignore-placement": true,
                },
            });
        }
    }

    function calculateRouteInWorker(
        startId: number,
        possibleEnds: number[],
        heading: number,
        startType: string,
        targetCoords: [number, number],
        projectedStartCoords: [number, number],
        ownedDlcs: number[],
        sdkScale: number,
        avgSpeed: number,
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

            const cleanEnds = possibleEnds.map((node) => Number(node));
            const cleanTarget = [
                Number(targetCoords[0]),
                Number(targetCoords[1]),
            ] as [number, number];
            const cleanProjected = [
                Number(projectedStartCoords[0]),
                Number(projectedStartCoords[1]),
            ] as [number, number];
            const cleanDlcs = ownedDlcs.map((dlc) => Number(dlc));

            worker.postMessage({
                type: "CALC_ROUTE",
                payload: {
                    startId: Number(startId),
                    possibleEnds: cleanEnds,
                    heading: heading !== null ? Number(heading) : null,
                    startType,
                    targetCoords: cleanTarget,
                    projectedStartCoords: cleanProjected,
                    ownedDlcs: cleanDlcs,
                    selectedGame: settings.value.selectedGame,
                    sdkScale: Number(sdkScale),
                    avgSpeed: Number(avgSpeed),
                },
            });
        });
    }

    const lastRecalcTime = ref(0);

    /**
     * Calculates the truck's live map position on the route, updates navigation stats
     * (remaining distance, ETA, next turn countdown), and triggers route recalculation if
     * the truck goes off the route.
     *
     * @param truckCoords - Geographic [lng, lat] coordinates of the truck.
     * @param truckHeading - Current truck heading forwarded to recalculation if off-route.
     * @param sdkScale - Game scale (1:19 in Europe, 1:15 in UK) forwarded to recalculation if off-route.
     * @param avgSpeed - Current average speed of the truck forwarded to recalculation if off-route.
     * @returns Void if data is invalid to prevent crashes.
     */
    const updateRouteProgress = (
        truckCoords: [number, number],
        truckHeading: number,
        sdkScale: number,
        avgSpeed: number,
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

        const searchLimit = Math.min(path.length - 1, bestIndex + 500);
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

        let activeThreshold = DEVIATION_THRESHOLD_SQ;

        const distToEndSq = getSquaredDist(truckCoords, path[path.length - 1]!);
        if (distToEndSq < 0.00005) {
            clearRouteState();
            return;
        }

        const lastIdx = (path.length - 1) * 3;
        const currentIdx = bestIndex * 3;

        const totalKm = cache[lastIdx]!;
        const totalGameHours = cache[lastIdx + 1]!;
        const totalRealHours = cache[lastIdx + 2]!;

        const currentKm = cache[currentIdx]!;
        const currentGameHours = cache[currentIdx + 1]!;
        const currentRealHours = cache[currentIdx + 2]!;

        const remKm = totalKm - currentKm;
        const remGameHours = totalGameHours - currentGameHours;
        const remRealHours = totalRealHours - currentRealHours;
        routeDistance.value = Math.round(remKm);

        updateRouteEta(remGameHours, remRealHours);

        if (fullRouteDirections.value.length > 1) {
            const upcomingTurn = fullRouteDirections.value[1];

            if (upcomingTurn && upcomingTurn.cumulativeKm !== undefined) {
                const distKm = upcomingTurn.cumulativeKm - currentKm;
                const distRounded = +distKm.toFixed(1);

                nextTurnDistance.value = Math.max(0, distRounded);

                const targetExitKm =
                    upcomingTurn.exitCumulativeKm !== undefined
                        ? upcomingTurn.exitCumulativeKm
                        : upcomingTurn.cumulativeKm;

                const distToExit = targetExitKm - currentKm;
                const threshold =
                    upcomingTurn.type === "destination" ? 0.02 : 0.05;

                if (distToExit < threshold) {
                    fullRouteDirections.value.shift();

                    if (
                        currentRoutePath.value &&
                        activeSettings.value.hasTurnNavigation
                    ) {
                        drawTurnArrows(
                            map.value,
                            fullRouteDirections.value,
                            currentRoutePath.value,
                        );
                    }
                }
            }
        } else {
            nextTurnDistance.value = 0;
        }

        const now = Date.now();
        if (now - lastRecalcTime.value < 5000) return;

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
            if (!isCalculating.value && waypointList.value.length > 0) {
                lastRecalcTime.value = now;
                console.log("Deviation detected! Recalculating...");
                handleMultiRouteCalculation(
                    truckCoords,
                    truckHeading,
                    sdkScale,
                    avgSpeed,
                    waypointList.value,
                );
                return;
            }
        }
    };

    function clearRouteState() {
        if (!map.value) return;

        deleteMapLibreData(map.value, "route-line");
        deleteMapLibreData(map.value, "destination-source");
        deleteMapLibreData(map.value, "turn-arrows-line-source");
        deleteMapLibreData(map.value, "turn-arrows-head-source");

        isRouteActive.value = false;
        endNodeId.value = null;
        currentRoutePath.value = null;

        waypointList.value = [];
        snappedWaypointNodeIds.value = [];
        isYardStart.value = false;
        fullRouteDirections.value = [];
        updateProfile("lastDestination", null);
        stopNavigationMode();

        nextTurnDistance.value = 0;
        lastMathPos.value = null;
    }

    return {
        worker,
        destinationName,
        routeDistance,
        routeEtaHours,
        routeEtaMinutes,
        isCalculating,
        routeFound,
        currentRoutePath,
        isWorkerReady,
        isRouteActive,
        fullRouteDirections,
        nextTurnDistance,
        initWorkerData,
        destroyWorker,
        waypointList,
        removeWaypointAtIndex,
        setupRouteLayer,
        handleMultiRouteCalculation,
        findBestWaypointInsertionIndex,
        handleRouteClick,
        findBestStartConfiguration,
        updateRouteProgress,
        clearRouteState,
    };
};
