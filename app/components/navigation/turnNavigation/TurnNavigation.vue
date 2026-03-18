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
  <div v-if="currentTurn" class="turn-navigation">
    <div class="current-instruction">
      <TurnArrow :type="currentTurn.instruction.type" />
      <div class="instruction-text">
        <div class="direction">
          {{ currentTurn.instruction.description }}
        </div>
        <div class="distance">
          in {{ kmToUserUnits(currentTurn.distance).toFixed(1) }} {{ distanceUnit }}
        </div>
      </div>
    </div>

    <div v-if="nextUpcomingTurn" class="upcoming-instructions">
      <div class="upcoming-item">
        <div class="then-label">Then</div>
        <TurnArrow :type="nextUpcomingTurn.instruction.type" />
        <span>
          {{ nextUpcomingTurn.instruction.description.replace('Turn ', '').toLowerCase() }}
          in {{ kmToUserUnits(nextUpcomingTurn.distance).toFixed(2) }} {{ distanceUnit }}
        </span>
      </div>
    </div>
  </div>
</template>


<style scoped>
.turn-navigation {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 400px;
}

.current-instruction {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.instruction-text {
  margin-left: 12px;
}

.direction {
  font-size: 18px;
  font-weight: 500;
}

.distance {
  font-size: 14px;
  color: #666;
}

.upcoming-instructions {
  border-top: 1px solid #eee;
  padding-top: 12px;
}

.upcoming-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
}

.then-label {
  margin-right: 8px;
  font-weight: 500;
  color: #666;
}
</style>