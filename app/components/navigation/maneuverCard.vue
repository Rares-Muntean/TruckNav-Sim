<script lang="ts" setup>
import type { DirectionStep } from "~/assets/utils/routing/directions";

const props = defineProps<{
    upcomingTurns: DirectionStep[];
    distanceToNextTurn: number;
    nextInstruction: string;
    active?: boolean;
    exit?: number | undefined;
}>();

const currentTurn = computed(() => props.upcomingTurns[1]);

const { kmToUserUnits, distanceUnit } = useUnitConversion();

const routeDistanceConverted = computed(() =>
    kmToUserUnits(props.distanceToNextTurn),
);
</script>

<template>
    <div class="card">
        <AnimTransition type="fade">
            <DirectionIcon
                v-if="currentTurn"
                :key="currentTurn.id"
                :type="currentTurn.type"
                :exit-count="
                    currentTurn.type === 'roundabout'
                        ? currentTurn.exitCount
                        : undefined
                "
            />
        </AnimTransition>
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
