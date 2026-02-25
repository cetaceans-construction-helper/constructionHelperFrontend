<script setup lang="ts">
import type { Object3d, Task } from '@/types/object3d'

const props = defineProps<{
  object3d: Object3d
  tasks: Task[]
  isLoadingTasks: boolean
  taskLoadError: string | null
  selectedTaskId: number | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select-task', taskId: number): void
}>()

function isSelected(taskId: number): boolean {
  return props.selectedTaskId === taskId
}
</script>

<template>
  <div class="h-full w-full min-h-0 bg-background/70 dark:bg-black/20 overflow-hidden flex flex-col">
    <div class="shrink-0 px-3 pt-2 pb-1.5 border-b border-border/60 flex items-center justify-between gap-2">
      <div class="min-w-0">
        <p class="text-sm font-semibold truncate">
          {{ object3d.floorName ?? '층 미지정' }} / {{ object3d.zoneName ?? '구역 미지정' }}
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-md px-2 py-1 text-xs font-medium bg-background/90 hover:bg-background"
        @click="emit('close')"
      >
        미니맵
      </button>
    </div>
    <div class="flex-1 min-h-0 px-2 py-2 overflow-y-auto">

      <div v-if="isLoadingTasks" class="h-full flex items-center justify-center text-xs text-muted-foreground">
        세부작업 불러오는 중...
      </div>

      <div
        v-else-if="taskLoadError"
        class="mx-1 rounded-md border border-red-200/70 bg-red-50/50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
      >
        {{ taskLoadError }}
      </div>

      <div v-else-if="tasks.length === 0" class="h-full flex items-center justify-center text-xs text-muted-foreground">
        세부작업이 없습니다.
      </div>

      <div v-else class="space-y-1.5">
        <button
          v-for="task in tasks"
          :key="task.id"
          type="button"
          class="w-full text-left rounded-md border px-2.5 py-2 transition-colors"
          :class="
            isSelected(task.id)
              ? 'border-primary bg-primary/10'
              : 'border-border bg-background/70 hover:bg-muted/40'
          "
          @click="emit('select-task', task.id)"
        >
          <p class="text-xs font-semibold text-foreground truncate">
            {{ task.divisionName }} > {{ task.workTypeName }} > {{ task.subWorkTypeName }}
          </p>
          <div class="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>ID {{ task.id }}</span>
            <span>계획수량 {{ task.planedQuantity }}</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>
