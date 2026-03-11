<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ScheduleShellLayout, ScheduleTimelineLayout } from '@/features/schedule/schedule-2d-rebuild/model/schedule-rebuild-types'

const props = defineProps<{
  timeline: ScheduleTimelineLayout
  shellLayout: ScheduleShellLayout
  viewportHeight: number
  scrollTop: number
  scrollLeft: number
}>()

const emit = defineEmits<{
  'scroll-change': [position: { top: number; left: number }]
}>()

const containerRef = ref<HTMLElement | null>(null)
let syncingFromProp = false

watch(
  () => [props.scrollTop, props.scrollLeft] as const,
  ([nextScrollTop, nextScrollLeft]) => {
    const element = containerRef.value
    if (!element) return

    const topDiff = Math.abs(element.scrollTop - nextScrollTop)
    const leftDiff = Math.abs(element.scrollLeft - nextScrollLeft)
    if (topDiff < 1 && leftDiff < 1) return

    syncingFromProp = true
    element.scrollTop = nextScrollTop
    element.scrollLeft = nextScrollLeft
  },
)

function handleScroll(event: Event) {
  if (syncingFromProp) {
    syncingFromProp = false
    return
  }

  const target = event.target as HTMLElement
  emit('scroll-change', {
    top: target.scrollTop,
    left: target.scrollLeft,
  })
}
</script>

<template>
  <div
    ref="containerRef"
    class="overflow-auto bg-background"
    :style="{ height: `${viewportHeight}px` }"
    @scroll="handleScroll"
  >
    <div
      class="relative"
      :style="{ width: `${timeline.chartWidth}px`, height: `${shellLayout.chartHeight}px` }"
    >
      <div
        v-for="day in timeline.days"
        :key="`day-column-${day.key}`"
        class="absolute top-0 border-r border-border/60"
        :class="{
          'bg-blue-50/70': day.isToday,
          'bg-muted/15': !day.isToday && day.isWeekend,
        }"
        :style="{ left: `${day.left}px`, width: `${day.width}px`, height: `${shellLayout.chartHeight}px` }"
      />

      <div
        v-for="row in shellLayout.rows"
        :key="`row-${row.id}`"
        class="absolute left-0 right-0 border-b border-border/70"
        :class="row.kind === 'parent-process' ? 'bg-slate-50/80' : 'bg-transparent'"
        :style="{ top: `${row.top}px`, height: `${row.height}px` }"
      />

      <div
        v-for="bar in shellLayout.bars"
        :key="bar.id"
        class="absolute flex items-center overflow-hidden rounded-md border px-2 shadow-sm"
        :class="bar.appearance === 'holiday-off'
          ? 'border-slate-300 bg-slate-200 text-slate-700'
          : 'border-sky-300 bg-sky-500 text-white'"
        :style="{
          left: `${bar.left}px`,
          top: `${bar.top}px`,
          width: `${bar.width}px`,
          height: `${bar.height}px`,
        }"
      >
        <span class="truncate text-xs font-medium">{{ bar.name }}</span>
      </div>
    </div>
  </div>
</template>
