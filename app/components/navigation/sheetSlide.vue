<script lang="ts" setup>
import type { PanInfo } from "motion";
import { animate } from "motion";
import { motion, useDragControls } from "motion-v";
import { anim } from "~/assets/utils/animations/anim";
import type { LocationData } from "~/composables/CityData";

const props = withDefaults(
    defineProps<{
        isSheetHidden: boolean;
        hasActiveJob: boolean;
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
const stopsTimelineRef = ref<HTMLElement | null>(null);
const countdown = ref(0);

let progressAnim: ReturnType<typeof animate> | null = null;
let countdownTimer: ReturnType<typeof setInterval> | null = null;
let hasTriggeredStart = false;

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

const triggerNavigationStart = () => {
    if (hasTriggeredStart) return;
    hasTriggeredStart = true;
    cancelAutoStart();
    props.onStartNavigation();
};

function startCountdownAnim() {
    if (!progressBarRef.value) return;

    progressAnim = animate(
        progressBarRef.value,
        { scaleX: [1, 0] },
        { duration: 9, ease: "linear" },
    );

    progressAnim.finished
        .then(() => {
            triggerNavigationStart();
        })
        .catch(() => {});
}

const startCountdown = () => {
    cancelAutoStart();
    hasTriggeredStart = false;
    countdown.value = 9;

    countdownTimer = setInterval(() => {
        countdown.value = countdown.value - 1;
        if (countdown.value === 0) {
            triggerNavigationStart();
        }
    }, 1000);

    nextTick(() => {
        startCountdownAnim();
    });
};

const checkAndStartCountdown = () => {
    if (props.isRouteActive && !props.isNavigating && !props.isSheetHidden) {
        startCountdown();
    } else {
        cancelAutoStart();
    }
};

onMounted(() => {
    const mediaQueryList = window.matchMedia(MEDIA_QUERY);
    isSidePanel.value = mediaQueryList.matches;

    const handler = (e: MediaQueryListEvent) => {
        isSidePanel.value = e.matches;
    };
    mediaQueryList.addEventListener("change", handler);

    checkAndStartCountdown();

    onUnmounted(() => {
        cancelAutoStart();
        mediaQueryList.removeEventListener("change", handler);
    });
});

watch(
    [
        () => props.isRouteActive,
        () => props.destinationName,
        () => props.stopsNames,
    ],
    () => {
        if (props.isRouteActive && !props.isNavigating) {
            startCountdown();
        } else {
            cancelAutoStart();
        }
    },
    { immediate: true },
);

watch(
    () => props.isSheetHidden,
    async (hidden) => {
        if (hidden) {
            cancelAutoStart();
        } else {
            await nextTick();
            const targetEl =
                (stopsTimelineRef.value as any)?.$el ?? stopsTimelineRef.value;
            if (targetEl) anim.staggerListX(targetEl, 0.03, 0.2);
        }
    },
    { immediate: true },
);

watch(
    () => props.isNavigating,
    (navigating) => {
        if (navigating) cancelAutoStart();
    },
);

watch(stopsTimelineRef, (newVal) => {
    if (newVal && !props.isSheetHidden) {
        const targetEl =
            (stopsTimelineRef.value as any)?.$el ?? stopsTimelineRef.value;
        if (targetEl) anim.staggerListX(targetEl, 0.03, 0.2);
    }
});

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
                            v-press
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
                <div class="category-wrapper content-timeline">
                    <p class="category-title small">STOPS TIMELINE</p>

                    <AnimTransition type="view">
                        <AnimTransitionGroup
                            type="turnCard"
                            v-if="stopsNames.length > 0"
                            ref="stopsTimelineRef"
                            class="stops-timeline"
                            @pointerdown.stop
                        >
                            <div
                                v-for="(data, index) in stopsNames"
                                :key="
                                    data.city + '-' + data.country + '-' + index
                                "
                                class="timeline-stop-item"
                            >
                                <div class="location-data">
                                    <div class="icon-city-wrapper">
                                        <div class="icon-wrapper">
                                            <AnimTransition type="ticker">
                                                <Icon
                                                    v-if="index === 0"
                                                    name="lucide:warehouse"
                                                    class="icon"
                                                />
                                                <Icon
                                                    v-else-if="
                                                        index ===
                                                        stopsNames.length - 1
                                                    "
                                                    name="lucide:flag-triangle-right"
                                                    class="icon"
                                                />
                                                <Icon
                                                    v-else
                                                    name="lucide:circle-small"
                                                    class="icon"
                                                />
                                            </AnimTransition>
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
                            </div>
                        </AnimTransitionGroup>

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
                    </AnimTransition>
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
                            v-press
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

                    <TransitionGroup
                        name="btn-slide"
                        tag="div"
                        class="action-buttons"
                        @pointerdown.stop
                    >
                        <button
                            v-if="isNavigating"
                            class="nav-btn red square"
                            key="cancel"
                            @click.prevent="onStopNavigation"
                            v-press
                        >
                            <Icon name="lucide:x" size="22" class="icon" />
                        </button>

                        <button
                            key="start"
                            class="start-btn nav-btn"
                            v-press
                            @click.prevent="handleStartOrResume"
                        >
                            <div
                                v-if="countdown > 0 && !isNavigating"
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
                            v-if="countdown > 0"
                            key="close"
                            v-press
                            @click="cancelAutoStart"
                        >
                            <Icon name="lucide:x" size="26" class="icon" />
                        </button>
                    </TransitionGroup>
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
