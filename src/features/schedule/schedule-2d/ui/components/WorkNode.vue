<script setup lang="ts">
import { computed } from 'vue'
import { type NodeProps } from '@vue-flow/core'

const props = defineProps<NodeProps>()

function splitLabel(label: string): [string, string | null] {
  const spaces: number[] = []
  for (let i = 0; i < label.length; i++) {
    if (label[i] === ' ') spaces.push(i)
  }
  if (spaces.length === 0) return [label, null]

  const mid = label.length / 2
  let bestIdx = spaces[0]!
  let bestDist = Math.abs(spaces[0]! - mid)
  for (let i = 1; i < spaces.length; i++) {
    const dist = Math.abs(spaces[i]! - mid)
    if (dist < bestDist) {
      bestDist = dist
      bestIdx = spaces[i]!
    }
  }

  return [label.slice(0, bestIdx), label.slice(bestIdx + 1)]
}

const labelText = computed(() => {
  return (props.data?.label as string) || ''
})

const lines = computed(() => splitLabel(labelText.value))
</script>

<template>
  <div class="flex flex-col items-center justify-center w-full h-full px-1 leading-loose text-center overflow-visible whitespace-nowrap">
    <span class="text-[11px]" style="transform: scaleY(1.5); display: inline-block">{{ lines[0] }}</span>
    <span v-if="lines[1]" class="text-[11px]" style="transform: scaleY(1.5); display: inline-block">{{ lines[1] }}</span>
  </div>
</template>
