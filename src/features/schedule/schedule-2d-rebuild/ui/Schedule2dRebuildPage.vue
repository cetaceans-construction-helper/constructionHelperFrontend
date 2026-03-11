<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import PageContainer from '@/shared/helper-ui/PageContainer.vue'
import AreaCard from '@/shared/helper-ui/AreaCard.vue'
import ScheduleGanttShell from '@/features/schedule/schedule-2d-rebuild/ui/components/ScheduleGanttShell.vue'
import { scheduleService } from '@/features/schedule/schedule-2d-rebuild/use-cases/schedule-service'
import { useSchedule2dRebuildPage } from '@/features/schedule/schedule-2d-rebuild/view-model/useSchedule2dRebuildPage'

const ROW_PANEL_WIDTH = 320

const {
  isLoading,
  errorMessage,
  selectionState,
  timeline,
  shellLayout,
  chartScrollTop,
  chartScrollLeft,
  loadSnapshot,
  clearSelection,
  addParentRow,
  addChildRow,
  toggleRowCollapse,
  selectItems,
  startMoveSession,
  previewMoveSession,
  endMoveSession,
  startResizeSession,
  previewResizeSession,
  endResizeSession,
  syncChartScroll,
} = useSchedule2dRebuildPage()

const shellHostRef = ref<HTMLElement | null>(null)
const shellViewportHeight = ref(640)
const chartViewportWidth = ref(0)
const shouldApplyInitialTimelineScroll = ref(true)
let resizeObserver: ResizeObserver | null = null

function syncShellViewport() {
  if (!shellHostRef.value) return

  shellViewportHeight.value = Math.max(shellHostRef.value.clientHeight, 320)
  chartViewportWidth.value = Math.max(shellHostRef.value.clientWidth - ROW_PANEL_WIDTH, 0)
}

async function reloadSnapshot() {
  shouldApplyInitialTimelineScroll.value = true
  await loadSnapshot()
}

onMounted(() => {
  void reloadSnapshot()

  if (shellHostRef.value) {
    resizeObserver = new ResizeObserver(() => {
      syncShellViewport()
    })
    resizeObserver.observe(shellHostRef.value)
    syncShellViewport()
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

watch(
  () => [timeline.value, chartViewportWidth.value] as const,
  async ([nextTimeline, nextChartViewportWidth]) => {
    if (!shouldApplyInitialTimelineScroll.value || !nextTimeline || nextChartViewportWidth <= 0) return

    await nextTick()
    syncChartScroll({
      top: 0,
      left: scheduleService.getInitialScrollLeftForYesterday(nextTimeline, nextChartViewportWidth),
    })
    shouldApplyInitialTimelineScroll.value = false
  },
)
</script>

<template>
  <PageContainer title="2D공정표 Rebuild">
    <AreaCard height="flex-1" min-height="calc(100vh - 180px)">
      <div ref="shellHostRef" class="relative h-full min-h-0 flex-1">
        <ScheduleGanttShell
          v-if="timeline && shellLayout"
          class="h-full"
          :timeline="timeline"
          :shell-layout="shellLayout"
          :viewport-height="shellViewportHeight"
          :scroll-top="chartScrollTop"
          :scroll-left="chartScrollLeft"
          :selected-item-ids="selectionState.itemIds"
          @scroll-sync="syncChartScroll"
          @clear-selection="clearSelection"
          @add-parent-row="addParentRow"
          @add-child-row="addChildRow"
          @toggle-row-collapse="toggleRowCollapse"
          @select-items="selectItems"
          @move-start="startMoveSession"
          @move-preview="previewMoveSession"
          @move-end="endMoveSession"
          @resize-start="startResizeSession"
          @resize-preview="previewResizeSession"
          @resize-end="endResizeSession"
        />

        <div
          v-else-if="isLoading"
          class="absolute inset-0 flex items-center justify-center rounded-lg border border-border bg-muted/20 text-sm text-muted-foreground"
        >
          schedule snapshot을 불러오는 중...
        </div>

        <div
          v-if="errorMessage"
          class="absolute left-1/2 top-4 z-20 w-full max-w-xl -translate-x-1/2 px-4"
        >
          <div class="rounded-lg border border-destructive/30 bg-background/95 px-4 py-3 text-sm text-destructive shadow-lg backdrop-blur-sm">
            {{ errorMessage }}
          </div>
        </div>
      </div>
    </AreaCard>
  </PageContainer>
</template>
