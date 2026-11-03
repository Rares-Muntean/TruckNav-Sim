<script lang="ts" setup>
import type { PanInfo } from "motion";
import { animate } from "motion";
import { motion, useDragControls } from "motion-v";
import type { LocationData } from "~/composables/CityData";

const props = withDefaults(
    defineProps<{
        isSheetHidden: boolean;
        truckSpeed: number;
        hasActiveJob: boolean;
        speedLimit: number;
        destinationName: LocationData | undefined;
        stopsNames: LocationData[];
        routeEtaHours: string;
        routeEtaMinutes: string;
        routeDistanceConverted: number;
        isNavigating: boolean;
        onStopNavigation: () => void;
        onStartNavigation: () => void;
        onResumeNavigation: () => void;

        isRouteActive?: boolean;
    }>(),
    {
        isRouteActive: true,
    },
);

const { distanceUnit } = useUnitConversion();
const { t } = useTranslations();

const emit = defineEmits<{
    (e: "update:isSheetHidden", value: boolean): void;
    (e: "update:isSheetExpanded", value: boolean): void;
    (e: "update:addStopClicked"): void;
    (e: "update:resetJobClicked"): void;
}>();

const controls = useDragControls();
const progressBarRef = ref<HTMLElement | null>(null);
const countdown = ref(0);

let progressAnim: ReturnType<typeof animate> | null = null;
let countdownTimer: ReturnType<typeof setInterval> | null = null;

const MEDIA_QUERY = "(orientation: landscape), (min-width: 768px)";
const isSidePanel = ref(false);

const cancelAutoStart = () => {
    progressAnim?.stop();
    progressAnim = null;

    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }

    countdown.value = 0;
};

const startCountdown = () => {
    cancelAutoStart();
    countdown.value = 9;

    countdownTimer = setInterval(() => {
        countdown.value = countdown.value - 1;
        if (countdown.value === 0) {
            cancelAutoStart();
        }
    }, 1000);

    if (progressBarRef.value) {
        progressAnim = animate(
            progressBarRef.value,
            { scaleX: [1, 0] },
            { duration: 9, ease: "linear" },
        );

        progressAnim.finished
            .then(() => {
                cancelAutoStart();
                props.onStartNavigation();
            })
            .catch(() => {});
    }
};

onMounted(() => {
    const mediaQueryList = window.matchMedia(MEDIA_QUERY);
    isSidePanel.value = mediaQueryList.matches;

    const handler = (e: MediaQueryListEvent) => {
        isSidePanel.value = e.matches;
    };
    mediaQueryList.addEventListener("change", handler);

    onUnmounted(() => {
        cancelAutoStart();
        mediaQueryList.removeEventListener("change", handler);
    });
});

watch(
    () => props.isNavigating,
    (navigating) => {
        if (navigating) cancelAutoStart();
    },
);

watch(
    () => props.isRouteActive,
    (active) => {
        if (active && !props.isNavigating) {
            startCountdown();
        } else {
            cancelAutoStart();
        }
    },
);

watch(
    () => props.isSheetHidden,
    (hidden) => {
        if (hidden) cancelAutoStart();
    },
);

const onToggleSheetHidden = () => {
    emit("update:isSheetHidden", !props.isSheetHidden);
};

const handleDragEnd = (_event: PointerEvent, info: PanInfo) => {
    if (isSidePanel.value) {
        if (info.offset.x < -60 || info.velocity.x < -400) {
            cancelAutoStart();
            emit("update:isSheetHidden", true);
        }
    } else {
        if (info.offset.y > 80 || info.velocity.y > 500) {
            cancelAutoStart();
            emit("update:isSheetHidden", true);
        }
    }
};

const handleAddStopClick = () => {
    onToggleSheetHidden();
    emit("update:addStopClicked");
};

const handleResetToJob = () => {
    emit("update:resetJobClicked");
};

const handleStartOrResume = () => {
    cancelAutoStart();

    if (props.isNavigating) {
        props.onResumeNavigation();
        onToggleSheetHidden();
    } else {
        props.onStartNavigation();
    }
};
</script>

<template>
    <motion.div
        :drag="isSidePanel ? 'x' : 'y'"
        drag-snap-to-origin
        :drag-constraints="isSidePanel ? { right: 0 } : { top: 0 }"
        :drag-elastic="
            isSidePanel ? { right: 0, left: 0.1 } : { top: 0, bottom: 0.1 }
        "
        :drag-listener="false"
        :drag-controls="controls"
        :initial="
            isSidePanel ? { x: '-100%', y: '0%' } : { y: '100%', x: '0%' }
        "
        :animate="
            isSidePanel
                ? { x: isSheetHidden ? '-100%' : '0%', y: '0%' }
                : { y: isSheetHidden ? '100%' : '0%', x: '0%' }
        "
        :transition="{ type: 'spring', damping: 32, stiffness: 300 }"
        class="bottom-sheet"
        @drag-end="handleDragEnd"
    >
        <div class="sheet-body" @pointerdown="(e) => controls.start(e)">
            <div class="top-sheet">
                <div class="drag-pill-wrapper">
                    <div class="drag-pill"></div>
                </div>

                <div class="top-row">
                    <div class="full-stats">
                        <div class="stat-block">
                            <div v-if="isRouteActive" class="route-info">
                                <div class="route-distance-wrapper">
                                    <span>{{ routeDistanceConverted }}</span>
                                    <span class="unit">{{ distanceUnit }}</span>
                                </div>

                                <div>·</div>

                                <div class="route-distance-flex">
                                    <div class="route-distance-wrapper">
                                        <span>{{ routeEtaHours }}</span>
                                        <span class="unit white">h</span>
                                    </div>

                                    <div class="route-distance-wrapper">
                                        <span>{{ routeEtaMinutes }}</span>
                                        <span class="unit white">m</span>
                                    </div>
                                </div>
                            </div>

                            <template v-else>
                                <span class="free-roam">Free Roam</span>
                            </template>
                        </div>
                    </div>

                    <div>
                        <button
                            @click="emit('update:isSheetHidden', true)"
                            class="nav-btn dark icon-close"
                        >
                            <Icon name="lucide:x" size="20" class="icon" />
                        </button>
                    </div>
                </div>
            </div>

            <div class="small-separator"></div>

            <div class="sheet-content">
                <div class="category-wrapper">
                    <p class="category-title small">STOPS TIMELINE</p>

                    <div class="stops-timeline" @pointerdown.stop>
                        <template
                            v-if="stopsNames.length > 0"
                            v-for="(data, index) in stopsNames"
                        >
                            <div class="location-data">
                                <div class="icon-city-wrapper">
                                    <div class="icon-wrapper">
                                        <Icon
                                            v-if="index === 0"
                                            name="lucide:warehouse"
                                            class="icon"
                                        />

                                        <Icon
                                            v-else-if="
                                                index === stopsNames.length - 1
                                            "
                                            name="lucide:flag-triangle-right"
                                            class="icon"
                                        />

                                        <Icon
                                            v-else
                                            name="lucide:circle-small"
                                            class="icon"
                                        />
                                    </div>

                                    <div class="city-country">
                                        <span>{{ data.city }}</span>
                                        <div class="data-pill">
                                            <span>{{ data.country }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div
                                v-if="index < stopsNames.length - 1"
                                class="separator-wrapper"
                            >
                                <div class="timeline-separator" />
                            </div>
                        </template>

                        <template v-else>
                            <div class="middle-wrapper">
                                <div class="middle-icon-wrapper">
                                    <Icon
                                        name="lucide:compass"
                                        size="50"
                                        class="middle-icon"
                                    />
                                </div>

                                <div class="bottom-text">
                                    <div class="header-wrapper">
                                        <span class="header"
                                            >Open Road Ahead</span
                                        >
                                    </div>

                                    <span class="sub-header">
                                        No active delivery. Pick up a contract
                                        from the freight market or enjoy the
                                        drive.
                                    </span>
                                </div>
                            </div>
                        </template>
                    </div>
                </div>

                <div class="buttons-wrapper">
                    <div class="small-separator"></div>

                    <div class="stop-buttons">
                        <button
                            v-if="hasActiveJob"
                            @pointerdown.stop
                            class="nav-btn dark full-width"
                            v-on:click="handleResetToJob"
                        >
                            <Icon name="lucide:refresh-ccw" class="icon" />
                            <span>Job</span>
                        </button>

                        <button
                            @pointerdown.stop
                            class="nav-btn dark full-width"
                            v-on:click="handleAddStopClick"
                        >
                            <Icon
                                name="lucide:map-pin-plus-inside"
                                class="icon"
                            />
                            <span>{{ t("map.addStop") }}</span>
                        </button>
                    </div>

                    <div class="action-buttons" @pointerdown.stop>
                        <button
                            v-show="isNavigating"
                            class="nav-btn red square"
                            @click.prevent="onStopNavigation"
                        >
                            <Icon name="lucide:x" size="22" class="icon" />
                        </button>

                        <button
                            class="start-btn nav-btn"
                            @click.prevent="handleStartOrResume"
                        >
                            <div
                                v-show="countdown > 0 && !isNavigating"
                                ref="progressBarRef"
                                class="btn-progress"
                            />

                            <Icon name="lucide:map-pin-check" size="24" />

                            <span>{{
                                isNavigating
                                    ? t("common.resume")
                                    : t("common.startNavigation")
                            }}</span>

                            <span
                                v-if="countdown > 0 && !isNavigating"
                                class="countdown"
                                style="margin-left: 5px"
                            >
                                ({{ countdown }}s)
                            </span>
                        </button>

                        <button
                            class="nav-btn dark icon-close"
                            v-show="countdown > 0"
                            @click="cancelAutoStart"
                        >
                            <Icon name="lucide:x" size="26" class="icon" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </motion.div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/navigation/sheetSlide.scss"
></style>
