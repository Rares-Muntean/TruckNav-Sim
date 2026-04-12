<script lang="ts" setup>
import type { DirectionStep } from "~/assets/utils/routing/directions";

const { activeSettings } = useSettings();

const props = defineProps<{
    upcomingTurns: DirectionStep[];
    distanceToNextTurn: number;
    nextInstruction: string;
    active?: boolean;
    exit?: number | undefined;
}>();

const displayTurns = computed(() => {
    return props.upcomingTurns.slice(1, 3);
});

const { kmToUserUnits, distanceUnit } = useUnitConversion();

const routeDistanceConverted = computed(() =>
    kmToUserUnits(props.distanceToNextTurn),
);
</script>

<template>
    <div class="card">
        <div class="turn-directions">
            <DirectionIcon
                v-for="(turn, index) in displayTurns"
                :key="turn.id"
                :type="turn.type"
                :exit-count="
                    turn.type === 'roundabout' ? turn.exitCount : undefined
                "
                :active="index === 0"
                :active-color="activeSettings.routeColor"
            />
        </div>
        <div class="turn-info">
            <p>{{ routeDistanceConverted }} {{ distanceUnit }}</p>
            <p>{{ nextInstruction }}</p>
        </div>
    </div>
</template>

<style scoped src="~/assets/scss/scoped/navigation/maneuverCard.scss"></style>
