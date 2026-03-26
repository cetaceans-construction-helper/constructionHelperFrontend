<script setup lang="ts">
defineProps<{
  variant?: 'default' | 'destructive'
}>()

const emit = defineEmits<{
  (e: 'select'): void
}>()
</script>

<template>
  <button
    class="w-full text-left rounded-sm px-2 py-1.5 text-sm cursor-default outline-none"
    :class="variant === 'destructive'
      ? 'text-destructive hover:bg-destructive/10'
      : 'hover:bg-accent hover:text-accent-foreground'"
    @click="emit('select')"
  >
    <slot />
  </button>
</template>
