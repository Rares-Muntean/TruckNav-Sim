<script lang="ts" setup>
import type { PanInfo } from "motion";
import { animate } from "motion";
import { motion, useDragControls } from "motion-v";

const props = defineProps<{
    isSheetHidden: boolean;
    truckSpeed: number;
    speedLimit: number;
    destinationName: string;
    routeEtaHours: string;
    routeEtaMinutes: string;
    routeDistanceConverted: number;
    isNavigating: boolean;
    onStopNavigation: () => void;
    onStartNavigation: () => void;
    onResumeNavigation: () => void;
}>();

const { distanceUnit } = useUnitConversion();
const { t } = useTranslations();

const emit = defineEmits<{
    (e: "update:isSheetHidden", value: boolean): void;
    (e: "update:isSheetExpanded", value: boolean): void;
    (e: "update:addStopClicked"): void;
}>();

const controls = useDragControls();
const progressBarRef = ref<HTMLElement | null>(null);
const countdown = ref(0);

let progressAnim: ReturnType<typeof animate> | null = null;
let countdownTimer: ReturnType<typeof setInterval> | null = null;

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
    countdown.value = 10;

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
            { duration: 10, ease: "linear" },
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
    if (!props.isNavigating) {
        startCountdown();
    }
});

onUnmounted(() => {
    cancelAutoStart();
});

watch(
    () => props.isNavigating,
    (navigating) => {
        if (navigating) cancelAutoStart();
    },
);

const onToggleSheetHidden = () => {
    emit("update:isSheetHidden", !props.isSheetHidden);
};

const handleDragEnd = (_event: PointerEvent, info: PanInfo) => {
    if (info.offset.y > 80 || info.velocity.y > 500) {
        cancelAutoStart();
        emit("update:isSheetHidden", true);
    }
};

const handleAddStopClick = () => {
    onToggleSheetHidden();
    emit("update:addStopClicked");
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
        drag="y"
        drag-snap-to-origin
        :drag-constraints="{ top: 0 }"
        :drag-elastic="{ top: 0, bottom: 0.1 }"
        :drag-listener="false"
        :drag-controls="controls"
        :initial="{ y: '100%' }"
        :animate="{ y: isSheetHidden ? '100%' : '0%' }"
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
                    <div class="dest-name-wrapper">
                        <Icon name="lucide:map-pin" size="20" class="icon" />
                        <h2 class="dest-name">{{ destinationName }}</h2>
                    </div>
                </div>

                <div class="separator"></div>
            </div>

            <div class="sheet-content">
                <div class="full-stats">
                    <div class="stat-block">
                        <Icon name="lucide:clock-check" size="26" />
                        <div class="route-info">
                            <div class="route-distance-flex">
                                <div class="route-distance-wrapper">
                                    <span>{{ routeEtaHours }}</span>
                                    <span class="unit">h</span>
                                </div>

                                <div class="route-distance-wrapper">
                                    <span>{{ routeEtaMinutes }}</span>
                                    <span class="unit">m</span>
                                </div>
                            </div>

                            <div class="label route-distance">
                                {{ routeDistanceConverted }} {{ distanceUnit }}
                            </div>
                        </div>
                    </div>

                    <button
                        @pointerdown.stop
                        class="nav-btn dark"
                        v-on:click="handleAddStopClick"
                    >
                        <Icon name="lucide:plus" size="22" />
                        <span>{{ t("map.addStop") }}</span>
                    </button>
                </div>

                <div class="action-buttons" @pointerdown.stop>
                    <button
                        v-show="isNavigating"
                        class="nav-btn dark icon-close"
                        @click.prevent="onStopNavigation"
                    >
                        <Icon name="lucide:x" size="26" class="icon" />
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
    </motion.div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/navigation/sheetSlide.scss"
></style>
