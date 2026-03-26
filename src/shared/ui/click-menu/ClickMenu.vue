<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  x: number
  y: number
  offsetY?: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

function onClickOutside() {
  emit('close')
}

function onEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onEscape))
onUnmounted(() => window.removeEventListener('keydown', onEscape))
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50" @click="onClickOutside" />
    <div
      class="fixed z-50 bg-popover text-popover-foreground rounded-md border p-1 shadow-md min-w-[160px]"
      :style="{ left: `${x}px`, top: `${y + (offsetY ?? 0)}px` }"
    >
      <slot />
    </div>
  </Teleport>
</template>
