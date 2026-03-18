<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  type: 'straight' | 'slight-left' | 'left' | 'slight-right' | 'right' | 'destination'
  angle?: number
}>()

const isDestination = computed(() => props.type === 'destination')

// Generate properly aligned curve
function generateArrowPath(type: string) {
  const startX = 16
  const startY = 28
  const length = 24
  const sharpness = 12 // how far the curve bends horizontally

  switch (type) {
    case 'straight':
      return `M${startX} ${startY} L${startX} ${startY - length}`

    case 'slight-left':
      return `M${startX} ${startY} C${startX} ${startY - 8}, ${startX - 6} ${startY - 16}, ${startX - 4} ${startY - length}`

    case 'slight-right':
      return `M${startX} ${startY} C${startX} ${startY - 8}, ${startX + 6} ${startY - 16}, ${startX + 4} ${startY - length}`

    case 'left':
      // sharp left: quarter-circle tangent
      return `M${startX} ${startY} C${startX} ${startY - sharpness}, ${startX - sharpness} ${startY - length + sharpness}, ${startX - sharpness} ${startY - length}`

    case 'right':
      // sharp right: quarter-circle tangent
      return `M${startX} ${startY} C${startX} ${startY - sharpness}, ${startX + sharpness} ${startY - length + sharpness}, ${startX + sharpness} ${startY - length}`

    default:
      return `M${startX} ${startY} L${startX} ${startY - length}`
  }
}

const arrowPath = computed(() => {
  if (isDestination.value) return ''
  return generateArrowPath(props.type)
})

const arrowheadSize = computed(() => {
  switch (props.type) {
    case 'slight-left':
    case 'slight-right': return 4
    case 'left':
    case 'right': return 6
    default: return 5
  }
})
</script>

<template>
  <div class="turn-arrow">
    <svg v-if="!isDestination" width="32" height="32" viewBox="0 0 32 32">
      <defs>
        <marker
          id="arrowhead"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          :markerWidth="arrowheadSize"
          :markerHeight="arrowheadSize"
          orient="auto"
        >
          <path d="M0 0 L10 5 L0 10" fill="currentColor"/>
        </marker>
      </defs>

      <path
        :d="arrowPath"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
        marker-end="url(#arrowhead)"
      />
    </svg>

    <svg v-else width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" stroke-width="2.2"/>
      <path
        d="M11 16 L14.5 19.5 L21 13"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </div>
</template>

<style scoped>
.turn-arrow {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
}
</style>