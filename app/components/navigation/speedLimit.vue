<script lang="ts" setup>
const { kmToUserUnits, speedUnit } = useUnitConversion();
const { settings } = useSettings();

const { truckSpeed, speedLimit } = useEtsTelemetry();

const truckSpeedConverted = computed(() => kmToUserUnits(truckSpeed.value));
const speedLimitConverted = computed(() => kmToUserUnits(speedLimit.value));
</script>

<template>
    <div class="speed-and-limit">
        <div
            v-if="settings.activeUiComponents.includes('speed')"
            class="current-speed-wrapper"
        >
            <div class="current-speed">{{ truckSpeedConverted }}</div>
            <span class="unit">{{ speedUnit }}</span>
        </div>

        <div
            v-if="settings.activeUiComponents.includes('speedLimit')"
            class="limit-speed-wrapper"
            :class="settings.selectedGame === 'ets2' ? 'ets2' : 'ats'"
        >
            <div class="limit-speed">{{ speedLimitConverted }}</div>
        </div>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/navigation/speedLimit.scss"
></style>
