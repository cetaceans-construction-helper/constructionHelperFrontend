<script setup lang="ts">
import { computed } from 'vue'
import ScheduleChartBody from '@/features/schedule/schedule-2d-rebuild/ui/components/ScheduleChartBody.vue'
import ScheduleRowPanel from '@/features/schedule/schedule-2d-rebuild/ui/components/ScheduleRowPanel.vue'
import ScheduleTimelineHeader from '@/features/schedule/schedule-2d-rebuild/ui/components/ScheduleTimelineHeader.vue'
import type { ScheduleShellLayout, ScheduleTimelineLayout } from '@/features/schedule/schedule-2d-rebuild/model/schedule-rebuild-types'

const SHELL_HEADER_HEIGHT = 84

const props = defineProps<{
  timeline: ScheduleTimelineLayout
  shellLayout: ScheduleShellLayout
  viewportHeight?: number
  scrollTop: number
  scrollLeft: number
}>()

const emit = defineEmits<{
  'scroll-sync': [position: { top: number; left: number }]
}>()

function handleRowPanelScroll(scrollTop: number) {
  emit('scroll-sync', { top: scrollTop, left: props.scrollLeft })
}

function handleChartScroll(position: { top: number; left: number }) {
  emit('scroll-sync', position)
}

const shellHeight = computed(() => Math.max(props.viewportHeight ?? 640, 320))
const bodyViewportHeight = computed(() => Math.max(shellHeight.value - SHELL_HEADER_HEIGHT, 200))
</script>

<template>
  <div
    class="h-full overflow-hidden rounded-lg border border-border bg-background"
    :style="{ height: `${shellHeight}px` }"
  >
    <div class="grid h-full min-w-0 grid-cols-[320px_minmax(0,1fr)]">
      <div class="flex h-full min-h-0 flex-col border-r border-border">
        <div class="flex h-[84px] items-center border-b border-border bg-muted/25 px-4">
          <p class="text-sm font-semibold">공정</p>
        </div>

        <ScheduleRowPanel
          :rows="shellLayout.rows"
          :viewport-height="bodyViewportHeight"
          :scroll-top="scrollTop"
          @scroll-top-change="handleRowPanelScroll"
        />
      </div>

      <div class="flex h-full min-h-0 min-w-0 flex-col">
        <ScheduleTimelineHeader
          :timeline="timeline"
          :scroll-left="scrollLeft"
        />

        <ScheduleChartBody
          :timeline="timeline"
          :shell-layout="shellLayout"
          :viewport-height="bodyViewportHeight"
          :scroll-top="scrollTop"
          :scroll-left="scrollLeft"
          @scroll-change="handleChartScroll"
        />
      </div>
    </div>
  </div>
</template>
