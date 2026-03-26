<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type {
  ScheduleBarLayout,
  ScheduleConnectionLayout,
  ScheduleConnectionKind,
  ScheduleShellLayout,
  ScheduleTimelineLayout,
} from '@/features/schedule/schedule-2d-rebuild/model/schedule-rebuild-types'

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

type PreviewDependencyPoint = {
  x: number
  y: number
}

type HoveredCellState = {
  rowId: string | null
  date: string | null
}

type ConnectionCreationState = {
  kind: 'dependency' | 'link' | 'critical-path'
  sourceItemId: string
  pathId?: number
  colorHex?: string
}

const props = defineProps<{
  timeline: ScheduleTimelineLayout
  shellLayout: ScheduleShellLayout
  viewportHeight: number
  scrollTop: number
  scrollLeft: number
  selectedRowIds: string[]
  selectedItemIds: string[]
  selectedDependencyIds: string[]
  selectedLinkIds: string[]
  selectedCriticalPathIds: string[]
  connectionCreationState: ConnectionCreationState | null
}>()

const emit = defineEmits<{
  'scroll-change': [position: { top: number; left: number }]
  'clear-selection': []
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
  'hover-cell': [payload: HoveredCellState]
}>()

const containerRef = ref<HTMLElement | null>(null)
const marqueeState = ref<MarqueeState | null>(null)
const panState = ref<PanState | null>(null)
const moveState = ref<MoveState | null>(null)
const resizeState = ref<ResizeState | null>(null)
const isSpacePressed = ref(false)
const hoveredDependencyId = ref<string | null>(null)
const hoveredLinkId = ref<string | null>(null)
const hoveredConnectionTargetItemId = ref<string | null>(null)
const previewConnectionPoint = ref<PreviewDependencyPoint | null>(null)
const hoveredCell = ref<HoveredCellState>({
  rowId: null,
  date: null,
})
let syncingFromProp = false
const LANE_GAP = 6
const DRAG_ACTIVATION_THRESHOLD = 4

const selectedItemIdSet = computed(() => new Set(props.selectedItemIds))
const selectedRowIdSet = computed(() => new Set(props.selectedRowIds))
const selectedDependencyIdSet = computed(() => new Set(props.selectedDependencyIds))
const selectedLinkIdSet = computed(() => new Set(props.selectedLinkIds))
const selectedCriticalPathIdSet = computed(() => new Set(props.selectedCriticalPathIds))
const milestoneDateSet = computed(() => new Set(props.shellLayout.milestones.map((milestone) => milestone.date)))
const criticalPathColorsByItemId = computed(() => {
  const colorsByItemId = new Map<string, string[]>()

  props.shellLayout.connections.forEach((connection) => {
    if (connection.kind !== 'critical-path' || !connection.colorHex) return

    ;[connection.sourceItemId, connection.targetItemId].forEach((itemId) => {
      const colors = colorsByItemId.get(itemId) ?? []
      if (!colors.includes(connection.colorHex!)) {
        colors.push(connection.colorHex!)
      }
      colorsByItemId.set(itemId, colors)
    })
  })

  return colorsByItemId
})
const connectionSourceBar = computed(() => (
  props.connectionCreationState?.sourceItemId
    ? props.shellLayout.bars.find((bar) => bar.kind === 'item' && bar.itemId === props.connectionCreationState?.sourceItemId) ?? null
    : null
))
const hoveredTimelineDay = computed(() => (
  hoveredCell.value.date
    ? props.timeline.days.find((day) => day.date === hoveredCell.value.date) ?? null
    : null
))
const hoveredShellRow = computed(() => (
  hoveredCell.value.rowId
    ? props.shellLayout.rows.find((row) => row.id === hoveredCell.value.rowId) ?? null
    : null
))

const previewConnectionPath = computed(() => {
  if (!connectionSourceBar.value || !previewConnectionPoint.value) return null

  const sourceX = connectionSourceBar.value.left + connectionSourceBar.value.width
  const sourceY = connectionSourceBar.value.top + connectionSourceBar.value.height / 2
  const targetX = previewConnectionPoint.value.x
  const targetY = previewConnectionPoint.value.y

  if (targetX >= sourceX + 24) {
    const controlOffset = Math.max((targetX - sourceX) / 2, 28)
    return `M ${sourceX} ${sourceY} C ${sourceX + controlOffset} ${sourceY}, ${targetX - controlOffset} ${targetY}, ${targetX} ${targetY}`
  }

  const bendX = Math.max(sourceX, targetX) + 36
  return `M ${sourceX} ${sourceY} L ${bendX} ${sourceY} L ${bendX} ${targetY} L ${targetX} ${targetY}`
})

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

const hoveredDayOverlayStyle = computed(() => {
  if (!hoveredTimelineDay.value) return null

  return {
    left: `${hoveredTimelineDay.value.left}px`,
    width: `${hoveredTimelineDay.value.width}px`,
    height: `${props.shellLayout.chartHeight}px`,
  }
})

const hoveredRowOverlayStyle = computed(() => {
  if (!hoveredShellRow.value) return null

  return {
    top: `${hoveredShellRow.value.top}px`,
    height: `${hoveredShellRow.value.height}px`,
    width: `${props.timeline.chartWidth}px`,
  }
})

const hoveredIntersectionStyle = computed(() => {
  if (!hoveredTimelineDay.value || !hoveredShellRow.value) return null

  return {
    left: `${hoveredTimelineDay.value.left}px`,
    top: `${hoveredShellRow.value.top}px`,
    width: `${hoveredTimelineDay.value.width}px`,
    height: `${hoveredShellRow.value.height}px`,
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

watch(
  () => props.connectionCreationState,
  (nextConnectionCreationState) => {
    if (!nextConnectionCreationState || !connectionSourceBar.value) {
      previewConnectionPoint.value = null
      hoveredConnectionTargetItemId.value = null
      return
    }

    previewConnectionPoint.value = {
      x: connectionSourceBar.value.left + connectionSourceBar.value.width,
      y: connectionSourceBar.value.top + connectionSourceBar.value.height / 2,
    }
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

  const selectedBars = props.shellLayout.bars
    .filter((bar) => {
      const barRight = bar.left + bar.width
      const barBottom = bar.top + bar.height
      return bar.left < right && barRight > left && bar.top < bottom && barBottom > top
    })
  const selectedItemIds = selectedBars
    .filter((bar) => bar.kind === 'item')
    .map((bar) => bar.itemId)
  const selectedRowIds = selectedBars
    .filter((bar) => bar.kind === 'summary')
    .map((bar) => bar.rowId)

  emit('select-bars', {
    itemIds: selectedItemIds,
    rowIds: selectedRowIds,
  })
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

function updateHoveredCell(nextHoveredCell: HoveredCellState) {
  if (
    hoveredCell.value.rowId === nextHoveredCell.rowId &&
    hoveredCell.value.date === nextHoveredCell.date
  ) {
    return
  }

  hoveredCell.value = nextHoveredCell
  emit('hover-cell', nextHoveredCell)
}

function clearHoveredCell() {
  updateHoveredCell({
    rowId: null,
    date: null,
  })
}

function handlePanePointerMove(event: PointerEvent) {
  const point = getContentPoint(event)
  if (!point) {
    clearHoveredCell()
    return
  }

  updateHoveredCell({
    rowId: getRowIdAtContentY(point.y),
    date: getDateAtContentX(point.x),
  })
}

function handlePanePointerDown(event: PointerEvent) {
  if (event.button !== 0) return

  if (props.connectionCreationState) {
    emit('cancel-connection-create')
    return
  }

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

  if (props.connectionCreationState) {
    if (bar.kind !== 'item') {
      emit('cancel-connection-create')
      return
    }

    if (
      props.connectionCreationState.kind === 'critical-path' &&
      connectionSourceBar.value &&
      bar.left <= connectionSourceBar.value.left
    ) {
      emit('cancel-connection-create')
      return
    }

    if (bar.itemId === props.connectionCreationState.sourceItemId) {
      emit('cancel-connection-create')
    } else {
      emit('complete-connection-create', bar.itemId)
    }
    return
  }

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

function handleBarPointerEnter(bar: ScheduleBarLayout) {
  if (
    !props.connectionCreationState ||
    bar.kind !== 'item' ||
    bar.itemId === props.connectionCreationState.sourceItemId ||
    (
      props.connectionCreationState.kind === 'critical-path' &&
      connectionSourceBar.value !== null &&
      bar.left <= connectionSourceBar.value.left
    )
  ) {
    hoveredConnectionTargetItemId.value = null
    return
  }

  hoveredConnectionTargetItemId.value = bar.itemId
}

function handleBarPointerLeave(bar: ScheduleBarLayout) {
  if (hoveredConnectionTargetItemId.value === bar.itemId) {
    hoveredConnectionTargetItemId.value = null
  }
}

function handleResizePointerDown(bar: ScheduleBarLayout, edge: 'left' | 'right', event: PointerEvent) {
  if (props.connectionCreationState) return
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
  if (row.kind === 'milestone') {
    const point = getContentPoint(event)
    emit('canvas-context-menu', {
      x: event.clientX,
      y: event.clientY,
      rowId: row.id,
      date: point ? getDateAtContentX(point.x) : null,
    })
    return
  }

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

function handleRowPointerDown(row: ScheduleShellLayout['rows'][number], event: PointerEvent) {
  if (row.kind === 'milestone') {
    event.stopPropagation()
  }
}

function handleMilestonePointerDown(event: PointerEvent) {
  event.stopPropagation()
}

function handleMilestoneClick(milestoneId: string, date: string) {
  if (isSpacePressed.value) return

  if (props.connectionCreationState) {
    emit('cancel-connection-create')
    return
  }

  emit('milestone-activate', {
    milestoneId,
    date,
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

  if (bar.kind === 'item') {
    const criticalPathColors = criticalPathColorsByItemId.value.get(bar.itemId) ?? []
    if (criticalPathColors.length > 0) {
      const [primaryColor, secondaryColor] = criticalPathColors
      const nextShadowLayers = selectedItemIdSet.value.has(bar.itemId)
        ? [
            '0 0 0 1px rgba(15,23,42,0.18)',
            `0 0 0 4px ${toAlphaColor(primaryColor!, 0.52)}`,
            `0 0 18px ${toAlphaColor(primaryColor!, 0.3)}`,
            `0 12px 24px ${toAlphaColor(primaryColor!, 0.24)}`,
          ]
        : [
            `0 0 0 2px ${toAlphaColor(primaryColor!, 0.72)}`,
            `0 0 16px ${toAlphaColor(primaryColor!, 0.28)}`,
            `0 12px 22px ${toAlphaColor(primaryColor!, 0.22)}`,
          ]

      if (secondaryColor) {
        nextShadowLayers.push(
          `0 0 0 ${selectedItemIdSet.value.has(bar.itemId) ? 7 : 5}px ${toAlphaColor(secondaryColor, 0.28)}`,
          `0 0 22px ${toAlphaColor(secondaryColor, 0.18)}`,
        )
      }

      style.boxShadow = nextShadowLayers.join(', ')
    }
  }

  return style
}

function getDayColumnClass(day: ScheduleTimelineLayout['days'][number]) {
  if (milestoneDateSet.value.has(day.date)) {
    return 'bg-amber-50/65'
  }

  if (day.isWeekend) {
    return 'bg-rose-50/35'
  }

  if (day.isToday) {
    return 'bg-blue-50/70'
  }

  return ''
}

function normalizeHexColor(colorHex: string) {
  const sanitized = colorHex.trim().replace('#', '')
  if (/^[0-9a-fA-F]{3}$/.test(sanitized)) {
    return sanitized.split('').map((character) => `${character}${character}`).join('')
  }

  return /^[0-9a-fA-F]{6}$/.test(sanitized) ? sanitized : null
}

function toAlphaColor(colorHex: string, alpha: number) {
  const normalizedHex = normalizeHexColor(colorHex)
  if (!normalizedHex) return colorHex

  const red = Number.parseInt(normalizedHex.slice(0, 2), 16)
  const green = Number.parseInt(normalizedHex.slice(2, 4), 16)
  const blue = Number.parseInt(normalizedHex.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function getConnectionStroke(connection: ScheduleConnectionLayout) {
  if (connection.colorHex) return connection.colorHex
  return '#64748b'
}

function getConnectionStrokeWidth(kind: ScheduleConnectionKind) {
  if (kind === 'dependency') return 1.25
  if (kind === 'link') return 2
  if (kind === 'critical-path') return 2.25
  return 1.25
}

function getConnectionDashArray(kind: ScheduleConnectionKind) {
  if (kind === 'dependency') return '3 3'
  return undefined
}

function getConnectionLabelColor(connection: ScheduleConnectionLayout) {
  return connection.colorHex ?? '#64748b'
}

function isDependencyHighlighted(connectionId: string) {
  return hoveredDependencyId.value === connectionId || selectedDependencyIdSet.value.has(connectionId)
}

function isLinkHighlighted(connectionId: string) {
  return hoveredLinkId.value === connectionId || selectedLinkIdSet.value.has(connectionId)
}

function isCriticalPathHighlighted(connectionId: string) {
  return selectedCriticalPathIdSet.value.has(connectionId)
}

function getRenderedConnectionStrokeWidth(connectionId: string, kind: ScheduleConnectionKind) {
  if (kind === 'dependency' && isDependencyHighlighted(connectionId)) {
    return 2.75
  }

  if (kind === 'link' && isLinkHighlighted(connectionId)) {
    return 3
  }

  if (kind === 'critical-path' && isCriticalPathHighlighted(connectionId)) {
    return 3.25
  }

  return getConnectionStrokeWidth(kind)
}

function handleDependencyPointerEnter(dependencyId: string) {
  hoveredDependencyId.value = dependencyId
}

function handleDependencyPointerLeave(dependencyId: string) {
  if (hoveredDependencyId.value === dependencyId) {
    hoveredDependencyId.value = null
  }
}

function handleDependencyContextMenu(dependencyId: string, event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  hoveredDependencyId.value = dependencyId
  emit('dependency-context-menu', {
    dependencyId,
    x: event.clientX,
    y: event.clientY,
  })
}

function handleLinkPointerEnter(linkId: string) {
  hoveredLinkId.value = linkId
}

function handleLinkPointerLeave(linkId: string) {
  if (hoveredLinkId.value === linkId) {
    hoveredLinkId.value = null
  }
}

function handleLinkContextMenu(linkId: string, event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  hoveredLinkId.value = linkId
  emit('link-context-menu', {
    linkId,
    x: event.clientX,
    y: event.clientY,
  })
}

function handleCriticalPathContextMenu(criticalPathId: string, event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  emit('critical-path-context-menu', {
    criticalPathId,
    x: event.clientX,
    y: event.clientY,
  })
}

function handlePointerMove(event: PointerEvent) {
  if (props.connectionCreationState) {
    const point = getContentPoint(event)
    if (point) {
      previewConnectionPoint.value = point
    }
  }

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

  if (event.key === 'Escape' && props.connectionCreationState) {
    emit('cancel-connection-create')
    return
  }

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
      'cursor-crosshair': !!connectionCreationState,
      'select-none': marqueeState || moveState || resizeState || panState,
    }"
    :style="{ height: `${viewportHeight}px` }"
    @scroll="handleScroll"
    @pointermove="handlePanePointerMove"
    @pointerleave="clearHoveredCell"
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
        :class="getDayColumnClass(day)"
        :style="{ left: `${day.left}px`, width: `${day.width}px`, height: `${shellLayout.chartHeight}px` }"
      />

      <div
        v-for="row in shellLayout.rows"
        :key="`row-${row.id}`"
        class="absolute left-0 right-0 border-b border-border/70"
        :class="row.kind === 'milestone'
          ? 'bg-amber-50/70'
          : row.kind === 'parent-process'
            ? 'bg-slate-50/80'
            : 'bg-transparent'"
        :style="{ top: `${row.top}px`, height: `${row.height}px` }"
        @pointerdown="handleRowPointerDown(row, $event)"
        @contextmenu.prevent.stop="handleRowContextMenu(row, $event)"
      />

      <div
        v-if="hoveredDayOverlayStyle"
        class="pointer-events-none absolute top-0 z-[1] bg-sky-100/45"
        :style="hoveredDayOverlayStyle"
      />

      <div
        v-if="hoveredRowOverlayStyle"
        class="pointer-events-none absolute left-0 z-[1] bg-slate-200/35"
        :style="hoveredRowOverlayStyle"
      />

      <div
        v-if="hoveredIntersectionStyle"
        class="pointer-events-none absolute z-[1] bg-sky-200/45 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.8)]"
        :style="hoveredIntersectionStyle"
      />

      <svg
        class="absolute inset-0 z-[1]"
        :width="timeline.chartWidth"
        :height="shellLayout.chartHeight"
        :viewBox="`0 0 ${timeline.chartWidth} ${shellLayout.chartHeight}`"
      >
        <path
          v-if="previewConnectionPath"
          :d="previewConnectionPath"
          fill="none"
          :stroke="connectionCreationState?.kind === 'critical-path' ? connectionCreationState.colorHex ?? '#dc2626' : '#64748b'"
          :stroke-width="connectionCreationState?.kind === 'critical-path'
            ? 2.25
            : connectionCreationState?.kind === 'link'
              ? 2
              : 1.5"
          :stroke-dasharray="connectionCreationState?.kind === 'dependency' ? '4 4' : undefined"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity="0.9"
          style="pointer-events: none;"
        />

        <g v-for="connection in shellLayout.connections" :key="connection.id">
          <path
            v-if="connection.kind === 'dependency' || connection.kind === 'link' || connection.kind === 'critical-path'"
            :d="connection.path"
            fill="none"
            stroke="transparent"
            stroke-width="12"
            style="pointer-events: stroke;"
            class="cursor-pointer"
            @pointerdown.stop
            @mouseenter="connection.kind === 'dependency'
              ? handleDependencyPointerEnter(connection.id)
              : connection.kind === 'link'
                ? handleLinkPointerEnter(connection.id)
                : undefined"
            @mouseleave="connection.kind === 'dependency'
              ? handleDependencyPointerLeave(connection.id)
              : connection.kind === 'link'
                ? handleLinkPointerLeave(connection.id)
                : undefined"
            @contextmenu="connection.kind === 'dependency'
              ? handleDependencyContextMenu(connection.id, $event)
              : connection.kind === 'link'
                ? handleLinkContextMenu(connection.id, $event)
                : handleCriticalPathContextMenu(connection.id, $event)"
          />
          <path
            :d="connection.path"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
            :stroke="getConnectionStroke(connection)"
            :stroke-width="getRenderedConnectionStrokeWidth(connection.id, connection.kind)"
            :stroke-dasharray="getConnectionDashArray(connection.kind)"
            :opacity="connection.kind === 'critical-path'
              ? isCriticalPathHighlighted(connection.id) ? 1 : 0.95
              : connection.kind === 'dependency' && isDependencyHighlighted(connection.id)
                ? 1
                : 0.9"
            style="pointer-events: none;"
          />

          <text
            v-if="connection.label && connection.kind === 'link'"
            :x="connection.labelX"
            :y="connection.labelY"
            text-anchor="middle"
            dominant-baseline="central"
            font-size="10"
            font-weight="700"
            stroke="rgba(255,255,255,0.96)"
            stroke-width="3"
            paint-order="stroke"
            :fill="getConnectionLabelColor(connection)"
            style="pointer-events: none;"
          >
            {{ connection.label }}
          </text>
        </g>
      </svg>

      <button
        v-for="milestone in shellLayout.milestones"
        :key="milestone.id"
        type="button"
        class="absolute z-[3] flex items-center gap-2 rounded-full border border-amber-300 bg-white/95 px-2 py-1 text-left text-xs font-medium text-amber-900 shadow-sm transition-colors hover:bg-amber-50"
        :style="{
          left: `${milestone.left}px`,
          top: `${milestone.top}px`,
          width: `${milestone.width}px`,
          height: `${milestone.height}px`,
        }"
        @pointerdown="handleMilestonePointerDown"
        @click.stop="handleMilestoneClick(milestone.id, milestone.date)"
      >
        <span class="h-3 w-3 shrink-0 rotate-45 rounded-[2px] bg-amber-500 shadow-[0_0_0_1px_rgba(146,64,14,0.18)]" />
        <span class="truncate">{{ milestone.label }}</span>
      </button>

      <div
        v-for="bar in shellLayout.bars"
        :key="bar.id"
        class="group absolute z-[2] box-border flex items-center overflow-hidden rounded-md border px-2.5 shadow-sm transition-[box-shadow,border-color,border-width]"
        :class="bar.kind === 'summary'
          ? selectedRowIdSet.has(bar.rowId)
            ? 'z-10 cursor-pointer border-2 border-slate-950 bg-slate-100 text-slate-700 shadow-[0_0_0_1px_rgba(15,23,42,0.18)]'
            : 'cursor-pointer border-slate-400 bg-slate-100 text-slate-700'
          : connectionCreationState
            ? [
                bar.itemId === connectionCreationState.sourceItemId
                  ? 'z-10 cursor-crosshair border-2 border-slate-950 shadow-[0_0_0_1px_rgba(15,23,42,0.18)]'
                  : hoveredConnectionTargetItemId === bar.itemId
                    ? 'z-10 cursor-pointer border-2 border-slate-950 shadow-[0_0_0_2px_rgba(15,23,42,0.12)]'
                    : 'cursor-crosshair',
                bar.appearance === 'holiday-off'
                  ? 'border-slate-300 bg-slate-200 text-slate-700'
                  : 'border-sky-300 bg-sky-500 text-white',
              ]
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
        @pointerenter="handleBarPointerEnter(bar)"
        @pointerleave="handleBarPointerLeave(bar)"
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
          <div class="pointer-events-none absolute inset-0 flex items-center justify-center px-2.5 text-center">
            <span class="truncate text-sm font-extrabold leading-none">{{ bar.name }}</span>
          </div>
        </template>
        <span v-else class="block w-full truncate text-center text-sm font-semibold leading-none">{{ bar.name }}</span>

        <button
          v-if="!connectionCreationState && (bar.kind === 'item' || bar.kind === 'summary')"
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
          v-if="!connectionCreationState && (bar.kind === 'item' || bar.kind === 'summary')"
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
