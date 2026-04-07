<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <div class="flex-1 flex flex-col gap-4">
    <div class="text-right text-primary font-semibold text-lg">{{ title }}</div>
    <slot />
  </div>
</template>
