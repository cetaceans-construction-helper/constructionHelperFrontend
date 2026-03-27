<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { GripVertical, PanelLeftClose, PanelLeftOpen } from 'lucide-vue-next'
import ScheduleChartBody from '@/features/schedule/schedule-2d-rebuild/ui/components/ScheduleChartBody.vue'
import ScheduleRowPanel from '@/features/schedule/schedule-2d-rebuild/ui/components/ScheduleRowPanel.vue'
import ScheduleTimelineHeader from '@/features/schedule/schedule-2d-rebuild/ui/components/ScheduleTimelineHeader.vue'
import type { ScheduleShellLayout, ScheduleTimelineLayout } from '@/features/schedule/schedule-2d-rebuild/model/schedule-rebuild-types'

const SHELL_HEADER_HEIGHT = 84
const ROW_PANEL_FOOTER_HEIGHT = 72
const ROW_PANEL_MIN_WIDTH = 240
const ROW_PANEL_MAX_WIDTH = 560
const ROW_PANEL_HANDLE_WIDTH = 10
const MIN_CHART_WIDTH = 360

type ConnectionCreationState = {
  kind: 'dependency' | 'link' | 'critical-path'
  sourceItemId: string
  pathId?: number
  colorHex?: string
}

const props = defineProps<{
  timeline: ScheduleTimelineLayout
  shellLayout: ScheduleShellLayout
  viewportHeight?: number
  rowPanelWidth: number
  rowPanelOpen: boolean
  scrollTop: number
  scrollLeft: number
  selectedSummaryBlockIds: string[]
  selectedItemIds: string[]
  selectedDependencyIds: string[]
  selectedLinkIds: string[]
  selectedCriticalPathIds: string[]
  connectionCreationState: ConnectionCreationState | null
  canZoomIn: boolean
  canZoomOut: boolean
  showCriticalPaths: boolean
  criticalPathCount: number
}>()

const emit = defineEmits<{
  'scroll-sync': [position: { top: number; left: number }]
  'clear-selection': []
  'add-parent-row': []
  'add-child-row': [parentRowId: string]
  'toggle-row-collapse': [rowId: string]
  'select-bars': [payload: { itemIds: string[]; summaryBlockIds: string[] }]
  'item-context-menu': [payload: { itemId: string; x: number; y: number }]
  'summary-block-context-menu': [payload: { rowId: string; summaryBlockId: string; x: number; y: number }]
  'dependency-context-menu': [payload: { dependencyId: string; x: number; y: number }]
  'link-context-menu': [payload: { linkId: string; x: number; y: number }]
  'critical-path-context-menu': [payload: { criticalPathId: string; x: number; y: number }]
  'row-context-menu': [payload: { rowId: string; x: number; y: number }]
  'canvas-context-menu': [payload: { x: number; y: number; rowId: string | null; date: string | null }]
  'cancel-connection-create': []
  'complete-connection-create': [targetItemId: string]
  'milestone-activate': [payload: { date: string; milestoneId?: string }]
  'move-start': [payload: { kind: 'item'; itemId: string } | { kind: 'summary'; rowId: string; summaryBlockId: string }]
  'move-preview': [payload: { deltaDays: number; deltaLanes: number }]
  'move-end': []
  'resize-start': [payload: { kind: 'item'; itemId: string; edge: 'left' | 'right' } | { kind: 'summary'; rowId: string; summaryBlockId: string; edge: 'left' | 'right' }]
  'resize-preview': [payload: { deltaDays: number }]
  'resize-end': []
  'zoom-in': []
  'zoom-out': []
  'toggle-critical-paths': []
  'row-panel-width-change': [width: number]
  'row-panel-open-change': [open: boolean]
}>()

const shellRootRef = ref<HTMLElement | null>(null)
const hoveredRowId = ref<string | null>(null)
const hoveredDate = ref<string | null>(null)
const rowPanelResizeState = ref<{ startClientX: number; startWidth: number } | null>(null)

function handleRowPanelScroll(scrollTop: number) {
  emit('scroll-sync', { top: scrollTop, left: props.scrollLeft })
}

function handleChartScroll(position: { top: number; left: number }) {
  emit('scroll-sync', position)
}

function handleHoverCell(payload: { rowId: string | null; date: string | null }) {
  hoveredRowId.value = payload.rowId
  hoveredDate.value = payload.date
}

function clampRowPanelWidth(nextWidth: number) {
  const shellWidth = shellRootRef.value?.clientWidth ?? 0
  const maxWidthByShell = shellWidth > 0
    ? Math.max(ROW_PANEL_MIN_WIDTH, shellWidth - MIN_CHART_WIDTH - ROW_PANEL_HANDLE_WIDTH)
    : ROW_PANEL_MAX_WIDTH

  return Math.min(Math.max(nextWidth, ROW_PANEL_MIN_WIDTH), Math.min(ROW_PANEL_MAX_WIDTH, maxWidthByShell))
}

function handleRowPanelResizeStart(event: PointerEvent) {
  if (!props.rowPanelOpen || event.button !== 0) return

  event.preventDefault()
  rowPanelResizeState.value = {
    startClientX: event.clientX,
    startWidth: props.rowPanelWidth,
  }
}

function handleWindowPointerMove(event: PointerEvent) {
  const resizeState = rowPanelResizeState.value
  if (!resizeState) return

  emit('row-panel-width-change', clampRowPanelWidth(resizeState.startWidth + (event.clientX - resizeState.startClientX)))
}

function handleWindowPointerUp() {
  rowPanelResizeState.value = null
}

function closeRowPanel() {
  emit('row-panel-open-change', false)
}

function openRowPanel() {
  emit('row-panel-open-change', true)
}

const shellHeight = computed(() => Math.max(props.viewportHeight ?? 640, 320))
const bodyViewportHeight = computed(() => Math.max(shellHeight.value - SHELL_HEADER_HEIGHT, 200))
const milestoneDates = computed(() => Array.from(new Set(props.shellLayout.milestones.map((milestone) => milestone.date))))
const shellGridTemplateColumns = computed(() => (
  props.rowPanelOpen
    ? `${props.rowPanelWidth}px ${ROW_PANEL_HANDLE_WIDTH}px minmax(0,1fr)`
    : `0px 0px minmax(0,1fr)`
))

onMounted(() => {
  window.addEventListener('pointermove', handleWindowPointerMove)
  window.addEventListener('pointerup', handleWindowPointerUp)
})

onUnmounted(() => {
  window.removeEventListener('pointermove', handleWindowPointerMove)
  window.removeEventListener('pointerup', handleWindowPointerUp)
})
</script>

<template>
  <div
    ref="shellRootRef"
    class="h-full overflow-hidden rounded-lg border border-border bg-background"
    :style="{ height: `${shellHeight}px` }"
  >
    <div class="grid h-full min-w-0" :style="{ gridTemplateColumns: shellGridTemplateColumns }">
      <div
        class="flex h-full min-h-0 flex-col overflow-hidden"
        :class="rowPanelOpen ? 'border-r border-border' : 'border-r-0'"
      >
        <div class="flex h-[84px] items-center justify-between gap-3 border-b border-border bg-muted/25 px-4">
          <p class="text-sm font-semibold">공정</p>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="왼쪽 패널 닫기"
            @click="closeRowPanel"
          >
            <PanelLeftClose class="h-4 w-4" />
          </button>
        </div>

        <div class="relative min-h-0 flex-1">
          <ScheduleRowPanel
            :rows="shellLayout.rows"
            :viewport-height="bodyViewportHeight"
            :scroll-top="scrollTop"
            :hovered-row-id="hoveredRowId"
            :bottom-inset="ROW_PANEL_FOOTER_HEIGHT"
            @scroll-top-change="handleRowPanelScroll"
            @toggle-row-collapse="emit('toggle-row-collapse', $event)"
            @add-child-row="emit('add-child-row', $event)"
            @row-context-menu="emit('row-context-menu', $event)"
          />

          <div class="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3">
            <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background via-background/95 to-transparent" />
            <button
              type="button"
              class="pointer-events-auto relative z-10 flex h-10 w-full items-center justify-center rounded-md border border-border bg-background text-sm font-medium text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
              @click="emit('add-parent-row')"
            >
              + 상위
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="rowPanelOpen"
        class="relative h-full"
      >
        <div
          class="group absolute inset-y-0 left-1/2 w-3 -translate-x-1/2 cursor-col-resize"
          @pointerdown="handleRowPanelResizeStart"
        >
          <div
            class="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors"
            :class="rowPanelResizeState ? 'bg-sky-400' : 'bg-border group-hover:bg-sky-300'"
          />
          <div
            class="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background/95 px-0.5 py-1 text-muted-foreground shadow-sm transition-opacity"
            :class="rowPanelResizeState ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
          >
            <GripVertical class="h-3 w-3" />
          </div>
        </div>
      </div>

      <div v-else class="h-full" />

      <div class="flex h-full min-h-0 min-w-0 flex-col">
        <div class="relative">
          <ScheduleTimelineHeader
            :timeline="timeline"
            :scroll-left="scrollLeft"
            :milestone-dates="milestoneDates"
            :hovered-date="hoveredDate"
          />

          <div
            v-if="!rowPanelOpen"
            class="pointer-events-none absolute left-4 top-3 z-10"
          >
            <button
              type="button"
              class="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded border border-border bg-background/95 text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
              title="왼쪽 패널 열기"
              @click="openRowPanel"
            >
              <PanelLeftOpen class="h-4 w-4" />
            </button>
          </div>

          <div class="pointer-events-none absolute right-4 top-3 z-10 flex items-center gap-2">
            <button
              type="button"
              class="pointer-events-auto inline-flex items-center gap-2 rounded border px-3 py-1 text-xs shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              :class="showCriticalPaths
                ? 'border-red-200 bg-red-50/95 text-red-700 hover:bg-red-100'
                : 'border-border bg-background/95 text-muted-foreground hover:bg-muted'"
              :disabled="criticalPathCount === 0"
              @click="emit('toggle-critical-paths')"
            >
              <span>Critical path</span>
              <span
                class="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                :class="showCriticalPaths ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'"
              >
                {{ criticalPathCount }}
              </span>
            </button>
            <button
              type="button"
              class="pointer-events-auto rounded border border-border bg-background/95 px-2.5 py-1 text-xs text-muted-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!canZoomOut"
              @click="emit('zoom-out')"
            >
              -
            </button>
            <button
              type="button"
              class="pointer-events-auto rounded border border-border bg-background/95 px-2.5 py-1 text-xs text-muted-foreground shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!canZoomIn"
              @click="emit('zoom-in')"
            >
              +
            </button>
          </div>
        </div>

        <ScheduleChartBody
          :timeline="timeline"
          :shell-layout="shellLayout"
          :viewport-height="bodyViewportHeight"
          :scroll-top="scrollTop"
          :scroll-left="scrollLeft"
          :selected-summary-block-ids="selectedSummaryBlockIds"
          :selected-item-ids="selectedItemIds"
          :selected-dependency-ids="selectedDependencyIds"
          :selected-link-ids="selectedLinkIds"
          :selected-critical-path-ids="selectedCriticalPathIds"
          :connection-creation-state="connectionCreationState"
          @scroll-change="handleChartScroll"
          @clear-selection="emit('clear-selection')"
          @toggle-row-collapse="emit('toggle-row-collapse', $event)"
          @select-bars="emit('select-bars', $event)"
          @item-context-menu="emit('item-context-menu', $event)"
          @summary-block-context-menu="emit('summary-block-context-menu', $event)"
          @dependency-context-menu="emit('dependency-context-menu', $event)"
          @link-context-menu="emit('link-context-menu', $event)"
          @critical-path-context-menu="emit('critical-path-context-menu', $event)"
          @row-context-menu="emit('row-context-menu', $event)"
          @canvas-context-menu="emit('canvas-context-menu', $event)"
          @cancel-connection-create="emit('cancel-connection-create')"
          @complete-connection-create="emit('complete-connection-create', $event)"
          @milestone-activate="emit('milestone-activate', $event)"
          @move-start="emit('move-start', $event)"
          @move-preview="emit('move-preview', $event)"
          @move-end="emit('move-end')"
          @resize-start="emit('resize-start', $event)"
          @resize-preview="emit('resize-preview', $event)"
          @resize-end="emit('resize-end')"
          @hover-cell="handleHoverCell"
        />
      </div>
    </div>
  </div>
</template>
