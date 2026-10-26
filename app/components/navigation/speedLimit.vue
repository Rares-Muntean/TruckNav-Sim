<script lang="ts" setup>
const props = defineProps<{
    truckSpeed: number;
    speedLimit: number;
}>();

const { kmToUserUnits } = useUnitConversion();
const { settings } = useSettings();

const truckSpeedConverted = computed(() => kmToUserUnits(props.truckSpeed));
const speedLimitConverted = computed(() => kmToUserUnits(props.speedLimit));
</script>

<template>
    <div
        v-if="speedLimit !== 0"
        class="speed-limit-sign"
        :class="settings.selectedGame === 'ets2' ? 'circle' : 'square'"
    >
        <div
            v-if="truckSpeed > speedLimit + 5"
            class="speed-limit-over-limit"
            :class="settings.selectedGame === 'ets2' ? 'circle' : 'square'"
        >
            <div class="over-limit">{{ truckSpeedConverted }}</div>
        </div>

        <div class="speed-limit">
            {{ speedLimitConverted }}
        </div>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/navigation/speedLimit.scss"
></style>
