<script lang="ts" setup>
const props = defineProps<{
    truckSpeed: number;
    speedLimit: number;
}>();

const { kmToUserUnits, speedUnit } = useUnitConversion();

const speedConverted = computed(() => kmToUserUnits(props.truckSpeed));
const speedLimitConverted = computed(() => kmToUserUnits(props.speedLimit));

const isOverLimit = computed(
    () => props.speedLimit > 0 && props.truckSpeed > props.speedLimit + 5,
);

// Arc geometry
const SIZE = 120;
const STROKE = 9;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

const MAX_SPEED = 140;
const ARC_RATIO = 0.75; // 270 degrees of the circle used

const arcLength = computed(() => {
    const ratio = Math.min(props.truckSpeed / MAX_SPEED, 1);
    return CIRCUMFERENCE * ARC_RATIO * ratio;
});

const arcGap = computed(() => CIRCUMFERENCE - arcLength.value);

// Rotate so arc starts bottom-left, ends bottom-right (like a car speedo)
const ROTATION = 135;
</script>

<template>
    <div class="speedo-wrapper" :class="{ 'over-limit': isOverLimit }">
        <!-- SVG arc ring -->
        <svg
            :width="SIZE"
            :height="SIZE"
            :viewBox="`0 0 ${SIZE} ${SIZE}`"
            class="speedo-svg"
        >
            <!-- Background track -->
            <circle
                :cx="SIZE / 2"
                :cy="SIZE / 2"
                :r="R"
                fill="none"
                stroke="#2a3a4a"
                :stroke-width="STROKE"
                :stroke-dasharray="`${CIRCUMFERENCE * ARC_RATIO} ${CIRCUMFERENCE}`"
                :stroke-dashoffset="0"
                :transform="`rotate(${ROTATION} ${SIZE / 2} ${SIZE / 2})`"
                stroke-linecap="round"
            />
            <!-- Speed arc -->
            <circle
                :cx="SIZE / 2"
                :cy="SIZE / 2"
                :r="R"
                fill="none"
                :stroke="isOverLimit ? '#dd4a34' : '#7dd3fc'"
                :stroke-width="STROKE"
                :stroke-dasharray="`${arcLength} ${CIRCUMFERENCE}`"
                :stroke-dashoffset="0"
                :transform="`rotate(${ROTATION} ${SIZE / 2} ${SIZE / 2})`"
                stroke-linecap="round"
                class="speed-arc"
            />
        </svg>

        <!-- Center content -->
        <div class="speedo-center">
            <span class="speedo-number" :class="{ 'over-limit-text': isOverLimit }">
                {{ speedConverted }}
            </span>
            <span class="speedo-unit">{{ speedUnit }}</span>
            <span v-if="speedLimit > 0" class="speedo-limit">
                / {{ speedLimitConverted }}
            </span>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.speedo-wrapper {
    position: absolute;
    bottom: 28px;
    left: 18px;
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.5));
    transition: filter 0.3s ease;

    &.over-limit {
        filter: drop-shadow(0 4px 16px rgba(221, 74, 52, 0.5));
    }
}

.speedo-svg {
    position: absolute;
    top: 0;
    left: 0;
}

.speed-arc {
    transition: stroke-dasharray 0.2s ease, stroke 0.3s ease;
}

.speedo-center {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    background-color: #151d25;
    border-radius: 50%;
    width: 84px;
    height: 84px;
    gap: 0;
}

.speedo-number {
    font-family: "Quicksand", sans-serif;
    font-size: 2.4rem;
    font-weight: 700;
    color: #f2f2f2;
    line-height: 1;
    transition: color 0.3s ease;

    &.over-limit-text {
        color: #dd4a34;
    }
}

.speedo-unit {
    font-family: "Quicksand", sans-serif;
    font-size: 0.85rem;
    font-weight: 500;
    color: rgba(242, 242, 242, 0.55);
    line-height: 1;
    margin-top: 2px;
}

.speedo-limit {
    font-family: "Quicksand", sans-serif;
    font-size: 0.75rem;
    font-weight: 500;
    color: rgba(242, 242, 242, 0.4);
    line-height: 1;
    margin-top: 1px;
}
</style>