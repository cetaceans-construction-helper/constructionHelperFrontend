<script setup lang="ts">
import { computed } from 'vue'
import type { ScheduleTimelineLayout } from '@/features/schedule/schedule-2d-rebuild/model/schedule-rebuild-types'

const props = defineProps<{
  timeline: ScheduleTimelineLayout
  scrollLeft: number
  milestoneDates: string[]
}>()

const milestoneDateSet = computed(() => new Set(props.milestoneDates))

function getDayCellClass(day: ScheduleTimelineLayout['days'][number]) {
  if (milestoneDateSet.value.has(day.date)) {
    return [
      'bg-amber-100/70 text-amber-900',
      day.isToday ? 'font-semibold ring-1 ring-inset ring-blue-200/80' : '',
    ]
  }

  if (day.isWeekend) {
    return [
      'bg-rose-50/55 text-rose-600',
      day.isToday ? 'font-semibold ring-1 ring-inset ring-blue-200/80' : '',
    ]
  }

  if (day.isToday) {
    return 'bg-blue-50 font-semibold text-blue-700'
  }

  return ''
}
</script>

<template>
  <div class="relative h-[84px] overflow-hidden border-b border-border bg-background">
    <div
      class="relative h-full will-change-transform"
      :style="{ width: `${timeline.chartWidth}px`, transform: `translateX(-${scrollLeft}px)` }"
    >
      <div
        v-for="group in timeline.yearGroups"
        :key="group.key"
        class="absolute top-0 flex h-7 items-center justify-center border-r border-border bg-muted/70 text-xs font-medium"
        :style="{ left: `${group.left}px`, width: `${group.width}px` }"
      >
        {{ group.label }}
      </div>

      <div
        v-for="group in timeline.monthGroups"
        :key="group.key"
        class="absolute top-7 flex h-7 items-center justify-center border-r border-border bg-muted/35 text-xs"
        :style="{ left: `${group.left}px`, width: `${group.width}px` }"
      >
        {{ group.label }}
      </div>

      <div
        v-for="day in timeline.days"
        :key="day.key"
        class="absolute top-14 flex h-7 flex-col items-center justify-center border-r border-border/70 text-[10px]"
        :class="getDayCellClass(day)"
        :style="{ left: `${day.left}px`, width: `${day.width}px` }"
      >
        <span>{{ day.dayOfMonth }}</span>
        <span class="text-[9px]">{{ day.dayName }}</span>
      </div>
    </div>
  </div>
</template>
