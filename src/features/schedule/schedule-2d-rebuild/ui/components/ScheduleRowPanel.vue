<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ScheduleShellRow } from '@/features/schedule/schedule-2d-rebuild/model/schedule-rebuild-types'

const props = defineProps<{
  rows: ScheduleShellRow[]
  viewportHeight: number
  scrollTop: number
}>()

const emit = defineEmits<{
  'scroll-top-change': [scrollTop: number]
}>()

const containerRef = ref<HTMLElement | null>(null)
let syncingFromProp = false

watch(
  () => props.scrollTop,
  (nextScrollTop) => {
    const element = containerRef.value
    if (!element) return
    if (Math.abs(element.scrollTop - nextScrollTop) < 1) return

    syncingFromProp = true
    element.scrollTop = nextScrollTop
  },
)

function handleScroll(event: Event) {
  if (syncingFromProp) {
    syncingFromProp = false
    return
  }

  const target = event.target as HTMLElement
  emit('scroll-top-change', target.scrollTop)
}
</script>

<template>
  <div
    ref="containerRef"
    class="overflow-y-auto overflow-x-hidden"
    :style="{ height: `${viewportHeight}px` }"
    @scroll="handleScroll"
  >
    <div>
      <div
        v-for="row in rows"
        :key="row.id"
        class="flex items-center gap-2 border-b border-border/70 px-3"
        :class="row.kind === 'parent-process' ? 'bg-muted/25' : 'bg-background'"
        :style="{ height: `${row.height}px`, paddingLeft: `${16 + row.depth * 20}px` }"
      >
        <div class="min-w-0 flex-1">
          <p
            class="truncate text-sm"
            :class="row.kind === 'parent-process' ? 'font-extrabold text-foreground' : 'font-medium text-muted-foreground'"
          >
            {{ row.name }}
          </p>
        </div>
        <span class="text-xs text-muted-foreground">{{ row.itemCount }}</span>
      </div>
    </div>
  </div>
</template>
