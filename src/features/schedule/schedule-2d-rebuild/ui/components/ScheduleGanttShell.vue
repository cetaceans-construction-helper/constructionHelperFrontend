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
  selectedItemIds: string[]
}>()

const emit = defineEmits<{
  'scroll-sync': [position: { top: number; left: number }]
  'clear-selection': []
  'add-parent-row': []
  'add-child-row': [parentRowId: string]
  'toggle-row-collapse': [rowId: string]
  'select-items': [itemIds: string[]]
  'item-context-menu': [payload: { itemId: string; x: number; y: number }]
  'row-context-menu': [payload: { rowId: string; x: number; y: number }]
  'canvas-context-menu': [payload: { x: number; y: number; rowId: string | null; date: string | null }]
  'move-start': [payload: { kind: 'item'; itemId: string } | { kind: 'summary'; rowId: string }]
  'move-preview': [payload: { deltaDays: number; deltaLanes: number }]
  'move-end': []
  'resize-start': [payload: { kind: 'item'; itemId: string; edge: 'left' | 'right' } | { kind: 'summary'; rowId: string; edge: 'left' | 'right' }]
  'resize-preview': [payload: { deltaDays: number }]
  'resize-end': []
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
          :selected-item-ids="selectedItemIds"
          @scroll-change="handleChartScroll"
          @clear-selection="emit('clear-selection')"
          @toggle-row-collapse="emit('toggle-row-collapse', $event)"
          @select-items="emit('select-items', $event)"
          @item-context-menu="emit('item-context-menu', $event)"
          @row-context-menu="emit('row-context-menu', $event)"
          @canvas-context-menu="emit('canvas-context-menu', $event)"
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
