import { computed, ref } from 'vue'
import { schedule2dRebuildRepository } from '@/features/schedule/schedule-2d-rebuild/infra/schedule-rebuild-repository'
import type { ScheduleItem, ScheduleRow, ScheduleSnapshot } from '@/features/schedule/schedule-2d-rebuild/model/schedule-rebuild-types'
import {
  SCHEDULE_SHELL_DEFAULTS,
  SCHEDULE_TIMELINE_DEFAULTS,
  scheduleService,
} from '@/features/schedule/schedule-2d-rebuild/use-cases/schedule-service'
import {
  createClosedScheduleContextMenuState,
  createEmptyScheduleSelectionState,
} from '@/features/schedule/schedule-2d-rebuild/view-model/schedule-interaction-state'

type MoveSession = {
  type: 'move'
  itemIds: string[]
  baseItems: ScheduleItem[]
  baseLaneByItemId: Record<string, number>
  maxLaneIndexByRowId: Record<string, number>
  pinnedLaneByItemId: Record<string, number>
}

type ResizeSession = {
  type: 'resize'
  itemId: string
  edge: 'left' | 'right'
  baseItems: ScheduleItem[]
}

export function useSchedule2dRebuildPage() {
  const snapshot = ref<ScheduleSnapshot | null>(null)
  const workingRows = ref<ScheduleRow[]>([])
  const workingItems = ref<ScheduleItem[]>([])
  const isLoading = ref(false)
  const errorMessage = ref('')
  const chartScrollTop = ref(0)
  const chartScrollLeft = ref(0)
  const selectionState = ref(createEmptyScheduleSelectionState())
  const contextMenuState = ref(createClosedScheduleContextMenuState())
  const dayWidth = ref(SCHEDULE_TIMELINE_DEFAULTS.dayWidth)
  const rowHeight = ref(SCHEDULE_SHELL_DEFAULTS.rowHeight)
  const interactionSession = ref<MoveSession | ResizeSession | null>(null)
  const lanePreferenceByItemId = ref<Record<string, number>>({})

  const summary = computed(() => {
    if (!snapshot.value) {
      return {
        rows: 0,
        items: 0,
        dependencies: 0,
        groups: 0,
        milestones: 0,
        pendingContracts: 0,
      }
    }

    return {
      rows: workingRows.value.length,
      items: workingItems.value.length,
      dependencies: snapshot.value.dependencies.length,
      groups: snapshot.value.groups.length,
      milestones: snapshot.value.milestones.length,
      pendingContracts: snapshot.value.pendingContracts.length,
    }
  })

  const timeline = computed(() => (
    workingItems.value.length > 0
      ? scheduleService.buildTimeline(workingItems.value, { dayWidth: dayWidth.value })
      : null
  ))
  const shellLayout = computed(() => (
    snapshot.value && timeline.value
      ? scheduleService.buildShellLayout(workingRows.value, workingItems.value, timeline.value, {
          rowHeight: rowHeight.value,
          preferredLaneByItemId: lanePreferenceByItemId.value,
          pinnedLaneByItemId: interactionSession.value?.type === 'move'
            ? interactionSession.value.pinnedLaneByItemId
            : undefined,
        })
      : null
  ))

  async function loadSnapshot() {
    isLoading.value = true
    errorMessage.value = ''

    try {
      snapshot.value = await scheduleService.loadSnapshot(schedule2dRebuildRepository)
      workingRows.value = snapshot.value.rows.map((row) => ({ ...row }))
      workingItems.value = snapshot.value.items.map((item) => ({ ...item }))
      lanePreferenceByItemId.value = {}
      selectionState.value = createEmptyScheduleSelectionState()
      interactionSession.value = null
    } catch (error: unknown) {
      console.error('2D 공정표 리빌드 snapshot 로드 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      errorMessage.value = err.response?.data?.message || err.message || 'Snapshot 로드 실패'
    } finally {
      isLoading.value = false
    }
  }

  function syncChartScroll(position: { left: number; top: number }) {
    chartScrollLeft.value = position.left
    chartScrollTop.value = position.top
  }

  function syncRowPanelScroll(top: number) {
    chartScrollTop.value = top
  }

  function clearSelection() {
    selectionState.value = createEmptyScheduleSelectionState()
  }

  function addParentRow() {
    workingRows.value = scheduleService.addParentRow(workingRows.value)
  }

  function addChildRow(parentRowId: string) {
    workingRows.value = scheduleService.addChildRow(workingRows.value, parentRowId)
  }

  function toggleRowCollapse(rowId: string) {
    workingRows.value = scheduleService.toggleRowCollapse(workingRows.value, rowId)
  }

  function selectItems(itemIds: string[]) {
    selectionState.value = {
      ...selectionState.value,
      rowIds: [],
      itemIds,
      dependencyIds: [],
      groupIds: [],
      milestoneIds: [],
    }
  }

  function startMoveSession(itemId: string) {
    const selectedIds = selectionState.value.itemIds.includes(itemId)
      ? selectionState.value.itemIds
      : [itemId]
    const baseLaneByItemId = Object.fromEntries(
      (shellLayout.value?.bars ?? [])
        .filter((bar) => selectedIds.includes(bar.itemId))
        .map((bar) => [bar.itemId, bar.laneIndex]),
    )
    const maxLaneIndexByRowId = Object.fromEntries(
      Object.entries(
        (shellLayout.value?.bars ?? []).reduce<Record<string, number>>((acc, bar) => {
          acc[bar.rowId] = Math.max(acc[bar.rowId] ?? 0, bar.laneIndex)
          return acc
        }, {}),
      ),
    )

    selectItems(selectedIds)
    interactionSession.value = {
      type: 'move',
      itemIds: selectedIds,
      baseItems: workingItems.value.map((item) => ({ ...item })),
      baseLaneByItemId,
      maxLaneIndexByRowId,
      pinnedLaneByItemId: baseLaneByItemId,
    }
  }

  function previewMoveSession(payload: { deltaDays: number; deltaLanes: number }) {
    const session = interactionSession.value
    if (!session || session.type !== 'move') return

    const rowIdByItemId = new Map(
      session.baseItems
        .filter((item) => session.itemIds.includes(item.id))
        .map((item) => [item.id, item.rowId] as const),
    )
    const laneBoundsByRowId = Object.entries(session.baseLaneByItemId).reduce<
      Record<string, { minLane: number; maxLane: number }>
    >((acc, [itemId, laneIndex]) => {
      const rowId = rowIdByItemId.get(itemId)
      if (!rowId) return acc

      const existing = acc[rowId]
      if (!existing) {
        acc[rowId] = { minLane: laneIndex, maxLane: laneIndex }
        return acc
      }

      existing.minLane = Math.min(existing.minLane, laneIndex)
      existing.maxLane = Math.max(existing.maxLane, laneIndex)
      return acc
    }, {})

    interactionSession.value = {
      ...session,
      pinnedLaneByItemId: Object.fromEntries(
        Object.entries(session.baseLaneByItemId).map(([itemId, laneIndex]) => {
          const rowId = rowIdByItemId.get(itemId)
          if (!rowId) return [itemId, laneIndex] as const

          const rowBounds = laneBoundsByRowId[rowId]
          const maxLaneIndex = session.maxLaneIndexByRowId[rowId] ?? rowBounds?.maxLane ?? laneIndex
          const clampedDeltaLanes = Math.min(
            Math.max(payload.deltaLanes, -(rowBounds?.minLane ?? laneIndex)),
            maxLaneIndex - (rowBounds?.maxLane ?? laneIndex),
          )

          return [itemId, laneIndex + clampedDeltaLanes] as const
        }),
      ),
    }

    workingItems.value = scheduleService.moveItems(
      session.baseItems,
      session.itemIds,
      payload.deltaDays,
    )
  }

  function endMoveSession() {
    const session = interactionSession.value
    if (!session || session.type !== 'move') return

    const affectedRowIds = new Set(
      workingItems.value
        .filter((item) => session.itemIds.includes(item.id))
        .map((item) => item.rowId),
    )

    lanePreferenceByItemId.value = {
      ...lanePreferenceByItemId.value,
      ...Object.fromEntries(
        (shellLayout.value?.bars ?? [])
          .filter((bar) => affectedRowIds.has(bar.rowId))
          .map((bar) => [bar.itemId, bar.laneIndex]),
      ),
    }

    interactionSession.value = null
  }

  function startResizeSession(payload: { itemId: string; edge: 'left' | 'right' }) {
    selectItems([payload.itemId])
    interactionSession.value = {
      type: 'resize',
      itemId: payload.itemId,
      edge: payload.edge,
      baseItems: workingItems.value.map((item) => ({ ...item })),
    }
  }

  function previewResizeSession(payload: { deltaDays: number }) {
    const session = interactionSession.value
    if (!session || session.type !== 'resize') return

    workingItems.value = scheduleService.resizeItem(
      session.baseItems,
      session.itemId,
      session.edge,
      payload.deltaDays,
    )
  }

  function endResizeSession() {
    if (interactionSession.value?.type === 'resize') {
      interactionSession.value = null
    }
  }

  return {
    snapshot,
    workingItems,
    isLoading,
    errorMessage,
    summary,
    selectionState,
    contextMenuState,
    dayWidth,
    rowHeight,
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
    syncRowPanelScroll,
  }
}
