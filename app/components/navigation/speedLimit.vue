<script lang="ts" setup>
const props = defineProps<{
    truckSpeed: number;
    speedLimit: number;
}>();

const { kmToUserUnits } = useUnitConversion();

const truckSpeedConverted = computed(() => kmToUserUnits(props.truckSpeed));

const speedLimitConverted = computed(() => kmToUserUnits(props.speedLimit));
</script>

<template>
    <div v-if="speedLimit !== 0" class="speed-limit-circle">
        <Transition name="over-limit">
            <div
                v-if="truckSpeed > speedLimit + 5"
                class="speed-limit-circle-over-limit"
            >
                <div class="over-limit">{{ truckSpeedConverted.toFixed(0) }}</div>
            </div>
        </Transition>
        <div class="speed-limit">
            {{ speedLimitConverted.toFixed(0) }}
        </div>
    </div>
</template>

<style
    lang="scss"
    scoped
    src="~/assets/scss/scoped/navigation/speedLimit.scss"
></style>
