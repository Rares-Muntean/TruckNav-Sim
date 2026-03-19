<script setup lang="ts">
import TurnArrow from './TurnArrow.vue'
import type { TurnInstruction } from '~/assets/utils/routing/turnInstructions'

const { kmToUserUnits, distanceUnit } = useUnitConversion()

const props = defineProps<{
  nextTurns: { instruction: TurnInstruction; distance: number }[]
}>()

const currentTurn = computed(() => props.nextTurns[0] ?? null)
const nextUpcomingTurn = computed(() => props.nextTurns[1] ?? null)
</script>

<template>
  <div v-if="currentTurn" class="turn-navigation current-turn">

    <!-- Current Turn -->
    <div class="turn-block">
      <div class="arrow-wrapper">
        <TurnArrow :type="currentTurn.instruction.type" size="large" />
      </div>
      <div class="instruction-text">
        <div class="direction">
          {{ currentTurn.instruction.description }}
        </div>
        <div class="distance">
          {{ currentTurn.instruction.description.includes("Continue")? "for": "in" }} 
          {{ kmToUserUnits(currentTurn.distance).toFixed(1) }} {{ distanceUnit }}
        </div>
      </div>
    </div>

    <!-- Divider -->
    <div class="divider"></div>

    <!-- Upcoming Turn -->
    <div v-if="nextUpcomingTurn" class="turn-block upcoming-turn">
      <div class="arrow-wrapper">
        <TurnArrow :type="nextUpcomingTurn.instruction.type" size="small" />
      </div>
      <div class="instruction-text">
        <div class="upcoming-text">
          {{ nextUpcomingTurn.instruction.description.replace('Turn ', '').toLowerCase() }}
          {{ nextUpcomingTurn.instruction.description.includes("Continue")? "for": "in" }}  
          {{ kmToUserUnits(nextUpcomingTurn.distance).toFixed(1) }} {{ distanceUnit }}
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Container */
.turn-navigation {
  max-width: 420px;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.14);
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

/* Turn Block Base */
.turn-block {
  display: flex;
  align-items: center;
  padding: 14px 16px;
}

/* Current Turn Styles */
.current-turn {
  background: #f1f3f4;
}

.current-turn .direction {
  font-size: 22px;
  font-weight: 600;
}

.current-turn .distance {
  font-size: 16px;
  color: #555;
  margin-top: 4px;
}

/* Divider */
.divider {
  height: 1px;
  background: #e0e0e0;
  margin: 0;
}

/* Upcoming Turn Styles */
.upcoming-turn {
  background: #e6e5e5;
}

.upcoming-text {
  font-size: 14px;
  color: #777;
  display: flex;
  align-items: center;
  line-height: 1.2;
}

/* Arrow Wrapper */
.arrow-wrapper {
  flex-shrink: 0;
  width: 60px;
  display: flex;
  justify-content: center;
  margin-right: 12px;
}

/* Upcoming Turn Arrow Adjustments */
.upcoming-turn .arrow-wrapper {
  width: 36px;
  margin-right: 8px;
}

/* Ensure arrow and text are perfectly aligned vertically */
.upcoming-text .turn-arrow {
  display: inline-block;
  vertical-align: middle;
  margin-right: 6px;
}
</style>