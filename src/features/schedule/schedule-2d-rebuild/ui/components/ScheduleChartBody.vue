<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { ScheduleBarLayout, ScheduleShellLayout, ScheduleTimelineLayout } from '@/features/schedule/schedule-2d-rebuild/model/schedule-rebuild-types'

type MarqueeState = {
  startX: number
  startY: number
  currentX: number
  currentY: number
}

type PanState = {
  startClientX: number
  startClientY: number
  startScrollLeft: number
  startScrollTop: number
}

type MoveState = {
  target: 'item' | 'summary'
  rowId: string | null
  startClientX: number
  startClientY: number
  laneStep: number
  didDrag: boolean
}

type ResizeState = {
  startClientX: number
  edge: 'left' | 'right'
}

const props = defineProps<{
  timeline: ScheduleTimelineLayout
  shellLayout: ScheduleShellLayout
  viewportHeight: number
  scrollTop: number
  scrollLeft: number
  selectedItemIds: string[]
}>()

const emit = defineEmits<{
  'scroll-change': [position: { top: number; left: number }]
  'clear-selection': []
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

const containerRef = ref<HTMLElement | null>(null)
const marqueeState = ref<MarqueeState | null>(null)
const panState = ref<PanState | null>(null)
const moveState = ref<MoveState | null>(null)
const resizeState = ref<ResizeState | null>(null)
const isSpacePressed = ref(false)
let syncingFromProp = false
const LANE_GAP = 6
const DRAG_ACTIVATION_THRESHOLD = 4

const selectedItemIdSet = computed(() => new Set(props.selectedItemIds))

const marqueeRectStyle = computed(() => {
  if (!marqueeState.value) return null

  const left = Math.min(marqueeState.value.startX, marqueeState.value.currentX)
  const top = Math.min(marqueeState.value.startY, marqueeState.value.currentY)
  const width = Math.abs(marqueeState.value.currentX - marqueeState.value.startX)
  const height = Math.abs(marqueeState.value.currentY - marqueeState.value.startY)

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
    height: `${height}px`,
  }
})

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

function getContentPoint(event: PointerEvent | MouseEvent) {
  const element = containerRef.value
  if (!element) return null

  const rect = element.getBoundingClientRect()
  return {
    x: event.clientX - rect.left + element.scrollLeft,
    y: event.clientY - rect.top + element.scrollTop,
  }
}

function getDateAtContentX(contentX: number): string | null {
  const dayIndex = Math.floor(contentX / props.timeline.dayWidth)
  return props.timeline.days[dayIndex]?.date ?? null
}

function getRowIdAtContentY(contentY: number): string | null {
  const row = props.shellLayout.rows.find((candidate) => (
    contentY >= candidate.top && contentY < candidate.top + candidate.height
  ))
  return row?.id ?? null
}

function selectBarsInMarquee() {
  if (!marqueeState.value) return

  const left = Math.min(marqueeState.value.startX, marqueeState.value.currentX)
  const right = Math.max(marqueeState.value.startX, marqueeState.value.currentX)
  const top = Math.min(marqueeState.value.startY, marqueeState.value.currentY)
  const bottom = Math.max(marqueeState.value.startY, marqueeState.value.currentY)

  const selectedIds = props.shellLayout.bars
    .filter((bar) => {
      if (bar.kind !== 'item') return false
      const barRight = bar.left + bar.width
      const barBottom = bar.top + bar.height
      return bar.left < right && barRight > left && bar.top < bottom && barBottom > top
    })
    .map((bar) => bar.itemId)

  emit('select-items', selectedIds)
}

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

function handlePanePointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  const point = getContentPoint(event)
  if (!point) return

  if (isSpacePressed.value) {
    const element = containerRef.value
    if (!element) return

    panState.value = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startScrollLeft: element.scrollLeft,
      startScrollTop: element.scrollTop,
    }
    return
  }

  marqueeState.value = {
    startX: point.x,
    startY: point.y,
    currentX: point.x,
    currentY: point.y,
  }
}

function handleBarPointerDown(bar: ScheduleBarLayout, event: PointerEvent) {
  if (event.button !== 0 || isSpacePressed.value) return
  event.stopPropagation()

  if (bar.kind === 'summary') {
    emit('move-start', { kind: 'summary', rowId: bar.rowId })
    moveState.value = {
      target: 'summary',
      rowId: bar.rowId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      laneStep: bar.height + LANE_GAP,
      didDrag: false,
    }
    return
  }

  emit('move-start', { kind: 'item', itemId: bar.itemId })
  moveState.value = {
    target: 'item',
    rowId: null,
    startClientX: event.clientX,
    startClientY: event.clientY,
    laneStep: bar.height + LANE_GAP,
    didDrag: false,
  }
}

function handleResizePointerDown(bar: ScheduleBarLayout, edge: 'left' | 'right', event: PointerEvent) {
  if (event.button !== 0 || isSpacePressed.value) return
  event.stopPropagation()
  if (bar.kind === 'summary') {
    emit('resize-start', { kind: 'summary', rowId: bar.rowId, edge })
  } else {
    emit('resize-start', { kind: 'item', itemId: bar.itemId, edge })
  }
  resizeState.value = {
    startClientX: event.clientX,
    edge,
  }
}

function handlePaneContextMenu(event: MouseEvent) {
  const point = getContentPoint(event)
  emit('canvas-context-menu', {
    x: event.clientX,
    y: event.clientY,
    rowId: point ? getRowIdAtContentY(point.y) : null,
    date: point ? getDateAtContentX(point.x) : null,
  })
}

function handleRowContextMenu(row: ScheduleShellLayout['rows'][number], event: MouseEvent) {
  if (row.kind === 'child-process') {
    const point = getContentPoint(event)
    emit('canvas-context-menu', {
      x: event.clientX,
      y: event.clientY,
      rowId: row.id,
      date: point ? getDateAtContentX(point.x) : null,
    })
    return
  }

  emit('row-context-menu', {
    rowId: row.id,
    x: event.clientX,
    y: event.clientY,
  })
}

function handleBarContextMenu(bar: ScheduleBarLayout, event: MouseEvent) {
  if (bar.kind === 'summary') {
    emit('row-context-menu', {
      rowId: bar.rowId,
      x: event.clientX,
      y: event.clientY,
    })
    return
  }

  emit('item-context-menu', {
    itemId: bar.itemId,
    x: event.clientX,
    y: event.clientY,
  })
}

function getBarInlineStyle(bar: ScheduleBarLayout) {
  const style: Record<string, string> = {
    left: `${bar.left}px`,
    top: `${bar.top}px`,
    width: `${bar.width}px`,
    height: `${bar.height}px`,
  }

  if (bar.colorHex) {
    style.backgroundColor = bar.colorHex
    style.color = '#ffffff'

    if (!(bar.kind === 'item' && selectedItemIdSet.value.has(bar.itemId))) {
      style.borderColor = bar.colorHex
    }
  }

  return style
}

function handlePointerMove(event: PointerEvent) {
  if (panState.value) {
    const element = containerRef.value
    if (!element) return

    element.scrollLeft = panState.value.startScrollLeft - (event.clientX - panState.value.startClientX)
    element.scrollTop = panState.value.startScrollTop - (event.clientY - panState.value.startClientY)
    emit('scroll-change', {
      top: element.scrollTop,
      left: element.scrollLeft,
    })
    return
  }

  if (moveState.value) {
    const deltaX = event.clientX - moveState.value.startClientX
    const deltaY = event.clientY - moveState.value.startClientY
    const didDrag = Math.abs(deltaX) >= DRAG_ACTIVATION_THRESHOLD || Math.abs(deltaY) >= DRAG_ACTIVATION_THRESHOLD
    if (didDrag && !moveState.value.didDrag) {
      moveState.value = {
        ...moveState.value,
        didDrag: true,
      }
    }

    const deltaDays = Math.round(deltaX / props.timeline.dayWidth)
    const deltaLanes = Math.round(deltaY / moveState.value.laneStep)
    emit('move-preview', { deltaDays, deltaLanes })
    return
  }

  if (resizeState.value) {
    const deltaDays = Math.round((event.clientX - resizeState.value.startClientX) / props.timeline.dayWidth)
    emit('resize-preview', {
      deltaDays: resizeState.value.edge === 'left' ? deltaDays : deltaDays,
    })
    return
  }

  if (marqueeState.value) {
    const point = getContentPoint(event)
    if (!point) return

    marqueeState.value = {
      ...marqueeState.value,
      currentX: point.x,
      currentY: point.y,
    }
    selectBarsInMarquee()
  }
}

function handlePointerUp() {
  if (panState.value) {
    panState.value = null
    return
  }

  if (moveState.value) {
    if (moveState.value.target === 'summary' && !moveState.value.didDrag && moveState.value.rowId) {
      emit('toggle-row-collapse', moveState.value.rowId)
    }
    emit('move-end')
    moveState.value = null
    return
  }

  if (resizeState.value) {
    emit('resize-end')
    resizeState.value = null
    return
  }

  if (marqueeState.value) {
    const width = Math.abs(marqueeState.value.currentX - marqueeState.value.startX)
    const height = Math.abs(marqueeState.value.currentY - marqueeState.value.startY)

    if (width < 4 && height < 4) {
      emit('clear-selection')
    } else {
      selectBarsInMarquee()
    }

    marqueeState.value = null
  }
}

function handleKeyDown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

  if (event.code === 'Space') {
    event.preventDefault()
    isSpacePressed.value = true
  }
}

function handleKeyUp(event: KeyboardEvent) {
  if (event.code === 'Space') {
    isSpacePressed.value = false
  }
}

onMounted(() => {
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerUp)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})
</script>

<template>
  <div
    ref="containerRef"
    class="overflow-auto bg-background"
    :class="{
      'cursor-grab': isSpacePressed && !panState,
      'cursor-grabbing': !!panState,
      'select-none': marqueeState || moveState || resizeState || panState,
    }"
    :style="{ height: `${viewportHeight}px` }"
    @scroll="handleScroll"
    @pointerdown="handlePanePointerDown"
    @contextmenu.prevent="handlePaneContextMenu"
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
        @contextmenu.prevent.stop="handleRowContextMenu(row, $event)"
      />

      <div
        v-for="bar in shellLayout.bars"
        :key="bar.id"
        class="group absolute box-border flex items-center overflow-hidden rounded-md border px-2 shadow-sm transition-[box-shadow,border-color,border-width]"
        :class="bar.kind === 'summary'
          ? 'cursor-pointer border-slate-400 bg-slate-100 text-slate-700'
          : selectedItemIdSet.has(bar.itemId)
            ? [
                'z-10 cursor-pointer border-2 border-slate-950 shadow-[0_0_0_1px_rgba(15,23,42,0.18)]',
                bar.appearance === 'holiday-off' ? 'bg-slate-200 text-slate-700' : 'bg-sky-500 text-white',
              ]
            : [
                'cursor-pointer',
                bar.appearance === 'holiday-off'
                  ? 'border-slate-300 bg-slate-200 text-slate-700'
                  : 'border-sky-300 bg-sky-500 text-white',
              ]"
        :style="getBarInlineStyle(bar)"
        @pointerdown="handleBarPointerDown(bar, $event)"
        @contextmenu.prevent.stop="handleBarContextMenu(bar, $event)"
      >
        <template v-if="bar.kind === 'summary'">
          <div
            v-for="(segment, index) in bar.rangeMismatchSegments ?? []"
            :key="`${bar.id}-segment-${index}`"
            class="pointer-events-none absolute inset-y-0"
            style="background-image: repeating-linear-gradient(-60deg, rgba(15, 23, 42, 0.42) 0, rgba(15, 23, 42, 0.42) 1px, transparent 1px, transparent 6px);"
            :style="{ left: `${segment.left}px`, width: `${segment.width}px` }"
          />
          <div class="pointer-events-none absolute inset-0 flex items-center justify-center px-2 text-center">
            <span class="truncate text-xs font-extrabold">{{ bar.name }}</span>
          </div>
        </template>
        <span v-else class="block w-full truncate text-center text-xs font-medium">{{ bar.name }}</span>

        <button
          v-if="bar.kind === 'item' || bar.kind === 'summary'"
          type="button"
          class="absolute top-0 h-full w-2.5 cursor-ew-resize rounded-l-md bg-white/40 transition-[opacity,background-color]"
          :class="bar.kind === 'summary'
            ? 'left-0 pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 hover:bg-white/60'
            : bar.kind === 'item' && selectedItemIdSet.has(bar.itemId)
              ? 'left-0 pointer-events-auto opacity-100 hover:bg-white/60'
              : 'left-0 pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 hover:bg-white/60'"
          @pointerdown.stop="handleResizePointerDown(bar, 'left', $event)"
        />
        <button
          v-if="bar.kind === 'item' || bar.kind === 'summary'"
          type="button"
          class="absolute top-0 h-full w-2.5 cursor-ew-resize rounded-r-md bg-white/40 transition-[opacity,background-color]"
          :class="bar.kind === 'summary'
            ? 'right-0 pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 hover:bg-white/60'
            : bar.kind === 'item' && selectedItemIdSet.has(bar.itemId)
              ? 'right-0 pointer-events-auto opacity-100 hover:bg-white/60'
              : 'right-0 pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 hover:bg-white/60'"
          @pointerdown.stop="handleResizePointerDown(bar, 'right', $event)"
        />
      </div>

      <template
        v-for="bar in shellLayout.bars.filter((candidate) => candidate.kind === 'summary' && (candidate.overflowRangeSegments?.length ?? 0) > 0)"
        :key="`summary-overflow-${bar.id}`"
      >
        <div
          v-for="(segment, index) in bar.overflowRangeSegments"
          :key="`${bar.id}-overflow-${index}`"
          class="pointer-events-none absolute"
          style="background-image: repeating-linear-gradient(-60deg, rgba(15, 23, 42, 0.42) 0, rgba(15, 23, 42, 0.42) 1px, transparent 1px, transparent 6px);"
          :style="{
            left: `${segment.left}px`,
            top: `${bar.top}px`,
            width: `${segment.width}px`,
            height: `${bar.height}px`,
            backgroundColor: 'transparent',
          }"
        />
      </template>

      <div
        v-if="marqueeRectStyle"
        class="pointer-events-none absolute z-20 border border-sky-500 bg-sky-400/15"
        :style="marqueeRectStyle"
      />
    </div>
  </div>
</template>
