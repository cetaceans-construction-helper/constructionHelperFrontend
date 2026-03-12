<script setup lang="ts">
import { computed } from 'vue'
import ScheduleChartBody from '@/features/schedule/schedule-2d-rebuild/ui/components/ScheduleChartBody.vue'
import ScheduleRowPanel from '@/features/schedule/schedule-2d-rebuild/ui/components/ScheduleRowPanel.vue'
import ScheduleTimelineHeader from '@/features/schedule/schedule-2d-rebuild/ui/components/ScheduleTimelineHeader.vue'
import type { ScheduleShellLayout, ScheduleTimelineLayout } from '@/features/schedule/schedule-2d-rebuild/model/schedule-rebuild-types'

const SHELL_HEADER_HEIGHT = 84
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
  scrollTop: number
  scrollLeft: number
  selectedRowIds: string[]
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
  'select-bars': [payload: { itemIds: string[]; rowIds: string[] }]
  'item-context-menu': [payload: { itemId: string; x: number; y: number }]
  'dependency-context-menu': [payload: { dependencyId: string; x: number; y: number }]
  'link-context-menu': [payload: { linkId: string; x: number; y: number }]
  'critical-path-context-menu': [payload: { criticalPathId: string; x: number; y: number }]
  'row-context-menu': [payload: { rowId: string; x: number; y: number }]
  'canvas-context-menu': [payload: { x: number; y: number; rowId: string | null; date: string | null }]
  'cancel-connection-create': []
  'complete-connection-create': [targetItemId: string]
  'milestone-activate': [payload: { date: string; milestoneId?: string }]
  'move-start': [payload: { kind: 'item'; itemId: string } | { kind: 'summary'; rowId: string }]
  'move-preview': [payload: { deltaDays: number; deltaLanes: number }]
  'move-end': []
  'resize-start': [payload: { kind: 'item'; itemId: string; edge: 'left' | 'right' } | { kind: 'summary'; rowId: string; edge: 'left' | 'right' }]
  'resize-preview': [payload: { deltaDays: number }]
  'resize-end': []
  'zoom-in': []
  'zoom-out': []
  'toggle-critical-paths': []
}>()

function handleRowPanelScroll(scrollTop: number) {
  emit('scroll-sync', { top: scrollTop, left: props.scrollLeft })
}

function handleChartScroll(position: { top: number; left: number }) {
  emit('scroll-sync', position)
}

const shellHeight = computed(() => Math.max(props.viewportHeight ?? 640, 320))
const bodyViewportHeight = computed(() => Math.max(shellHeight.value - SHELL_HEADER_HEIGHT, 200))
const milestoneDates = computed(() => Array.from(new Set(props.shellLayout.milestones.map((milestone) => milestone.date))))
</script>

<template>
  <div
    class="h-full overflow-hidden rounded-lg border border-border bg-background"
    :style="{ height: `${shellHeight}px` }"
  >
    <div class="grid h-full min-w-0 grid-cols-[320px_minmax(0,1fr)]">
      <div class="flex h-full min-h-0 flex-col border-r border-border">
        <div class="flex h-[84px] items-center justify-between gap-3 border-b border-border bg-muted/25 px-4">
          <p class="text-sm font-semibold">공정</p>
          <button
            type="button"
            class="rounded border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            @click="emit('add-parent-row')"
          >
            + 상위
          </button>
        </div>

        <ScheduleRowPanel
          :rows="shellLayout.rows"
          :viewport-height="bodyViewportHeight"
          :scroll-top="scrollTop"
          @scroll-top-change="handleRowPanelScroll"
          @toggle-row-collapse="emit('toggle-row-collapse', $event)"
          @add-child-row="emit('add-child-row', $event)"
          @row-context-menu="emit('row-context-menu', $event)"
        />
      </div>

      <div class="flex h-full min-h-0 min-w-0 flex-col">
        <div class="relative">
          <ScheduleTimelineHeader
            :timeline="timeline"
            :scroll-left="scrollLeft"
            :milestone-dates="milestoneDates"
          />

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
          :selected-row-ids="selectedRowIds"
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
        />
      </div>
    </div>
  </div>
</template>
