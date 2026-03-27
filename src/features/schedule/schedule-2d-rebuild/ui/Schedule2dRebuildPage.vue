<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import PageContainer from '@/shared/helper-ui/PageContainer.vue'
import AreaCard from '@/shared/helper-ui/AreaCard.vue'
import ScheduleColorPalettePopover from '@/features/schedule/schedule-2d-rebuild/ui/components/ScheduleColorPalettePopover.vue'
import ScheduleContextMenu from '@/features/schedule/schedule-2d-rebuild/ui/components/ScheduleContextMenu.vue'
import ScheduleGanttShell from '@/features/schedule/schedule-2d-rebuild/ui/components/ScheduleGanttShell.vue'
import ScheduleWorkCreateDialog from '@/features/schedule/schedule-2d-rebuild/ui/components/ScheduleWorkCreateDialog.vue'
import { scheduleService } from '@/features/schedule/schedule-2d-rebuild/use-cases/schedule-service'
import { useSchedule2dRebuildPage } from '@/features/schedule/schedule-2d-rebuild/view-model/useSchedule2dRebuildPage'

const DEFAULT_ROW_PANEL_WIDTH = 320
const ROW_PANEL_HANDLE_WIDTH = 10

const {
  isLoading,
  errorMessage,
  selectionState,
  contextMenuState,
  colorPaletteState,
  workCreateDialogState,
  contextMenuItems,
  timeline,
  shellLayout,
  canZoomIn,
  canZoomOut,
  showCriticalPaths,
  criticalPathCount,
  connectionCreationState,
  chartScrollTop,
  chartScrollLeft,
  loadSnapshot,
  clearSelection,
  closeContextMenu,
  closeColorPalette,
  addParentRow,
  addChildRow,
  toggleRowCollapse,
  selectBars,
  openItemContextMenu,
  openSummaryBlockContextMenu,
  openDependencyContextMenu,
  openLinkContextMenu,
  openCriticalPathContextMenu,
  openRowContextMenu,
  openCanvasContextMenu,
  executeContextMenuCommand,
  applyColorPalette,
  setWorkCreateDialogOpen,
  cancelConnectionCreation,
  completeConnectionCreation,
  activateMilestone,
  startMoveSession,
  previewMoveSession,
  endMoveSession,
  startResizeSession,
  previewResizeSession,
  endResizeSession,
  zoomIn,
  zoomOut,
  toggleCriticalPaths,
  syncChartScroll,
} = useSchedule2dRebuildPage()

const shellHostRef = ref<HTMLElement | null>(null)
const shellViewportHeight = ref(640)
const chartViewportWidth = ref(0)
const rowPanelWidth = ref(DEFAULT_ROW_PANEL_WIDTH)
const rowPanelOpen = ref(true)
const shouldApplyInitialTimelineScroll = ref(true)
let resizeObserver: ResizeObserver | null = null

function syncShellViewport() {
  if (!shellHostRef.value) return

  shellViewportHeight.value = Math.max(shellHostRef.value.clientHeight, 320)
  chartViewportWidth.value = Math.max(
    shellHostRef.value.clientWidth - (rowPanelOpen.value ? rowPanelWidth.value + ROW_PANEL_HANDLE_WIDTH : 0),
    0,
  )
}

async function reloadSnapshot() {
  shouldApplyInitialTimelineScroll.value = true
  await loadSnapshot()
}

async function handleWorkSaved() {
  await loadSnapshot()
}

function handleZoomIn() {
  zoomIn(chartViewportWidth.value)
}

function handleZoomOut() {
  zoomOut(chartViewportWidth.value)
}

function handleRowPanelWidthChange(nextWidth: number) {
  rowPanelWidth.value = nextWidth
  syncShellViewport()
}

function handleRowPanelOpenChange(nextOpen: boolean) {
  rowPanelOpen.value = nextOpen
  syncShellViewport()
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
  () => [rowPanelWidth.value, rowPanelOpen.value] as const,
  () => {
    syncShellViewport()
  },
)

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
          :row-panel-width="rowPanelWidth"
          :row-panel-open="rowPanelOpen"
          :scroll-top="chartScrollTop"
          :scroll-left="chartScrollLeft"
          :selected-summary-block-ids="selectionState.summaryBlockIds"
          :selected-item-ids="selectionState.itemIds"
          :selected-dependency-ids="selectionState.dependencyIds"
          :selected-link-ids="selectionState.linkIds"
          :selected-critical-path-ids="selectionState.criticalPathIds"
          :connection-creation-state="connectionCreationState"
          :can-zoom-in="canZoomIn"
          :can-zoom-out="canZoomOut"
          :show-critical-paths="showCriticalPaths"
          :critical-path-count="criticalPathCount"
          @scroll-sync="syncChartScroll"
          @clear-selection="clearSelection"
          @add-parent-row="addParentRow"
          @add-child-row="addChildRow"
          @toggle-row-collapse="toggleRowCollapse"
          @select-bars="selectBars"
          @item-context-menu="openItemContextMenu"
          @summary-block-context-menu="openSummaryBlockContextMenu"
          @dependency-context-menu="openDependencyContextMenu"
          @link-context-menu="openLinkContextMenu"
          @critical-path-context-menu="openCriticalPathContextMenu"
          @row-context-menu="openRowContextMenu"
          @canvas-context-menu="openCanvasContextMenu"
          @cancel-connection-create="cancelConnectionCreation"
          @complete-connection-create="completeConnectionCreation"
          @milestone-activate="activateMilestone"
          @move-start="startMoveSession"
          @move-preview="previewMoveSession"
          @move-end="endMoveSession"
          @resize-start="startResizeSession"
          @resize-preview="previewResizeSession"
          @resize-end="endResizeSession"
          @zoom-in="handleZoomIn"
          @zoom-out="handleZoomOut"
          @toggle-critical-paths="toggleCriticalPaths"
          @row-panel-width-change="handleRowPanelWidthChange"
          @row-panel-open-change="handleRowPanelOpenChange"
        />

        <div
          v-else-if="isLoading"
          class="absolute inset-0 flex items-center justify-center rounded-lg border border-border bg-muted/20 text-sm text-muted-foreground"
        >
          schedule snapshot을 불러오는 중...
        </div>

        <ScheduleContextMenu
          :open="contextMenuState.open"
          :x="contextMenuState.x"
          :y="contextMenuState.y"
          :items="contextMenuItems"
          @close="closeContextMenu"
          @select="executeContextMenuCommand"
        />

        <ScheduleColorPalettePopover
          :open="colorPaletteState.open"
          :x="colorPaletteState.x"
          :y="colorPaletteState.y"
          :title="colorPaletteState.title"
          :subtitle="colorPaletteState.subtitle"
          :selected-color-hex="colorPaletteState.selectedColorHex"
          :show-reset="colorPaletteState.showReset"
          :reset-active="colorPaletteState.resetActive"
          :reset-label="colorPaletteState.resetLabel"
          @close="closeColorPalette"
          @select="applyColorPalette"
        />

        <ScheduleWorkCreateDialog
          :open="workCreateDialogState.open"
          :mode="workCreateDialogState.mode"
          :work-id="workCreateDialogState.workId"
          :start-date="workCreateDialogState.startDate"
          :preset="workCreateDialogState.preset"
          @update:open="setWorkCreateDialogOpen"
          @saved="handleWorkSaved"
        />

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
