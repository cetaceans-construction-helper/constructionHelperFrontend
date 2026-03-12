import { computed, ref } from 'vue'
import { schedule2dRebuildRepository } from '@/features/schedule/schedule-2d-rebuild/infra/schedule-rebuild-repository'
import type {
  ScheduleDependency,
  ScheduleGroup,
  ScheduleItem,
  ScheduleMilestone,
  ScheduleRow,
  ScheduleSnapshot,
} from '@/features/schedule/schedule-2d-rebuild/model/schedule-rebuild-types'
import {
  SCHEDULE_SHELL_DEFAULTS,
  SCHEDULE_TIMELINE_DEFAULTS,
  scheduleService,
} from '@/features/schedule/schedule-2d-rebuild/use-cases/schedule-service'
import {
  createClosedScheduleContextMenuState,
  createEmptyScheduleSelectionState,
  type ScheduleContextMenuCommand,
  type ScheduleContextMenuItem,
  type ScheduleContextMenuTarget,
} from '@/features/schedule/schedule-2d-rebuild/view-model/schedule-interaction-state'

type MoveSession = {
  type: 'move'
  target: 'item'
  itemIds: string[]
  baseItems: ScheduleItem[]
  baseLaneByItemId: Record<string, number>
  maxLaneIndexByRowId: Record<string, number>
  pinnedLaneByItemId: Record<string, number>
}

type SummaryMoveSession = {
  type: 'move'
  target: 'summary'
  rowIds: string[]
  baseRows: ScheduleRow[]
}

type ResizeSession = {
  type: 'resize'
  target: 'item'
  itemId: string
  edge: 'left' | 'right'
  baseItems: ScheduleItem[]
}

type SummaryResizeSession = {
  type: 'resize'
  target: 'summary'
  rowId: string
  edge: 'left' | 'right'
  baseRows: ScheduleRow[]
}

export function useSchedule2dRebuildPage() {
  const snapshot = ref<ScheduleSnapshot | null>(null)
  const workingRows = ref<ScheduleRow[]>([])
  const workingItems = ref<ScheduleItem[]>([])
  const workingDependencies = ref<ScheduleDependency[]>([])
  const workingLinks = ref<ScheduleDependency[]>([])
  const workingGroups = ref<ScheduleGroup[]>([])
  const workingMilestones = ref<ScheduleMilestone[]>([])
  const isLoading = ref(false)
  const errorMessage = ref('')
  const chartScrollTop = ref(0)
  const chartScrollLeft = ref(0)
  const selectionState = ref(createEmptyScheduleSelectionState())
  const contextMenuState = ref(createClosedScheduleContextMenuState())
  const dayWidth = ref(SCHEDULE_TIMELINE_DEFAULTS.dayWidth)
  const rowHeight = ref(SCHEDULE_SHELL_DEFAULTS.rowHeight)
  const interactionSession = ref<MoveSession | SummaryMoveSession | ResizeSession | SummaryResizeSession | null>(null)
  const lanePreferenceByItemId = ref<Record<string, number>>({})

  const rowById = computed(() => new Map(workingRows.value.map((row) => [row.id, row])))

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
      dependencies: workingDependencies.value.length,
      groups: workingGroups.value.length,
      milestones: workingMilestones.value.length,
      pendingContracts: snapshot.value.pendingContracts.length,
    }
  })

  const timeline = computed(() => (
    snapshot.value
      ? scheduleService.buildTimeline(workingItems.value, { dayWidth: dayWidth.value })
      : null
  ))
  const shellLayout = computed(() => (
    snapshot.value && timeline.value
      ? scheduleService.buildShellLayout(workingRows.value, workingItems.value, timeline.value, {
          rowHeight: rowHeight.value,
          preferredLaneByItemId: lanePreferenceByItemId.value,
          pinnedLaneByItemId: interactionSession.value?.type === 'move' && interactionSession.value.target === 'item'
            ? interactionSession.value.pinnedLaneByItemId
            : undefined,
        })
      : null
  ))

  function closeContextMenu() {
    contextMenuState.value = createClosedScheduleContextMenuState()
  }

  async function loadSnapshot() {
    isLoading.value = true
    errorMessage.value = ''

    try {
      snapshot.value = await scheduleService.loadSnapshot(schedule2dRebuildRepository)
      workingRows.value = snapshot.value.rows.map((row) => ({ ...row }))
      workingItems.value = snapshot.value.items.map((item) => ({ ...item }))
      workingDependencies.value = []
      workingLinks.value = []
      workingGroups.value = snapshot.value.groups.map((group) => ({ ...group, itemIds: [...group.itemIds] }))
      workingMilestones.value = snapshot.value.milestones.map((milestone) => ({ ...milestone }))
      lanePreferenceByItemId.value = {}
      selectionState.value = createEmptyScheduleSelectionState()
      closeContextMenu()
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
    closeContextMenu()
  }

  function syncRowPanelScroll(top: number) {
    chartScrollTop.value = top
    closeContextMenu()
  }

  function clearSelection() {
    selectionState.value = createEmptyScheduleSelectionState()
    closeContextMenu()
  }

  function addParentRow() {
    workingRows.value = scheduleService.addParentRow(workingRows.value)
    closeContextMenu()
  }

  function addChildRow(parentRowId: string) {
    workingRows.value = scheduleService.addChildRow(workingRows.value, parentRowId)
    closeContextMenu()
  }

  function toggleRowCollapse(rowId: string) {
    workingRows.value = scheduleService.toggleRowCollapse(workingRows.value, rowId)
    closeContextMenu()
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
    closeContextMenu()
  }

  function getContextItemIds(target: ScheduleContextMenuTarget | null): string[] {
    if (!target || target.kind !== 'item') return []

    return selectionState.value.itemIds.includes(target.itemId)
      ? selectionState.value.itemIds
      : [target.itemId]
  }

  function hasRelationForItems(relations: ScheduleDependency[], itemIds: string[]): boolean {
    if (itemIds.length === 0) return false

    const itemIdSet = new Set(itemIds)
    return relations.some((relation) => (
      itemIds.length > 1
        ? itemIdSet.has(relation.sourceItemId) && itemIdSet.has(relation.targetItemId)
        : itemIdSet.has(relation.sourceItemId) || itemIdSet.has(relation.targetItemId)
    ))
  }

  function removeRelationsForItems(relations: ScheduleDependency[], itemIds: string[]): ScheduleDependency[] {
    if (itemIds.length === 0) return relations

    if (itemIds.length === 1) {
      return scheduleService.removeDependenciesForItems(relations, itemIds)
    }

    const itemIdSet = new Set(itemIds)
    return relations.filter((relation) => (
      !(itemIdSet.has(relation.sourceItemId) && itemIdSet.has(relation.targetItemId))
    ))
  }

  function canCreateItemOnCanvasTarget(target: Extract<ScheduleContextMenuTarget, { kind: 'canvas' }>): boolean {
    if (!target.rowId || !target.date) return false

    return rowById.value.get(target.rowId)?.kind === 'child-process'
  }

  function promptForColor(currentColor: string | null | undefined): string | null {
    if (typeof window === 'undefined') return null

    const nextColor = window.prompt('색상 코드를 입력하세요. 예) #0ea5e9', currentColor ?? '#0ea5e9')
    if (nextColor === null) return null

    const trimmedColor = nextColor.trim()
    return trimmedColor.length > 0 ? trimmedColor : null
  }

  function promptForName(label: string, currentName: string): string | null {
    if (typeof window === 'undefined') return null

    const nextName = window.prompt(label, currentName)
    if (nextName === null) return null

    const trimmedName = nextName.trim()
    return trimmedName.length > 0 ? trimmedName : null
  }

  function openItemContextMenu(payload: { itemId: string; x: number; y: number }) {
    selectionState.value = {
      ...createEmptyScheduleSelectionState(),
      itemIds: [payload.itemId],
    }
    contextMenuState.value = {
      open: true,
      x: payload.x,
      y: payload.y,
      target: {
        kind: 'item',
        itemId: payload.itemId,
      },
    }
  }

  function openRowContextMenu(payload: { rowId: string; x: number; y: number }) {
    if (!rowById.value.has(payload.rowId)) return

    selectionState.value = {
      ...createEmptyScheduleSelectionState(),
      rowIds: [payload.rowId],
    }
    contextMenuState.value = {
      open: true,
      x: payload.x,
      y: payload.y,
      target: {
        kind: 'row',
        rowId: payload.rowId,
      },
    }
  }

  function openCanvasContextMenu(payload: { x: number; y: number; rowId: string | null; date: string | null }) {
    selectionState.value = createEmptyScheduleSelectionState()
    contextMenuState.value = {
      open: true,
      x: payload.x,
      y: payload.y,
      target: {
        kind: 'canvas',
        rowId: payload.rowId,
        date: payload.date,
      },
    }
  }

  const contextMenuItems = computed<ScheduleContextMenuItem[]>(() => {
    const target = contextMenuState.value.target
    if (!contextMenuState.value.open || !target) return []

    if (target.kind === 'item') {
      const activeItemIds = getContextItemIds(target)
      const hasDependency = hasRelationForItems(workingDependencies.value, activeItemIds)
      const hasLink = hasRelationForItems(workingLinks.value, activeItemIds)

      return [
        {
          id: 'toggle-dependency',
          label: hasDependency ? 'dependency 제거' : 'dependency 생성',
          command: 'toggle-dependency',
          icon: hasDependency ? 'unlink' : 'link',
          disabled: !hasDependency && activeItemIds.length < 2,
        },
        {
          id: 'toggle-link',
          label: hasLink ? 'link 제거' : 'link 생성',
          command: 'toggle-link',
          icon: hasLink ? 'unlink' : 'link',
          disabled: !hasLink && activeItemIds.length < 2,
        },
        {
          id: 'change-item-color',
          label: '색상 변경',
          command: 'change-color',
          icon: 'palette',
        },
        {
          id: 'change-item-properties',
          label: '속성 변경',
          command: 'change-properties',
          icon: 'pencil',
        },
      ]
    }

    if (target.kind === 'row') {
      const row = rowById.value.get(target.rowId)
      if (!row || row.kind !== 'parent-process') return []

      return [
        {
          id: 'change-parent-color',
          label: '색상 변경',
          command: 'change-color',
          icon: 'palette',
        },
        {
          id: 'change-parent-properties',
          label: '속성 변경',
          command: 'change-properties',
          icon: 'pencil',
        },
      ]
    }

    if (target.kind === 'canvas') {
      return [
        {
          id: 'create-item',
          label: '작업 생성',
          command: 'create-item',
          icon: 'plus',
          disabled: !canCreateItemOnCanvasTarget(target),
        },
      ]
    }

    return []
  })

  function executeContextMenuCommand(command: ScheduleContextMenuCommand) {
    const target = contextMenuState.value.target
    if (!target) return

    if (command === 'create-item' && target.kind === 'canvas' && canCreateItemOnCanvasTarget(target) && target.rowId && target.date) {
      workingItems.value = scheduleService.createItem(workingRows.value, workingItems.value, {
        rowId: target.rowId,
        startDate: target.date,
      })
      closeContextMenu()
      return
    }

    if (target.kind === 'row') {
      const targetRow = rowById.value.get(target.rowId)
      if (!targetRow || targetRow.kind !== 'parent-process') {
        closeContextMenu()
        return
      }

      if (command === 'change-color') {
        const nextColor = promptForColor(targetRow.colorHex)
        if (nextColor !== null) {
          workingRows.value = scheduleService.updateRowColor(workingRows.value, target.rowId, nextColor)
        }
        closeContextMenu()
        return
      }

      if (command === 'change-properties') {
        const nextName = promptForName('상위 공정명을 입력하세요.', targetRow.name)
        if (nextName) {
          workingRows.value = scheduleService.updateRowName(workingRows.value, target.rowId, nextName)
        }
        closeContextMenu()
        return
      }
    }

    if (target.kind === 'item') {
      const activeItemIds = getContextItemIds(target)

      if (command === 'toggle-dependency') {
        workingDependencies.value = hasRelationForItems(workingDependencies.value, activeItemIds)
          ? removeRelationsForItems(workingDependencies.value, activeItemIds)
          : scheduleService.createSequentialDependencies(workingDependencies.value, workingItems.value, activeItemIds)
        closeContextMenu()
        return
      }

      if (command === 'toggle-link') {
        workingLinks.value = hasRelationForItems(workingLinks.value, activeItemIds)
          ? removeRelationsForItems(workingLinks.value, activeItemIds)
          : scheduleService.createSequentialDependencies(workingLinks.value, workingItems.value, activeItemIds)
        closeContextMenu()
        return
      }

      if (command === 'change-color') {
        const targetItem = workingItems.value.find((item) => item.id === target.itemId)
        const nextColor = promptForColor(targetItem?.colorHex)
        if (nextColor !== null) {
          workingItems.value = scheduleService.updateItemColor(workingItems.value, [target.itemId], nextColor)
        }
        closeContextMenu()
        return
      }

      if (command === 'change-properties') {
        const targetItem = workingItems.value.find((item) => item.id === target.itemId)
        if (!targetItem) {
          closeContextMenu()
          return
        }

        const nextName = promptForName('작업명을 입력하세요.', targetItem.name)
        if (nextName) {
          workingItems.value = scheduleService.updateItemName(workingItems.value, target.itemId, nextName)
        }
        closeContextMenu()
      }
    }
  }

  function startMoveSession(payload: { kind: 'item'; itemId: string } | { kind: 'summary'; rowId: string }) {
    if (payload.kind === 'summary') {
      clearSelection()
      interactionSession.value = {
        type: 'move',
        target: 'summary',
        rowIds: [payload.rowId],
        baseRows: workingRows.value.map((row) => ({ ...row })),
      }
      return
    }

    const selectedIds = selectionState.value.itemIds.includes(payload.itemId)
      ? selectionState.value.itemIds
      : [payload.itemId]
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
      target: 'item',
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

    if (session.target === 'summary') {
      workingRows.value = scheduleService.moveSummaryRows(
        session.baseRows,
        session.rowIds,
        payload.deltaDays,
      )
      return
    }

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

    if (session.target === 'summary') {
      interactionSession.value = null
      return
    }

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

  function startResizeSession(
    payload:
      | { kind: 'item'; itemId: string; edge: 'left' | 'right' }
      | { kind: 'summary'; rowId: string; edge: 'left' | 'right' },
  ) {
    if (payload.kind === 'summary') {
      clearSelection()
      interactionSession.value = {
        type: 'resize',
        target: 'summary',
        rowId: payload.rowId,
        edge: payload.edge,
        baseRows: workingRows.value.map((row) => ({ ...row })),
      }
      return
    }

    selectItems([payload.itemId])
    interactionSession.value = {
      type: 'resize',
      target: 'item',
      itemId: payload.itemId,
      edge: payload.edge,
      baseItems: workingItems.value.map((item) => ({ ...item })),
    }
  }

  function previewResizeSession(payload: { deltaDays: number }) {
    const session = interactionSession.value
    if (!session || session.type !== 'resize') return

    if (session.target === 'summary') {
      workingRows.value = scheduleService.resizeSummaryRow(
        session.baseRows,
        session.rowId,
        session.edge,
        payload.deltaDays,
      )
      return
    }

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
    contextMenuItems,
    dayWidth,
    rowHeight,
    timeline,
    shellLayout,
    chartScrollTop,
    chartScrollLeft,
    loadSnapshot,
    clearSelection,
    closeContextMenu,
    addParentRow,
    addChildRow,
    toggleRowCollapse,
    selectItems,
    openItemContextMenu,
    openRowContextMenu,
    openCanvasContextMenu,
    executeContextMenuCommand,
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
