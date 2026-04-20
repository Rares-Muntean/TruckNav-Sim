<script lang="ts" setup>
const props = defineProps<{
    isSheetHidden: boolean;
    truckSpeed: number;
    speedLimit: number;
    destinationName: string;
    routeEta: string;
    routeDistance: number;
    isNavigating: boolean;
    onStopNavigation: () => void;
    onStartNavigation: () => void;
}>();

const { kmToUserUnits, distanceUnit } = useUnitConversion();
const { t } = useTranslations();

const countdown = ref(5);
const progress = ref(100);

const routeDistanceConverted = computed(() =>
    kmToUserUnits(props.routeDistance),
);

const emit = defineEmits<{
    (e: "update:isSheetHidden", value: boolean): void;
    (e: "update:isSheetExpanded", value: boolean): void;
}>();

const onToggleSheetHidden = () => {
    emit("update:isSheetHidden", !props.isSheetHidden);
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
    const duration = 5000;
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
            <Transition name="compact-slide">
                <CompactTrip
                    v-if="isSheetHidden"
                    v-on:click="onToggleSheetHidden"
                    class="compact-trip-progress"
                    :route-distance-converted="routeDistanceConverted"
                    :distance-unit="distanceUnit"
                    :route-eta="routeEta"
                />
            </Transition>

            <div class="sheet-content">
                <div class="top-row">
                    <h2 class="dest-name">{{ destinationName }}</h2>

                    <div class="hide-sheet">
                        <button
                            v-show="!isSheetHidden"
                            @click.prevent="onToggleSheetHidden"
                            class="hide-sheet-btn nav-btn"
                        >
                            <Icon
                                name="lucide:chevron-down"
                                class="chevron-icon"
                                size="20"
                            />
                            {{ t("common.hide") }}
                        </button>
                    </div>
                </div>

                <div class="separator"></div>

                <div class="full-stats">
                    <div class="stat-block">
                        <Icon
                            name="lucide:clock-check"
                            size="26"
                            class="icon-eta"
                        />
                        <div>
                            <div class="value">{{ routeEta }}</div>
                            <div class="label">
                                {{ t("common.estimatedTime") }}
                            </div>
                        </div>
                    </div>

                    <div class="stat-block">
                        <Icon name="lucide:ruler" size="26" class="icon-dist" />
                        <div>
                            <div class="value">
                                {{ routeDistanceConverted }} {{ distanceUnit }}
                            </div>
                            <div class="label">{{ t("common.distance") }}</div>
                        </div>
                    </div>
                </div>

                <div class="action-buttons">
                    <button
                        v-show="isNavigating"
                        class="stop-btn nav-btn"
                        @click.prevent="onStopNavigation"
                    >
                        <span>{{ t("common.stop") }}</span>
                    </button>

                    <button
                        class="start-btn nav-btn"
                        :style="{ '--progress': progress + `%` }"
                        @click.prevent="onStartNavigation"
                    >
                        <Icon name="lucide:map-pin-check" size="24" />
                        <span>{{
                            isNavigating
                                ? t("common.resume")
                                : t("common.startNavigation")
                        }}</span>
                        <span
                            v-if="countdown > 0 && !isNavigating"
                            style="margin-left: 5px; opacity: 0.8"
                        >
                            ({{ countdown }}s)
                        </span>
                    </button>

                    <button v-show="countdown > 0" @click="cancelAutoStart">
                        <Icon
                            name="lucide:x"
                            size="28"
                            class="cancel-timer-icon"
                        />
                    </button>
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
