<script lang="ts" setup>
import { ref, onMounted, shallowRef, Transition } from "vue";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
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
    scale,
    averageSpeed,
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
const { loading, progress, adjacency, nodeCoords, initializeGraphData } =
    useGraphSystem();

//
//
// Maplibre Camera
const {
    isCameraLocked,
    isAutoFollowEnabled,
    isNavigating,
    initCameraListeners,
    followTruck,
    startNavigationMode,
    stopNavigationMode,
    initMarker,
    updateMarkerImage,
    toggleAutoFollow,
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
    fullRouteDirections,
    nextTurnDistance,
} = useRouteController(map, adjacency, nodeCoords, stopNavigationMode);

//
//
// Settings Controller
const { activeSettings, settings } = useSettings();

let uiTimer: ReturnType<typeof setTimeout> | null = null;
let routeTimer: ReturnType<typeof setTimeout> | null = null;

// Forcing loading screen before mounting elements to prevent flashing between game changes
loading.value = true;
progress.value = 0;

const isTruckSpawned = computed(() => {
    return (
        truckCoords.value &&
        (truckCoords.value[0] !== 0 || truckCoords.value[1] !== 0)
    );
});

// We check if it has active job, if it has one, plot a route
watch(
    [
        hasActiveJob,
        destinationCity,
        destinationCompany,
        gameConnected,
        loading,
        isWorkerReady,
        isTruckSpawned,
    ],
    async ([
        hasJob,
        city,
        company,
        isConnected,
        isLoading,
        isWorkerReady,
        truckReady,
    ]) => {
        if (!truckCoords.value) return;
        if (isLoading || !isWorkerReady || !isConnected || !truckReady) {
            currentJobKey.value = "";
            return;
        }

        const newJobKey = hasJob ? `${city}|${company}` : "";

        if (hasJob && newJobKey === currentJobKey.value) return;

        if (routeTimer) clearTimeout(routeTimer);

        if (hasJob && newJobKey !== currentJobKey.value) {
            const destCoords = findDestinationCoords(city, company);

            if (destCoords) {
                currentJobKey.value = newJobKey;
                clearRouteState();
                isClickingEnabled.value = false;

                await handleRouteClick(
                    destCoords,
                    truckCoords.value,
                    truckHeading.value,
                    scale.value,
                    false,
                    averageSpeed.value,
                );
            }
        } else if (!hasJob && currentJobKey.value !== "") {
            clearRouteState();
            stopNavigationMode();
            currentJobKey.value = "";
        }
    },
);

watch(
    [hasActiveJob, gameConnected, loading, isWorkerReady, isTruckSpawned],
    ([hasJob, isGameConnected, isLoading, isWorkerReady, truckReady]) => {
        if (!truckCoords.value) return;
        if (
            isLoading ||
            !isWorkerReady ||
            !isGameConnected ||
            hasJob ||
            !truckReady
        )
            return;

        const destination = activeSettings.value.lastDestination;

        if (destination && !isRouteActive.value && !isCalculatingRoute.value) {
            handleRouteClick(
                destination,
                truckCoords.value,
                truckHeading.value,
                scale.value,
                true,
                averageSpeed.value,
            );
        }
    },
);

// We check each time the theme color changes to udate the map libre appsettings.default theme color
watch(
    () => activeSettings.value.themeColor,
    async (newColor) => {
        if (!map.value) return;

        const newTruckImg = await generateTruckIcon(newColor);
        updateMarkerImage(newTruckImg.src);

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
        map.value.on("load", async () => {
            initMarker(initialTruckImg.src);
            const graphData = await initializeGraphData();
            if (!graphData) return;

            initWorkerData(
                graphData.nodes,
                graphData.graphBuffer,
                graphData.geometryBuffer,
            );

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

            const currentScale =
                scale.value > 0
                    ? scale.value
                    : settings.value.selectedGame === "ats"
                      ? 20
                      : 19;

            await handleRouteClick(
                [e.lngLat.lng, e.lngLat.lat],
                truckCoords.value,
                truckHeading.value,
                currentScale,
                true,
                averageSpeed.value,
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

    followTruck(truckCoords.value, truckHeading.value);

    if (isRouteActive.value) {
        updateRouteProgress(
            truckCoords.value,
            truckHeading.value,
            scale.value,
            averageSpeed.value,
        );
    }
}

function onStartNavigation() {
    if (!truckCoords.value) return;

    startNavigationMode(truckCoords.value, truckHeading.value);

    isSheetHidden.value = true;
}

function onSheetClosed() {
    isSheetHidden.value = false;
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

const onCancelRoute = () => {
    clearRouteState();
    stopNavigationMode();
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

                    <ManeuverCard
                        v-show="isNavigating"
                        :upcoming-turns="fullRouteDirections"
                        :distance-to-next-turn="nextTurnDistance"
                        :next-instruction="
                            fullRouteDirections[1]?.text || 'Follow Route'
                        "
                    />

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
                            :class="isAutoFollowEnabled ? 'green-icon' : ''"
                            :icon-name="
                                isAutoFollowEnabled
                                    ? 'material-symbols:my-location'
                                    : 'material-symbols:location-searching'
                            "
                            :onClick="toggleAutoFollow"
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
                            :on-stop-navigation="onCancelRoute"
                            :is-navigating="isNavigating"
                            :on-start-navigation="onStartNavigation"
                            :destination-name="destinationName"
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
