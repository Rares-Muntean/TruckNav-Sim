<script lang="ts" setup>
import type { DirectionStep } from "~/assets/utils/routing/directions";

const props = defineProps<{
    upcomingTurns: DirectionStep[];
    distanceToNextTurn: number;
    nextInstruction: string;
    active?: boolean;
    exit?: number | undefined;
}>();

const displayTurn = computed(() => {
    return props.upcomingTurns.slice(1, 2);
});

const { kmToUserUnits, distanceUnit } = useUnitConversion();

const routeDistanceConverted = computed(() =>
    kmToUserUnits(props.distanceToNextTurn),
);
</script>

<template>
    <div class="card">
        <DirectionIcon
            v-for="turn in displayTurn"
            :key="turn.id"
            :type="turn.type"
            :exit-count="
                turn.type === 'roundabout' ? turn.exitCount : undefined
            "
        />
        <div class="turn-info">
            <p class="distance">
                {{ routeDistanceConverted }}
                <span class="unit">{{ distanceUnit }}</span>
            </p>
            <p class="instruction-text">{{ nextInstruction }}</p>
        </div>
    </div>
</template>

<style scoped src="~/assets/scss/scoped/navigation/maneuverCard.scss"></style>
