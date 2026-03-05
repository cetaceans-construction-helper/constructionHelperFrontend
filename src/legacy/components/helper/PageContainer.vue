<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <div class="flex-1 flex flex-col gap-4">
    <slot />
  </div>
</template>
