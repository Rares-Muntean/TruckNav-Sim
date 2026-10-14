<script lang="ts" setup>
const props = defineProps<{
    isSheetHidden: boolean;
    truckSpeed: number;
    speedLimit: number;
    destinationName: string;
    routeEta: string;
    routeDistanceConverted: number;
    isNavigating: boolean;
    onStopNavigation: () => void;
    onStartNavigation: () => void;
    onResumeNavigation: () => void;
}>();

const { distanceUnit } = useUnitConversion();
const { t } = useTranslations();

const countdown = ref(5);
const progress = ref(100);

const emit = defineEmits<{
    (e: "update:isSheetHidden", value: boolean): void;
    (e: "update:isSheetExpanded", value: boolean): void;
    (e: "update:addStopClicked"): void;
}>();

const onToggleSheetHidden = () => {
    emit("update:isSheetHidden", !props.isSheetHidden);
};

const handleAddStopClick = () => {
    onToggleSheetHidden();
    emit("update:addStopClicked");
};

const cancelAutoStart = () => {
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    countdown.value = 0;
    progress.value = 0;
};

let rafId: number | null = null;
const startSmoothTimer = () => {
    const duration = 10000;
    const startTime = Date.now();

    const frame = () => {
        const timePassed = Date.now() - startTime;
        const remaining = Math.max(0, duration - timePassed);

        countdown.value = Math.ceil(remaining / 1000);
        progress.value = (remaining / duration) * 100;

        if (remaining > 0) {
            rafId = requestAnimationFrame(frame);
        } else {
            cancelAutoStart();
            props.onStartNavigation();
        }
    };

    rafId = requestAnimationFrame(frame);
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

onMounted(() => {
    if (!props.isNavigating) {
        startSmoothTimer();
    }
});

watch(
    () => props.isNavigating,
    (navigating) => {
        if (navigating) cancelAutoStart();
    },
);
</script>

<template>
    <div class="bottom-sheet" :class="{ 'is-hidden': isSheetHidden }">
        <div class="sheet-body">
            <div class="sheet-content">
                <div class="top-row">
                    <h2 class="dest-name">{{ destinationName }}</h2>

                    <div class="hide-sheet">
                        <button
                            v-show="!isSheetHidden"
                            @click.prevent="onToggleSheetHidden"
                            class="hide-sheet-btn"
                        >
                            <Icon
                                name="lucide:chevron-down"
                                class="chevron-icon"
                                size="22"
                            />
                        </button>
                    </div>
                </div>

                <div class="separator"></div>

                <div class="full-stats">
                    <div class="stat-block">
                        <Icon name="lucide:clock-check" size="26" />
                        <div class="route-info">
                            <div class="value">{{ routeEta }}</div>
                            <div class="label route-distance">
                                {{ routeDistanceConverted }} {{ distanceUnit }}
                            </div>
                        </div>
                    </div>

                    <button
                        class="nav-btn dark"
                        v-on:click="handleAddStopClick"
                    >
                        <Icon name="lucide:map-pin-plus" size="22" />
                        <span>{{ t("map.addStop") }}</span>
                    </button>
                </div>

                <div class="action-buttons">
                    <button
                        v-show="isNavigating"
                        class="close-icon"
                        @click.prevent="onStopNavigation"
                    >
                        <Icon name="lucide:circle-x" size="28" />
                    </button>

                    <button
                        class="start-btn nav-btn"
                        :style="{ '--progress': progress + `%` }"
                        @click.prevent="handleStartOrResume"
                    >
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

                    <Icon
                        v-show="countdown > 0"
                        @click="cancelAutoStart"
                        name="lucide:x"
                        size="28"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/navigation/sheetSlide.scss"
></style>
