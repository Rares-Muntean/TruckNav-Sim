<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  type: 'straight' | 'slight-left' | 'left' | 'slight-right' | 'right' | 'destination'
  angle?: number
  size?: 'large' | 'small'
}>()

const isDestination = computed(() => props.type === 'destination')
const isSmall = computed(() => props.size === 'small')

function generateArrowPath(angle: number, scale = 1) {
  const startX = 16 * scale
  const startY = 28 * scale
  const length = 24 * scale

  if (angle === 0) return `M${startX} ${startY} L${startX} ${startY - length}`

  const direction = angle > 0 ? 1 : -1
  const absAngle = Math.min(Math.abs(angle), 90)
  const dx = direction * (absAngle / 90) * 16 * scale
  const dy = length

  const cp1X = startX
  const cp1Y = startY - dy * 0.5
  const cp2X = startX + dx * 0.5
  const cp2Y = startY - dy * 0.5
  const endX = startX + dx
  const endY = startY - dy

  return `M${startX} ${startY} C${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`
}

const arrowPath = computed(() => {
  if (isDestination.value) return ''

  let angle = 0
  switch (props.type) {
    case 'slight-left': angle = -30; break
    case 'left': angle = -90; break
    case 'slight-right': angle = 30; break
    case 'right': angle = 90; break
  }
  if (props.angle !== undefined) angle = props.angle

  return generateArrowPath(angle, isSmall.value ? 0.7 : 1)
})

const arrowheadSize = computed(() => {
  const base = isSmall.value ? 3 : 5
  switch (props.type) {
    case 'slight-left':
    case 'slight-right': return base
    case 'left':
    case 'right': return base + 2
    default: return base
  }
})

const arrowColor = computed(() => isSmall.value ? 'rgba(0,0,0,0.5)' : 'currentColor')
</script>

<template>
  <div class="turn-arrow" :class="size">
    <svg v-if="!isDestination" :width="isSmall ? 22 : 32" :height="isSmall ? 22 : 32" viewBox="0 0 32 32">
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
          <path d="M0 0 L10 5 L0 10" :fill="arrowColor"/>
        </marker>
      </defs>

      <path
        :d="arrowPath"
        fill="none"
        :stroke="arrowColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
        marker-end="url(#arrowhead)"
      />
    </svg>

    <svg v-else :width="isSmall ? 22 : 32" :height="isSmall ? 22 : 32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="10" fill="none" :stroke="arrowColor" stroke-width="2.2"/>
      <path
        d="M11 16 L14.5 19.5 L21 13"
        fill="none"
        :stroke="arrowColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </div>
</template>

<style scoped>
.turn-arrow {
  display: grid;
  place-items: center;
}
</style>