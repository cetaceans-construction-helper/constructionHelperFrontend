<script setup lang="ts">
const props = defineProps<{
  isInitializing: boolean
  isLoading: boolean
  loadProgress: number
  errorMessage: string | null
}>()
</script>

<template>
  <div class="relative h-full w-full overflow-hidden" style="touch-action: none">
    <slot name="canvas" />

    <div
      v-if="props.isInitializing || props.isLoading"
      class="absolute left-3 top-3 rounded-md bg-background/90 px-3 py-2 text-xs shadow"
    >
      <p class="font-medium">3D 모델 로딩 중...</p>
      <p class="text-muted-foreground mt-0.5">
        {{ props.isInitializing ? '데이터 준비 중' : `${props.loadProgress.toFixed(0)}%` }}
      </p>
    </div>

    <div
      v-if="props.errorMessage"
      class="absolute left-3 top-3 max-w-[90%] rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 shadow dark:bg-red-950/40 dark:text-red-300"
    >
      <p class="font-medium">로드 실패</p>
      <p class="mt-0.5 break-words">{{ props.errorMessage }}</p>
    </div>
  </div>
</template>
