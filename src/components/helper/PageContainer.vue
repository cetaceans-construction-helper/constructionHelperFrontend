<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <div class="flex-1 flex flex-col gap-4">
    <!-- 상단 여백 -->
    <div class="h-10"></div>
    <div class="flex items-center gap-2">
      <span class="text-lg font-semibold">{{ title }}</span>
    </div>
    <slot />
  </div>
</template>
