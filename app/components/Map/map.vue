<script lang="ts" setup>
import { ref, onMounted, shallowRef, Transition } from "vue";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import SpeedLimit from "../Navigation/speedLimit.vue";
import { usePlatform } from "~/composables/Platform";
import eruda from "eruda";
import { blendWithBg, lightenColor } from "~/assets/utils/shared/colors";
import { generateTruckIcon } from "~/assets/utils/map/markers";

defineProps<{ goHome: () => void }>();

// MAP STATE
const mapEl = shallowRef<HTMLElement | null>(null);
const map = shallowRef<maplibregl.Map | null>(null);
const isSettingsPanelOpened = ref(false);
const isClickingEnabled = ref(true);

// UI STATE
const isSheetExpanded = ref(false);
const isSheetHidden = ref(false);

// JOB STATE
const currentJobKey = ref<string>("");

// NOTIFICATION TRIGGERS
const clickingNotificationTrigger = ref(0);

//
//
//// ======> COMPOSABLES <======

//
//
// Telemetry Data
const {
    startTelemetry,
    stopTelemetry,
    gameTime,
    gameConnected,
    truckCoords,
    truckSpeed,
    speedLimit,
    truckHeading,
    fuel,
    restStoptime,
    restStopMinutes,
    hasInGameMarker,
    hasActiveJob,
    destinationCity,
    destinationCompany,
} = useEtsTelemetry();

//
//
// Map Areas Data
const { loadLocationData, findDestinationCoords } = useCityData();

//
//
// Check Platform
const { isElectron, isMobile, isWeb } = usePlatform();

//
//
// Graph manipulation
const {
    loading,
    progress,
    adjacency,
    nodeCoords,
    initializeGraphData,
    getClosestNodes,
} = useGraphSystem();

//
//
// Maplibre Camera
const {
    isCameraLocked,
    initCameraListeners,
    followTruck,
    startNavigationMode,
    lockCamera,
} = useMapCamera(map);

//
//
// Route Controller
const {
    setupRouteLayer,
    handleRouteClick,
    updateRouteProgress,
    clearRouteState,
    destinationName,
    routeDistance,
    routeEta,
    isCalculating: isCalculatingRoute,
    isWorkerReady,
    initWorkerData,
    destroyWorker,
    isRouteActive,
    routeFound,
    getSnappedCoords,
    findBestStartConfiguration,
    worker,
} = useRouteController(map, adjacency, nodeCoords);

//
//
// Settings Controller
const { updateGlobal, activeSettings, settings } = useSettings();

let uiTimer: ReturnType<typeof setTimeout> | null = null;
let routeTimer: ReturnType<typeof setTimeout> | null = null;

// Forcing loading screen before mounting elements to prevent flashing between game changes
loading.value = true;
progress.value = 0;

// We check if it has active job, if it has one, plot a route
watch(
    [
        hasActiveJob,
        destinationCity,
        destinationCompany,
        gameConnected,
        loading,
        isWorkerReady,
    ],
    async ([hasJob, city, company, isConnected, isLoading, isWorkerReady]) => {
        if (isLoading || !isWorkerReady) return;

        if (!isConnected) {
            currentJobKey.value = "";
            return;
        }

        if (
            !truckCoords.value ||
            (truckCoords.value[0] === 0 && truckCoords.value[1] === 0)
        ) {
            return;
        }

        const newJobKey = hasJob ? `${city}|${company}` : "";

        if (routeTimer) clearTimeout(routeTimer);

        routeTimer = setTimeout(async () => {
            if (hasJob && newJobKey !== currentJobKey.value) {
                if (!truckCoords.value) return;
                const destCoords = findDestinationCoords(city, company);

                if (destCoords) {
                    clearRouteState();
                    isClickingEnabled.value = false;
                    currentJobKey.value = newJobKey;

                    await handleRouteClick(
                        destCoords,
                        truckCoords.value,
                        truckHeading.value,
                        false,
                    );
                }
            }
        }, 500);

        if (!hasJob && currentJobKey.value !== "") {
            clearRouteState();
            currentJobKey.value = "";
        }
    },
);

watch(
    [hasActiveJob, gameConnected, loading, isWorkerReady],
    ([hasJob, isGameConnected, isLoading, isWorkerReady]) => {
        if (!isLoading && isWorkerReady && isGameConnected && !hasJob) {
            const destination = activeSettings.value.lastDestination;

            if (destination && truckCoords.value) {
                clearRouteState();

                handleRouteClick(
                    destination,
                    truckCoords.value,
                    truckHeading.value,
                    true,
                );
            }
        }
    },
);

// We check each time the theme color changes to udate the map libre appsettings.default theme color
watch(
    () => activeSettings.value.themeColor,
    async (newColor) => {
        if (!map.value) return;

        if (map.value.hasImage("truck-icon")) {
            const newTruckImg = await generateTruckIcon(newColor);
            map.value.updateImage("truck-icon", newTruckImg);
        }

        if (map.value.getLayer("prefab-zones")) {
            const blended = blendWithBg(lightenColor(newColor, 0.3), 0.6);
            map.value.setPaintProperty("prefab-zones", "fill-color", blended);
        }
    },
);

// We set the routeFound back to null with a delay if its true / false.
watch(routeFound, (newVal) => {
    if (newVal !== null) {
        if (uiTimer) clearTimeout(uiTimer);

        uiTimer = setTimeout(() => {
            routeFound.value = null;
        }, 1000);
    }
});

// When loaded, checks gameConnected -> show map
watch([loading, gameConnected], ([isLoading, isGameConnected]) => {
    if (!isLoading) {
        setTimeout(() => {
            isCameraLocked.value = true;
        }, 100);

        if (isGameConnected) {
            setTimeout(() => {
                isCameraLocked.value = true;
            }, 500);
        }
    }
});

watch(gameConnected, (isConnected) => {
    if (!map.value) return;
    if (!isConnected) {
        isCameraLocked.value = false;
        clearRouteState();
    }
});

onMounted(async () => {
    // eruda.init(); // KEEP FOR DEBUGGING MOBILE
    await loadLocationData();
    if (!mapEl.value) return;
    if (isElectron.value) {
        (window as any).electronAPI.setWindowSize(900, 600, true, true);
    }

    try {
        const mapInstance = await initializeMap(mapEl.value);
        map.value = markRaw(mapInstance);
        if (!map.value) return;

        const initialTruckImg = await generateTruckIcon(
            activeSettings.value.themeColor,
        );
        map.value!.addImage("truck-icon", initialTruckImg, { pixelRatio: 2.5 });
        map.value!.addSource("truck-source", {
            type: "geojson",
            data: {
                type: "Feature",
                geometry: { type: "Point", coordinates: [0, 0] },
                properties: { heading: 0 },
            },
        });
        map.value.on("load", async () => {
            map.value!.addLayer({
                id: "truck-layer",
                type: "symbol",
                source: "truck-source",
                layout: {
                    "icon-image": "truck-icon",
                    "icon-rotate": ["get", "heading"],
                    "icon-rotation-alignment": "map",
                    "icon-allow-overlap": true,
                    "icon-ignore-placement": true,
                },
            });
            const graphData = await initializeGraphData();
            if (!graphData) return;
            const { nodes, edges } = graphData;
            initWorkerData(nodes, edges);

            setupRouteLayer();
            initCameraListeners();
        });

        map.value.on("click", async (e) => {
            const features = map.value!.queryRenderedFeatures(e.point, {
                layers: ["destination-layer"],
            });
            if (features.length > 0) return;

            console.log(
                ` ${e.lngLat.lat.toFixed(5)}, ${e.lngLat.lng.toFixed(5)}`,
            ); // KEEP FOR DEBUGGING BUGGED AREAS
            if (!isClickingEnabled.value) return;
            if (!gameConnected.value) return;
            if (!truckCoords.value) return;

            await handleRouteClick(
                [e.lngLat.lng, e.lngLat.lat],
                truckCoords.value,
                truckHeading.value,
                true,
            );
        });

        startTelemetry(() => {
            onTelemetryUpdate();
        });
    } catch (e) {
        console.error(e);
    }
});

onUnmounted(() => {
    stopTelemetry();
    destroyWorker();

    if (routeTimer) clearTimeout(routeTimer);
    if (uiTimer) clearTimeout(uiTimer);

    if (map.value) {
        map.value.remove();
        map.value = null;
    }
});

function onTelemetryUpdate() {
    if (!truckCoords.value || !map.value) return;

    const finalCoords = getSnappedCoords(truckCoords.value, truckHeading.value);

    followTruck(finalCoords, truckHeading.value);

    if (isRouteActive.value) {
        updateRouteProgress(finalCoords, truckHeading.value);
    }
}

function onStartNavigation() {
    if (!truckCoords.value) return;

    startNavigationMode(truckCoords.value, truckHeading.value);

    isSheetExpanded.value = false;
    isSheetHidden.value = true;
}

function onSheetClosed() {
    isSheetHidden.value = false;
    isSheetExpanded.value = false;
}

function toggleEnableClicking() {
    isClickingEnabled.value = !isClickingEnabled.value;

    clickingNotificationTrigger.value++;
}

const onResetNorth = () => {
    map.value?.easeTo({
        bearing: 0,
        pitch: 0,
        duration: 500,
    });
};

const onToggleFullscreen = async () => {
    const target = document.documentElement;

    try {
        if (!document.fullscreenElement) {
            await target.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                await document.exitFullscreen();
            }
        }

        setTimeout(() => {
            map.value?.resize();
        }, 100);
    } catch (err) {
        console.error("Fullscreen error:", err);
    }
};

const toggleSettingsPanel = () => {
    isSettingsPanelOpened.value = !isSettingsPanelOpened.value;
};
</script>

<template>
    <div
        ref="wrapperEl"
        class="full-page-wrapper"
        :class="{ 'platform-mobile': isMobile }"
    >
        <div ref="mapEl" class="map-container"></div>

        <div class="ui-safe-container">
            <Transition name="ui-layer-fade">
                <div v-show="!isSettingsPanelOpened" class="map-ui-layer">
                    <Transition name="fade">
                        <LoadingScreen v-if="loading" :progress="progress" />
                    </Transition>

                    <TopBar
                        :fuel="fuel"
                        :game-connected="gameConnected"
                        :game-time="gameTime"
                        :rest-stop-minutes="restStopMinutes"
                        :rest-stop-time="restStoptime"
                        :truck-speed="truckSpeed"
                        :is-web="isWeb"
                    />

                    <div class="left-buttons">
                        <HudButton
                            icon-name="material-symbols:arrow-back-rounded"
                            :onClick="goHome"
                        />
                        <HudButton
                            icon-name="flowbite:cog-outline"
                            :onClick="toggleSettingsPanel"
                        />
                    </div>

                    <NotificationGeneral
                        :icon-name="
                            isClickingEnabled
                                ? 'i-tabler:hand-click'
                                : 'i-tabler:hand-click-off'
                        "
                        :trigger="clickingNotificationTrigger"
                        :text="
                            isClickingEnabled
                                ? 'Tapping Enabled'
                                : 'Tapping Disabled'
                        "
                        :icon-color="isClickingEnabled ? '#4caf50' : '#dd4a34'"
                    />

                    <NotificationRoute
                        :is-route-found="routeFound"
                        :is-calculating-route="isCalculatingRoute"
                    />

                    <div class="hud-buttons">
                        <HudButton
                            v-if="isWeb"
                            icon-name="gridicons:fullscreen"
                            :onClick="onToggleFullscreen"
                        />
                        <HudButton
                            icon-name="ix:navigation"
                            :onClick="onResetNorth"
                        />
                        <HudButton
                            icon-name="fe:target"
                            :onClick="lockCamera"
                        />
                        <HudButton
                            :class="
                                isClickingEnabled ? 'red-icon' : 'green-icon'
                            "
                            :icon-name="
                                isClickingEnabled
                                    ? 'i-tabler:hand-click-off'
                                    : 'i-tabler:hand-click'
                            "
                            :onClick="toggleEnableClicking"
                        />
                    </div>

                    <SpeedLimit
                        :class="{
                            'pos-default': !isRouteActive || isSheetHidden,
                            'pos-expanded': isSheetExpanded && isRouteActive,
                            'pos-collapsed':
                                !isSheetExpanded &&
                                isRouteActive &&
                                !isSheetHidden,
                        }"
                        :truck-speed="truckSpeed"
                        :speed-limit="speedLimit"
                    />

                    <div class="warnings">
                        <WarningSlide
                            :show-if="hasInGameMarker && !isRouteActive"
                            :reset-on="isRouteActive"
                            text="External Route Detected: Set Waypoint"
                        />

                        <WarningSlide
                            :show-if="!gameConnected"
                            :reset-on="gameConnected"
                            text="Game Offline"
                        />
                    </div>

                    <Transition name="sheet-slide" @after-leave="onSheetClosed">
                        <SheetSlide
                            v-if="isRouteActive"
                            :clear-route-state="clearRouteState"
                            :has-active-job="hasActiveJob"
                            :on-start-navigation="onStartNavigation"
                            :destination-name="destinationName"
                            v-model:is-sheet-expanded="isSheetExpanded"
                            v-model:is-sheet-hidden="isSheetHidden"
                            :route-distance="routeDistance"
                            :route-eta="routeEta"
                            :speed-limit="speedLimit"
                            :truck-speed="truckSpeed"
                        />
                    </Transition>
                </div>
            </Transition>

            <Transition name="panel-pop">
                <SettingsPanel
                    v-show="isSettingsPanelOpened"
                    :close-panel="toggleSettingsPanel"
                />
            </Transition>
        </div>
    </div>
</template>

<style scoped lang="scss" src="~/assets/scss/scoped/map/map.scss"></style>
