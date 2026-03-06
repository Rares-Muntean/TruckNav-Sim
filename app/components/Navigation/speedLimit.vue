<script lang="ts" setup>
import { computed } from "vue"
import { useConversions } from "~/composables/UnitConversion"

const props = defineProps<{
    truckSpeed: number;
    speedLimit: number;
}>();

const { kmToUserUnits, speedUnit } = useConversions()
const truckSpeedConverted = computed(() =>
    Math.round(kmToUserUnits(props.truckSpeed))
)

const speedLimitConverted = computed(() =>
    Math.round(kmToUserUnits(props.speedLimit))
)
</script>

<template>
    <div v-if="speedLimit !== 0" class="speed-limit-circle">
        <Transition name="over-limit">
            <div
                v-if="truckSpeed > speedLimit + 5"
                class="speed-limit-circle-over-limit"
            >
                <div class="over-limit">{{ truckSpeedConverted }}</div>
            </div>
        </Transition>
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
