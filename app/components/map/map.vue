<script lang="ts" setup>
import { motion, type PanInfo } from "motion-v";
import { ref, onMounted, shallowRef, Transition } from "vue";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { usePlatform } from "~/composables/Platform";
import {
    blendWithBg,
    darkenColor,
    lightenColor,
} from "~/assets/utils/shared/colors";
import { generateTruckIcon } from "~/assets/utils/map/markers";
import type { settingsView } from "~/types";
import {
    getPercentage,
    getRestPercentage,
} from "~/assets/utils/telemetry/helpers";
import { anim } from "~/assets/utils/animations/anim";

const emit = defineEmits(["goHome"]);

// MAP STATE
const mapEl = shallowRef<HTMLElement | null>(null);
const map = shallowRef<maplibregl.Map | null>(null);
const isClickingEnabled = ref(true);
const isAddingStopMode = ref(false);

// UI STATE
const isSheetHidden = ref(true);
const activeTab = ref<"drive" | "trip" | "settings">("drive");

const tabs = ["fuel-rest", "destination", "cargo"] as const;
const activeCardsTab = ref<"fuel-rest" | "destination" | "cargo">("fuel-rest");

const activeSettingsWindowView = ref<settingsView>("main");

const hudBtnsRef = ref<HTMLElement | null>(null);

// JOB STATE
const currentJobKey = ref<string>("");

// NOTIFICATION TRIGGERS
const notificationPing = ref(0);

// Telemetry Data
const {
    startTelemetry,
    stopTelemetry,
    gameConnected,
    truckCoords,
    truckSpeed,
    speedLimit,
    truckHeading,
    hasInGameMarker,
    hasActiveJob,
    destinationCity,
    scale,
    averageSpeed,
    destinationCompany,
    fuel,
    fuelCapacity,
    restStopMinutes,
    remainingTime,
} = useEtsTelemetry();

// Map Areas Data
const { loadLocationData, findDestinationCoords, mapScaleConfig } =
    useCityData();

// Check Platform
const { isElectron, isMobile, isWeb } = usePlatform();

// Graph manipulation
const { loading, progress, adjacency, nodeCoords, initializeGraphData } =
    useGraphSystem();

const { kmToUserUnits, distanceUnit } = useUnitConversion();

// Maplibre Camera
const {
    initCameraListeners,
    followTruck,
    startNavigationMode,
    stopNavigationMode,
    initMarker,
    updateMarkerSize,
    updateMarkerImage,
    resetTruck,
    isCameraLocked,
    isNavigating,
    isHeadingActive,
    isNorthActive,
    toggleHeadingFollow,
    toggleNorthFollow,
    resumeCameraLock,
    focusTruckInitial,
} = useMapCamera(map);

const {
    setupRouteLayer,
    handleRouteClick,
    updateRouteProgress,
    clearRouteState,
    destinationName,
    stopsNames,
    routeDistance,
    routeEtaHours,
    routeEtaMinutes,
    isCalculating: isCalculatingRoute,
    isWorkerReady,
    initWorkerData,
    destroyWorker,
    isRouteActive,
    routeFound,
    fullRouteDirections,
    nextTurnDistance,
} = useRouteController(map, adjacency, nodeCoords, stopNavigationMode);

// Settings Controller
const { activeSettings, settings } = useSettings();
const { t } = useTranslations();

let routeTimer: ReturnType<typeof setTimeout> | null = null;

loading.value = true;
progress.value = 0;

const hasInitialFocused = ref(false);

const routeDistanceConverted = computed(() =>
    kmToUserUnits(routeDistance.value),
);

const isTruckSpawned = computed(() => {
    return (
        truckCoords.value &&
        (truckCoords.value[0] !== 0 || truckCoords.value[1] !== 0)
    );
});

const isMapReady = computed(
    () =>
        gameConnected.value &&
        !loading.value &&
        isWorkerReady.value &&
        isTruckSpawned.value,
);

watch(isMapReady, (ready) => {
    if (ready && !hasInitialFocused.value && truckCoords.value) {
        hasInitialFocused.value = true;
        focusTruckInitial(truckCoords.value, truckHeading.value);
    }
});

const currentJobTarget = computed(() => {
    if (!hasActiveJob.value || !destinationCity.value) return null;

    return `${destinationCity.value}|${destinationCompany.value}`;
});

watch([currentJobTarget, isMapReady], async ([jobTarget, isReady]) => {
    if (!isReady) return;

    if (!jobTarget) {
        if (currentJobKey.value !== "") {
            clearRouteState();
            stopNavigationMode();
            currentJobKey.value = "";
        }
        return;
    }

    if (jobTarget === currentJobKey.value) return;

    const destCoords = findDestinationCoords(
        destinationCity.value,
        destinationCompany.value,
    );

    let targetRoute: [number, number][];

    const savedJob = activeSettings.value.lastJob;
    if (savedJob?.key === jobTarget && savedJob?.lastRoute?.length) {
        targetRoute = savedJob.lastRoute;
    } else {
        targetRoute = destCoords ? [destCoords] : [];
    }

    if (targetRoute.length > 0 && truckCoords.value) {
        currentJobKey.value = jobTarget;
        isClickingEnabled.value = false;

        await handleRouteClick(
            targetRoute,
            truckCoords.value,
            truckHeading.value,
            scale.value,
            averageSpeed.value,
        );
    }
});

watch([hasActiveJob, isMapReady], ([hasJob, isReady]) => {
    if (!isReady || hasJob) return;

    const savedRoute = activeSettings.value.lastJob?.lastRoute;

    if (
        savedRoute &&
        savedRoute.length > 0 &&
        !isRouteActive.value &&
        !isCalculatingRoute.value &&
        truckCoords.value
    ) {
        handleRouteClick(
            savedRoute,
            truckCoords.value,
            truckHeading.value,
            scale.value,
            averageSpeed.value,
        );
    }
});

watch(isRouteActive, (routeActive) => {
    if (!routeActive) {
        clearRouteState();
    }
});

watch(
    [
        () => activeSettings.value.arrowColor,
        () => activeSettings.value.discColor,
        () => activeSettings.value.rimColor,
        () => activeSettings.value.outerRimEnabled,
    ],
    async ([arrowColor, discColor, rimColor]) => {
        const newTruckImg = await generateTruckIcon(
            arrowColor,
            discColor,
            rimColor,
        );
        updateMarkerImage(newTruckImg.src);
    },
);

watch(
    () => activeSettings.value.themeColor,
    (themeColor) => {
        if (!map.value) return;

        if (map.value.getLayer("prefab-zones")) {
            const blended = blendWithBg(lightenColor(themeColor, 0.3), 0.6);
            map.value.setPaintProperty("prefab-zones", "fill-color", blended);
        }
    },
);

watch(
    () => activeSettings.value.backgroundColor,
    async (newColor) => {
        if (!map.value) return;

        if (map.value.getLayer("background")) {
            map.value.setPaintProperty(
                "background",
                "background-color",
                newColor,
            );
        }
    },
);

watch(
    () => activeSettings.value.landColor,
    async (newColor) => {
        if (!map.value) return;

        if (map.value.getLayer("water")) {
            map.value.setPaintProperty("water", "fill-color", newColor);
        }

        if (map.value.getLayer("country-borders")) {
            map.value.setPaintProperty(
                "country-borders",
                "fill-color",
                darkenColor(newColor, 0.4),
            );
        }

        if (map.value.getLayer("water-outline")) {
            map.value.setPaintProperty(
                "water-outline",
                "line-color",
                darkenColor(newColor, 0.4),
            );
        }
    },
);

watch(
    () => activeSettings.value.roadColor,
    async (newColor) => {
        if (!map.value) return;

        if (map.value.getLayer("roads")) {
            map.value.setPaintProperty("roads", "line-color", newColor);
        }
    },
);

watch(
    () => settings.value.truckMarkerSize,
    (newSize) => {
        if (newSize) {
            updateMarkerSize(newSize);
        }
    },
);

watch(
    () => activeSettings.value.fontFamily,
    (newFont) => {
        if (!map.value) return;

        const textLayers = [
            "village-labels",
            "city-labels",
            "capital-major-labels",
            "country-labels",
        ];

        textLayers.forEach((layerId) => {
            if (map.value!.getLayer(layerId)) {
                map.value!.setLayoutProperty(layerId, "text-font", [newFont]);
            }
        });
    },
);

watch(routeFound, (newVal) => {
    if (newVal === true) {
        if (isNavigating.value) return;
        if (stopsNames.value.length > 2) return;

        isSheetHidden.value = false;
    }
});

watch(gameConnected, (isConnected) => {
    if (!map.value) return;
    if (!isConnected) {
        isCameraLocked.value = false;
        hasInitialFocused.value = false;
        clearRouteState();
        resetTruck();
    }
});

watch(loading, async (isLoading) => {
    if (!isLoading) {
        if (hudBtnsRef.value) {
            await nextTick();
            anim.staggerListXReverse(hudBtnsRef.value, 0.1);
        }
    }
});

onMounted(async () => {
    await loadLocationData();
    if (!mapEl.value) return;
    if (isElectron.value) {
        (window as any).electronAPI.setWindowSize(950, 700, true, true);
    }

    try {
        const mapInstance = await initializeMap(mapEl.value);
        map.value = markRaw(mapInstance);
        if (!map.value) return;

        const initialTruckImg = await generateTruckIcon(
            activeSettings.value.arrowColor,
            activeSettings.value.discColor,
            activeSettings.value.rimColor,
        );
        map.value.on("load", async () => {
            initMarker(initialTruckImg.src, settings.value.truckMarkerSize);
            const graphData = await initializeGraphData();
            if (!graphData) return;

            const { nodes, graphBuffer, geometryBuffer } = graphData;
            if (!nodes || !graphBuffer || !geometryBuffer) return;

            initWorkerData(nodes, graphBuffer, geometryBuffer);

            setupRouteLayer();
            initCameraListeners();
        });

        map.value.on("click", async (e) => {
            const features = map.value!.queryRenderedFeatures(e.point, {
                layers: ["destination-layer"],
            });
            if (features.length > 0) return;

            if (!isClickingEnabled.value) return;
            if (!gameConnected.value) return;
            if (!truckCoords.value) return;

            const currentScale =
                scale.value > 0 ? scale.value : mapScaleConfig.value.ruralScale;

            const clickCoords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
            const isInsertMode = isRouteActive.value && isAddingStopMode.value;
            isAddingStopMode.value = false;

            await handleRouteClick(
                clickCoords,
                truckCoords.value,
                truckHeading.value,
                currentScale,
                averageSpeed.value,
                isInsertMode,
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

    if (map.value) {
        map.value.remove();
        map.value = null;
    }
});

function resetJob() {
    const destCoords = findDestinationCoords(
        destinationCity.value,
        destinationCompany.value,
    );

    if (destCoords && isTruckSpawned.value && truckCoords.value) {
        handleRouteClick(
            destCoords,
            truckCoords.value,
            truckHeading.value,
            scale.value,
            averageSpeed.value,
            false,
            true,
        );
    }
}

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

function onResumeNavigation() {
    if (!truckCoords.value) return;

    resumeCameraLock();

    isSheetHidden.value = true;
}

function toggleEnableClicking() {
    isClickingEnabled.value = !isClickingEnabled.value;

    notificationPing.value++;
}

const toggleAddStopClicked = () => {
    isAddingStopMode.value = !isAddingStopMode.value;

    if (isAddingStopMode.value) {
        isClickingEnabled.value = true;
    }
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

const onCancelRoute = () => {
    clearRouteState();
    stopNavigationMode();
};

const handleTabClicked = (tab: "drive" | "trip" | "settings") => {
    if (tab === "settings" && activeTab.value === "settings") {
        activeSettingsWindowView.value = "main";
    }

    if (tab === "drive" && activeTab.value === "drive") {
        toggleIsSheetHidden();
    }
};

function handleDragEnd(_event: PointerEvent, info: PanInfo) {
    const threshold = 50;
    const velocityThreshold = 400;

    const currentIndex = tabs.indexOf(activeCardsTab.value);

    if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
        if (currentIndex < tabs.length - 1) {
            activeCardsTab.value = tabs[currentIndex + 1]!;
        }
    }

    if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
        if (currentIndex > 0) {
            activeCardsTab.value = tabs[currentIndex - 1]!;
        }
    }
}

function clickCardView() {
    const currentIndex = tabs.indexOf(activeCardsTab.value);

    if (currentIndex === tabs.length - 1) {
        activeCardsTab.value = tabs[0];
    } else {
        activeCardsTab.value = tabs[currentIndex + 1]!;
    }
}

function toggleIsSheetHidden() {
    isSheetHidden.value = !isSheetHidden.value;
}

const lowNotificationPing = ref(0);

const fuelPercentage = computed(() => {
    return getPercentage(fuel.value, fuelCapacity.value);
});

const restPercentage = computed(() => {
    return getRestPercentage(
        restStopMinutes.value,
        settings.value.selectedGame,
    );
});

const initialDeliveryMinutes = computed(() => {
    const saved = activeSettings.value.lastJob;
    return saved.initialMinutes;
});

const remainingTimePercentage = computed(() =>
    getPercentage(remainingTime.value, initialDeliveryMinutes.value),
);

const lowNotification = computed(() => {
    if (!isMapReady.value || !isTruckSpawned.value) return null;

    const isFuelLow = fuelPercentage.value < 15;
    const isRestLow = restPercentage.value < 18;
    const isJobUrgent =
        hasActiveJob.value && remainingTimePercentage.value < 12;

    if (isFuelLow && isRestLow && isJobUrgent) {
        return {
            text: "Critical: Fuel, Rest & Job",
            icon: "lucide:alert-triangle",
        };
    }

    if (isFuelLow && isRestLow) {
        return {
            text: t("notifications.lowFuelRest"),
            icon: "lucide:alert-triangle",
        };
    }
    if (isFuelLow && isJobUrgent) {
        return {
            text: t("notifications.lowFuelJob"),
            icon: "lucide:alert-triangle",
        };
    }
    if (isRestLow && isJobUrgent) {
        return {
            text: t("notifications.lowRestJob"),
            icon: "lucide:alert-triangle",
        };
    }

    if (isFuelLow) {
        return { text: t("notifications.lowFuel"), icon: "lucide:fuel" };
    }
    if (isRestLow) {
        return { text: t("notifications.lowRest"), icon: "lucide:bed" };
    }
    if (isJobUrgent) {
        return {
            text:
                remainingTime.value <= 0
                    ? t("notifications.deliveryLate")
                    : t("notifications.deliveryUrgent"),
            icon: "lucide:clock-alert",
        };
    }

    return null;
});

watch(
    () => lowNotification.value?.text,
    (newText, oldText) => {
        if (newText && newText !== oldText) {
            lowNotificationPing.value++;
        }
    },
);
</script>

<template>
    <div
        ref="wrapperEl"
        class="full-page-wrapper"
        :class="{ 'platform-mobile': isMobile }"
    >
        <div ref="mapEl" class="map-container"></div>

        <LoadingScreen :show="loading" :progress="progress" />

        <div class="ui-safe-container">
            <AnimTransition type="fade">
                <div
                    class="map-ui-layer"
                    v-show="activeTab === 'drive'"
                    key="drive"
                >
                    <AnimTransitionGroup
                        type="turnCard"
                        class="maneuver-notifications-wrapper safe-side-left"
                    >
                        <ManeuverCard
                            v-if="
                                isNavigating && activeSettings.hasTurnNavigation
                            "
                            :upcoming-turns="fullRouteDirections"
                            :distance-to-next-turn="nextTurnDistance"
                            key="maneuver"
                            :next-instruction="
                                fullRouteDirections[1]?.text ||
                                t('map.followRoute')
                            "
                        />

                        <NotificationGeneral
                            v-if="!gameConnected"
                            :persistent="true"
                            key="offline"
                            :text="t('common.gameOffline')"
                        >
                            <template #icon>
                                <Icon
                                    name="lucide:wifi-off"
                                    class="notif-icon failed"
                                    size="24"
                                    :style="{ color: '#dd4a34' }"
                                />
                            </template>
                        </NotificationGeneral>

                        <NotificationRoute
                            v-if="routeFound !== null || isCalculatingRoute"
                            :is-route-found="routeFound"
                            key="route"
                            :is-calculating-route="isCalculatingRoute"
                            v-model="routeFound"
                        />

                        <NotificationGeneral
                            v-if="!!lowNotification"
                            key="low-notif"
                            :text="lowNotification?.text || ''"
                            :trigger="lowNotificationPing"
                            :duration="10000"
                        >
                            <template #icon>
                                <Icon
                                    :name="
                                        lowNotification?.icon ||
                                        'lucide:alert-triangle'
                                    "
                                    class="notif-icon"
                                    :style="{ color: '#dd4a34' }"
                                />
                            </template>
                        </NotificationGeneral>

                        <NotificationGeneral
                            :trigger="notificationPing"
                            :text="
                                isClickingEnabled
                                    ? t('map.tappingEnabled')
                                    : t('map.tappingDisabled')
                            "
                            :duration="2000"
                        >
                            <template #icon>
                                <Icon
                                    v-if="isClickingEnabled"
                                    class="notif-icon"
                                    name="lucide:pointer"
                                    :style="{ color: '#0ea674' }"
                                />

                                <Icon
                                    v-else
                                    class="notif-icon"
                                    name="lucide:pointer-off"
                                    :style="{ color: '#dd4a34' }"
                                />
                            </template>
                        </NotificationGeneral>
                    </AnimTransitionGroup>

                    <div ref="hudBtnsRef" class="hud-buttons safe-side-right">
                        <HudButton v-if="isWeb" :onClick="onToggleFullscreen">
                            <Icon name="lucide:fullscreen" class="icon" />
                        </HudButton>

                        <HudButton
                            :is-active="isNorthActive"
                            :class="{ 'theme-color': isNorthActive }"
                            :onClick="toggleNorthFollow"
                        >
                            <Icon name="lucide:compass" class="icon" />
                        </HudButton>

                        <HudButton
                            :is-active="isHeadingActive"
                            :class="{ 'theme-color': isHeadingActive }"
                            :onClick="toggleHeadingFollow"
                        >
                            <Icon name="lucide:navigation-2" class="icon" />
                        </HudButton>

                        <HudButton
                            :is-active="isClickingEnabled"
                            :class="isClickingEnabled ? 'theme-color' : ''"
                            :onClick="toggleEnableClicking"
                        >
                            <Icon
                                v-if="isClickingEnabled"
                                name="lucide:pointer"
                                class="icon"
                            />
                            <Icon
                                v-else
                                name="lucide:pointer-off"
                                class="icon"
                            />
                        </HudButton>

                        <HudButton
                            class="add-stop-hud-btn"
                            v-if="isAddingStopMode"
                            :onClick="toggleAddStopClicked"
                        >
                            <Icon name="lucide:map-pin-plus" class="icon" />
                        </HudButton>
                    </div>

                    <div class="speed-limit-wrapper safe-side-left">
                        <SpeedLimit />
                    </div>

                    <div
                        :class="{
                            'no-bottom-card':
                                !settings.activeUiComponents.includes(
                                    'details-cards',
                                ),
                        }"
                        class="compact-trip"
                    >
                        <CompactTrip
                            :route-distance-converted="routeDistanceConverted"
                            :distance-unit="distanceUnit"
                            :is-route-active="isRouteActive"
                            :route-eta-hours="routeEtaHours"
                            :route-eta-minutes="routeEtaMinutes"
                            :is-slide-sheet-opened="!isSheetHidden"
                            @click="toggleIsSheetHidden"
                        />
                    </div>

                    <SheetSlide
                        :on-stop-navigation="onCancelRoute"
                        :is-navigating="isNavigating"
                        :on-start-navigation="onStartNavigation"
                        :has-active-job="hasActiveJob"
                        :on-resume-navigation="onResumeNavigation"
                        :destination-name="destinationName"
                        :stops-names="stopsNames"
                        v-model:is-sheet-hidden="isSheetHidden"
                        :route-distance-converted="routeDistanceConverted"
                        :route-eta-hours="routeEtaHours"
                        :route-eta-minutes="routeEtaMinutes"
                        :is-route-active="isRouteActive"
                        @update:add-stop-clicked="toggleAddStopClicked"
                        @update:reset-job-clicked="resetJob"
                    />

                    <motion.div
                        @pan-end="handleDragEnd"
                        @click="clickCardView"
                        class="drive-hud-panel safe-side-right"
                        v-if="
                            settings.activeUiComponents.includes(
                                'details-cards',
                            )
                        "
                    >
                        <AnimTransition type="fade">
                            <div
                                v-if="activeCardsTab === 'fuel-rest'"
                                class="hud-panel-group"
                            >
                                <VehicleCard variant="drive-view" />
                                <RestCard variant="drive-view" />
                            </div>

                            <div
                                v-if="activeCardsTab === 'destination'"
                                class="hud-panel-group"
                            >
                                <DriveJobCard variant="drive-view" />
                            </div>

                            <div
                                v-if="activeCardsTab === 'cargo'"
                                class="hud-panel-group"
                            >
                                <DriveCargoCard variant="drive-view" />
                            </div>
                        </AnimTransition>

                        <div class="carousel-dots">
                            <div
                                class="dot"
                                :class="{
                                    active: activeCardsTab === 'fuel-rest',
                                }"
                            ></div>

                            <div
                                class="dot"
                                :class="{
                                    active: activeCardsTab === 'destination',
                                }"
                            ></div>

                            <div
                                class="dot"
                                :class="{
                                    active: activeCardsTab === 'cargo',
                                }"
                            ></div>
                        </div>
                    </motion.div>
                </div>
            </AnimTransition>

            <AnimTransition type="view">
                <Trip
                    v-show="activeTab === 'trip'"
                    key="trip"
                    :route-distance-converted="routeDistanceConverted"
                />
            </AnimTransition>

            <AnimTransition type="view">
                <SettingsPanel
                    @go-home="emit('goHome')"
                    @go-map-view="activeTab = 'drive'"
                    v-model="activeSettingsWindowView"
                    key="settings"
                    v-show="activeTab === 'settings'"
                />
            </AnimTransition>

            <BottomPillTabs
                v-model="activeTab"
                @tab-clicked="handleTabClicked"
            />
        </div>
    </div>
</template>

<style scoped lang="scss" src="~/assets/scss/scoped/map/map.scss"></style>
