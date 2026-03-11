<script setup lang="ts">
import type { ScheduleTimelineLayout } from '@/features/schedule/schedule-2d-rebuild/model/schedule-rebuild-types'

defineProps<{
  timeline: ScheduleTimelineLayout
  scrollLeft: number
}>()
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
        :class="{
          'bg-blue-50 font-semibold text-blue-700': day.isToday,
          'bg-muted/20 text-muted-foreground': !day.isToday && day.isWeekend,
        }"
        :style="{ left: `${day.left}px`, width: `${day.width}px` }"
      >
        <span>{{ day.dayOfMonth }}</span>
        <span class="text-[9px]">{{ day.dayName }}</span>
      </div>
    </div>
  </div>
</template>
