import { computed, ref } from 'vue'
import { schedule2dRebuildRepository } from '@/features/schedule/schedule-2d-rebuild/infra/schedule-rebuild-repository'
import type {
  ScheduleCriticalPath,
  ScheduleDependency,
  ScheduleGroup,
  ScheduleItem,
  ScheduleLink,
  ScheduleMilestone,
  ScheduleRow,
  ScheduleSnapshot,
} from '@/features/schedule/schedule-2d-rebuild/model/schedule-rebuild-types'
import {
  SCHEDULE_MILESTONE_ROW_ID,
  SCHEDULE_SHELL_DEFAULTS,
  SCHEDULE_TIMELINE_DEFAULTS,
  SCHEDULE_TIMELINE_ZOOM_LEVELS,
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
  anchor: 'item' | 'summary'
  itemIds: string[]
  summaryBlockIds: string[]
  baseItems: ScheduleItem[]
  baseRows: ScheduleRow[]
  baseLaneByItemId: Record<string, number>
  maxLaneIndexByRowId: Record<string, number>
  pinnedLaneByItemId: Record<string, number>
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
  summaryBlockId: string
  edge: 'left' | 'right'
  baseRows: ScheduleRow[]
}

type ConnectionCreationState = {
  kind: 'dependency' | 'link' | 'critical-path'
  sourceItemId: string
  pathId?: number
  colorHex?: string
}

type WorkCreateDialogPreset = {
  divisionName: string
  workTypeName: string
  subWorkTypeName: string
  subWorkTypeId: number | null
}

type WorkCreateDialogState = {
  open: boolean
  mode: 'create' | 'edit'
  workId: number | null
  startDate: string
  preset: WorkCreateDialogPreset | null
}

type ColorPaletteTarget =
  | { kind: 'row'; rowId: string }
  | { kind: 'summary-block'; rowId: string; summaryBlockId: string }
  | { kind: 'item'; itemId: string }

type ColorPaletteState = {
  open: boolean
  x: number
  y: number
  title: string
  subtitle: string
  selectedColorHex: string | null
  resetActive: boolean
  showReset: boolean
  resetLabel: string
  target: ColorPaletteTarget | null
}

function cloneRows(rows: ScheduleRow[]): ScheduleRow[] {
  return rows.map((row) => ({
    ...row,
    summaryBlocks: row.summaryBlocks.map((summaryBlock) => ({ ...summaryBlock })),
  }))
}

function createClosedColorPaletteState(): ColorPaletteState {
  return {
    open: false,
    x: 0,
    y: 0,
    title: '색상 선택',
    subtitle: '',
    selectedColorHex: null,
    resetActive: false,
    showReset: false,
    resetLabel: '자동 색 사용',
    target: null,
  }
}

export function useSchedule2dRebuildPage() {
  const snapshot = ref<ScheduleSnapshot | null>(null)
  const workingRows = ref<ScheduleRow[]>([])
  const workingItems = ref<ScheduleItem[]>([])
  const workingDependencies = ref<ScheduleDependency[]>([])
  const workingLinks = ref<ScheduleLink[]>([])
  const workingCriticalPaths = ref<ScheduleCriticalPath[]>([])
  const workingGroups = ref<ScheduleGroup[]>([])
  const workingMilestones = ref<ScheduleMilestone[]>([])
  const isLoading = ref(false)
  const errorMessage = ref('')
  const chartScrollTop = ref(0)
  const chartScrollLeft = ref(0)
  const selectionState = ref(createEmptyScheduleSelectionState())
  const contextMenuState = ref(createClosedScheduleContextMenuState())
  const colorPaletteState = ref(createClosedColorPaletteState())
  const dayWidth = ref<number>(SCHEDULE_TIMELINE_DEFAULTS.dayWidth)
  const rowHeight = ref<number>(SCHEDULE_SHELL_DEFAULTS.rowHeight)
  const showCriticalPaths = ref(true)
  const interactionSession = ref<MoveSession | ResizeSession | SummaryResizeSession | null>(null)
  const lanePreferenceByItemId = ref<Record<string, number>>({})
  const connectionCreationState = ref<ConnectionCreationState | null>(null)
  const workCreateDialogState = ref<WorkCreateDialogState>({
    open: false,
    mode: 'create',
    workId: null,
    startDate: '',
    preset: null,
  })

  const rowById = computed(() => new Map(workingRows.value.map((row) => [row.id, row])))
  const currentZoomIndex = computed(() => {
    const exactIndex = SCHEDULE_TIMELINE_ZOOM_LEVELS.findIndex((level) => level === dayWidth.value)
    if (exactIndex >= 0) return exactIndex

    return SCHEDULE_TIMELINE_ZOOM_LEVELS.reduce((closestIndex, level, index, levels) => (
      Math.abs(level - dayWidth.value) < Math.abs(levels[closestIndex]! - dayWidth.value)
        ? index
        : closestIndex
    ), 0)
  })
  const canZoomOut = computed(() => currentZoomIndex.value > 0)
  const canZoomIn = computed(() => currentZoomIndex.value < SCHEDULE_TIMELINE_ZOOM_LEVELS.length - 1)
  const criticalPathCount = computed(() => workingCriticalPaths.value.length)

  const summary = computed(() => {
    if (!snapshot.value) {
      return {
        rows: 0,
        items: 0,
        dependencies: 0,
        links: 0,
        groups: 0,
        milestones: 0,
        pendingContracts: 0,
      }
    }

    return {
      rows: workingRows.value.length,
      items: workingItems.value.length,
      dependencies: workingDependencies.value.length,
      links: workingLinks.value.length,
      groups: workingGroups.value.length,
      milestones: workingMilestones.value.length,
      pendingContracts: snapshot.value.pendingContracts.length,
    }
  })

  const timeline = computed(() => (
    snapshot.value
      ? scheduleService.buildTimeline(workingItems.value, workingRows.value, { dayWidth: dayWidth.value })
      : null
  ))
  const shellLayout = computed(() => (
    snapshot.value && timeline.value
      ? scheduleService.buildShellLayout(workingRows.value, workingItems.value, timeline.value, {
          rowHeight: rowHeight.value,
          preferredLaneByItemId: lanePreferenceByItemId.value,
          pinnedLaneByItemId: interactionSession.value?.type === 'move' && interactionSession.value.itemIds.length > 0
            ? interactionSession.value.pinnedLaneByItemId
            : undefined,
          dependencies: workingDependencies.value,
          links: workingLinks.value,
          criticalPaths: workingCriticalPaths.value,
          milestones: workingMilestones.value,
          showCriticalPaths: showCriticalPaths.value,
        })
      : null
  ))

  function closeContextMenuOnly() {
    contextMenuState.value = createClosedScheduleContextMenuState()
  }

  function closeColorPalette() {
    colorPaletteState.value = createClosedColorPaletteState()
  }

  function closeContextMenu() {
    closeContextMenuOnly()
    closeColorPalette()
  }

  async function loadSnapshot() {
    isLoading.value = true
    errorMessage.value = ''

    try {
      snapshot.value = await scheduleService.loadSnapshot(schedule2dRebuildRepository)
      workingRows.value = cloneRows(snapshot.value.rows)
      workingItems.value = snapshot.value.items.map((item) => ({ ...item }))
      workingDependencies.value = snapshot.value.dependencies.map((dependency) => ({ ...dependency }))
      workingLinks.value = snapshot.value.links.map((link) => ({ ...link }))
      workingCriticalPaths.value = snapshot.value.criticalPaths.map((criticalPath) => ({ ...criticalPath }))
      workingGroups.value = snapshot.value.groups.map((group) => ({ ...group, itemIds: [...group.itemIds] }))
      workingMilestones.value = snapshot.value.milestones.map((milestone) => ({ ...milestone }))
      lanePreferenceByItemId.value = {}
      selectionState.value = createEmptyScheduleSelectionState()
      connectionCreationState.value = null
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
    connectionCreationState.value = null
    closeContextMenu()
  }

  function closeWorkCreateDialog() {
    workCreateDialogState.value = {
      open: false,
      mode: 'create',
      workId: null,
      startDate: '',
      preset: null,
    }
  }

  function setWorkCreateDialogOpen(nextOpen: boolean) {
    if (nextOpen) return
    closeWorkCreateDialog()
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

  function selectBars(payload: { itemIds: string[]; summaryBlockIds: string[] }) {
    selectionState.value = {
      ...selectionState.value,
      rowIds: [],
      itemIds: payload.itemIds,
      summaryBlockIds: payload.summaryBlockIds,
      dependencyIds: [],
      linkIds: [],
      criticalPathIds: [],
      groupIds: [],
      milestoneIds: [],
    }
    closeContextMenu()
  }

  function canCreateItemOnCanvasTarget(target: Extract<ScheduleContextMenuTarget, { kind: 'canvas' }>): boolean {
    if (!target.rowId || !target.date) return false

    return rowById.value.get(target.rowId)?.kind === 'child-process'
  }

  function canCreateSummaryBlockOnCanvasTarget(target: Extract<ScheduleContextMenuTarget, { kind: 'canvas' }>): boolean {
    if (!target.rowId || !target.date) return false

    return rowById.value.get(target.rowId)?.kind === 'parent-process'
  }

  function canCreateMilestoneOnCanvasTarget(target: Extract<ScheduleContextMenuTarget, { kind: 'canvas' }>): boolean {
    return target.rowId === SCHEDULE_MILESTONE_ROW_ID && !!target.date
  }

  function openColorPalette(target: ColorPaletteTarget) {
    const paletteX = contextMenuState.value.x
    const paletteY = contextMenuState.value.y

    if (target.kind === 'item') {
      const targetItem = workingItems.value.find((item) => item.id === target.itemId)
      closeContextMenuOnly()
      colorPaletteState.value = {
        open: true,
        x: paletteX,
        y: paletteY,
        title: '작업 색상 선택',
        subtitle: '개별 색상을 지우면 공정 기본색을 따라갑니다.',
        selectedColorHex: scheduleService.getResolvedItemBaseColor(workingRows.value, workingItems.value, target.itemId),
        resetActive: !targetItem?.colorHex,
        showReset: true,
        resetLabel: '공정색 따라가기',
        target,
      }
      return
    }

    const targetRow = rowById.value.get(target.rowId)
    closeContextMenuOnly()
    colorPaletteState.value = {
      open: true,
      x: paletteX,
      y: paletteY,
      title: '공정 색상 선택',
      subtitle: '상위 공정은 조금 더 짙게, 하위 공정은 같은 톤으로 더 연하게 반영됩니다.',
      selectedColorHex: scheduleService.getResolvedRowBaseColor(workingRows.value, target.rowId),
      resetActive: !targetRow?.colorHex,
      showReset: true,
      resetLabel: '자동 공정색 사용',
      target,
    }
  }

  function applyColorPalette(colorHex: string | null) {
    const paletteTarget = colorPaletteState.value.target
    if (!paletteTarget) {
      closeColorPalette()
      return
    }

    if (paletteTarget.kind === 'item') {
      workingItems.value = scheduleService.updateItemColor(workingItems.value, [paletteTarget.itemId], colorHex)
    } else {
      workingRows.value = scheduleService.updateRowColor(workingRows.value, paletteTarget.rowId, colorHex)
    }

    closeColorPalette()
  }

  function promptForName(label: string, currentName: string): string | null {
    if (typeof window === 'undefined') return null

    const nextName = window.prompt(label, currentName)
    if (nextName === null) return null

    const trimmedName = nextName.trim()
    return trimmedName.length > 0 ? trimmedName : null
  }

  function promptForGapDays(currentGapDays = 0): number | null {
    if (typeof window === 'undefined') return null

    const nextValue = window.prompt('링크 gap 일수를 입력하세요. 예) -2, 0, +2', currentGapDays >= 0 ? `+${currentGapDays}` : `${currentGapDays}`)
    if (nextValue === null) return null

    const normalizedValue = nextValue.trim().replace(/\s+/g, '')
    if (!/^[+-]?\d+$/.test(normalizedValue)) {
      window.alert('정수 일수를 입력해야 합니다. 예) -2, 0, +2')
      return null
    }

    return Number.parseInt(normalizedValue, 10)
  }

  function promptForMilestoneLabel(currentLabel = ''): string | null {
    if (typeof window === 'undefined') return null

    const nextLabel = window.prompt('마일스톤 텍스트를 입력하세요.', currentLabel)
    if (nextLabel === null) return null

    const trimmedLabel = nextLabel.trim()
    if (!trimmedLabel) {
      window.alert('마일스톤 텍스트를 입력해야 합니다.')
      return null
    }

    return trimmedLabel
  }

  function openItemContextMenu(payload: { itemId: string; x: number; y: number }) {
    closeColorPalette()

    const nextSelectedItemIds = selectionState.value.itemIds.includes(payload.itemId)
      ? selectionState.value.itemIds
      : [payload.itemId]

    selectionState.value = {
      ...createEmptyScheduleSelectionState(),
      itemIds: nextSelectedItemIds,
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

  function openSummaryBlockContextMenu(payload: { rowId: string; summaryBlockId: string; x: number; y: number }) {
    closeColorPalette()

    selectionState.value = {
      ...createEmptyScheduleSelectionState(),
      summaryBlockIds: [payload.summaryBlockId],
    }
    contextMenuState.value = {
      open: true,
      x: payload.x,
      y: payload.y,
      target: {
        kind: 'summary-block',
        rowId: payload.rowId,
        summaryBlockId: payload.summaryBlockId,
      },
    }
  }

  function openDependencyContextMenu(payload: { dependencyId: string; x: number; y: number }) {
    closeColorPalette()

    selectionState.value = {
      ...createEmptyScheduleSelectionState(),
      dependencyIds: [payload.dependencyId],
    }
    contextMenuState.value = {
      open: true,
      x: payload.x,
      y: payload.y,
      target: {
        kind: 'dependency',
        dependencyId: payload.dependencyId,
      },
    }
  }

  function openLinkContextMenu(payload: { linkId: string; x: number; y: number }) {
    closeColorPalette()

    selectionState.value = {
      ...createEmptyScheduleSelectionState(),
      linkIds: [payload.linkId],
    }
    contextMenuState.value = {
      open: true,
      x: payload.x,
      y: payload.y,
      target: {
        kind: 'link',
        linkId: payload.linkId,
      },
    }
  }

  function openCriticalPathContextMenu(payload: { criticalPathId: string; x: number; y: number }) {
    closeColorPalette()

    selectionState.value = {
      ...createEmptyScheduleSelectionState(),
      criticalPathIds: [payload.criticalPathId],
    }
    contextMenuState.value = {
      open: true,
      x: payload.x,
      y: payload.y,
      target: {
        kind: 'critical-path',
        criticalPathId: payload.criticalPathId,
      },
    }
  }

  function openRowContextMenu(payload: { rowId: string; x: number; y: number }) {
    if (!rowById.value.has(payload.rowId)) return
    closeColorPalette()

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
    closeColorPalette()

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

  function getScopedItemIds(targetItemId: string): string[] {
    return selectionState.value.itemIds.includes(targetItemId)
      ? selectionState.value.itemIds
      : [targetItemId]
  }

  function openWorkCreateDialog(payload: { rowId: string; startDate: string }) {
    const targetRow = rowById.value.get(payload.rowId)
    const seedItem = workingItems.value.find((item) => item.rowId === payload.rowId)

    workCreateDialogState.value = {
      open: true,
      mode: 'create',
      workId: null,
      startDate: payload.startDate,
      preset: {
        divisionName: seedItem?.division ?? '',
        workTypeName: seedItem?.workType ?? targetRow?.source.workType ?? '',
        subWorkTypeName: seedItem?.subWorkType ?? targetRow?.source.subWorkType ?? '',
        subWorkTypeId: targetRow?.source.subWorkTypeId ?? null,
      },
    }
    closeContextMenu()
  }

  function openWorkEditDialog(itemId: string) {
    const targetItem = workingItems.value.find((item) => item.id === itemId)
    if (!targetItem) {
      closeContextMenu()
      return
    }

    const targetRow = rowById.value.get(targetItem.rowId)
    workCreateDialogState.value = {
      open: true,
      mode: 'edit',
      workId: targetItem.workId,
      startDate: targetItem.startDate,
      preset: {
        divisionName: targetItem.division ?? '',
        workTypeName: targetItem.workType ?? targetRow?.source.workType ?? '',
        subWorkTypeName: targetItem.subWorkType ?? targetRow?.source.subWorkType ?? '',
        subWorkTypeId: targetRow?.source.subWorkTypeId ?? null,
      },
    }
    closeContextMenu()
  }

  const contextMenuItems = computed<ScheduleContextMenuItem[]>(() => {
    const target = contextMenuState.value.target
    if (!contextMenuState.value.open || !target) return []

    if (target.kind === 'item') {
      return [
        {
          id: 'toggle-dependency',
          label: 'dependency 생성',
          command: 'toggle-dependency' as const,
          icon: 'link' as const,
        },
        {
          id: 'toggle-link',
          label: 'link 생성',
          command: 'toggle-link',
          icon: 'link',
        },
        {
          id: 'toggle-critical-path',
          label: 'critical path 생성',
          command: 'toggle-critical-path',
          icon: 'link',
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
        {
          id: 'delete-item',
          label: '삭제',
          command: 'delete-item',
          icon: 'trash',
          danger: true,
        },
      ]
    }

    if (target.kind === 'dependency') {
      return [
        {
          id: 'remove-dependency',
          label: 'dependency 제거',
          command: 'remove-dependency',
          icon: 'unlink',
          danger: true,
        },
      ]
    }

    if (target.kind === 'link') {
      return [
        {
          id: 'remove-link',
          label: 'link 제거',
          command: 'remove-link',
          icon: 'unlink',
          danger: true,
        },
      ]
    }

    if (target.kind === 'critical-path') {
      return [
        {
          id: 'remove-critical-path',
          label: 'critical path 제거',
          command: 'remove-critical-path',
          icon: 'unlink',
          danger: true,
        },
        {
          id: 'remove-critical-path-chain',
          label: 'critical path 전체 제거',
          command: 'remove-critical-path-chain',
          icon: 'unlink',
          danger: true,
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

    if (target.kind === 'summary-block') {
      const row = rowById.value.get(target.rowId)
      if (!row || row.kind !== 'parent-process') return []

      return [
        {
          id: 'delete-summary-block',
          label: '상위 블록 삭제',
          command: 'delete-summary-block',
          icon: 'trash',
          danger: true,
        },
        {
          id: 'change-summary-parent-color',
          label: '색상 변경',
          command: 'change-color',
          icon: 'palette',
        },
        {
          id: 'change-summary-parent-properties',
          label: '속성 변경',
          command: 'change-properties',
          icon: 'pencil',
        },
      ]
    }

    if (target.kind === 'canvas') {
      if (canCreateMilestoneOnCanvasTarget(target)) {
        return [
          {
            id: 'create-milestone',
            label: '마일스톤 생성',
            command: 'create-milestone',
            icon: 'plus',
          },
        ]
      }

      if (canCreateSummaryBlockOnCanvasTarget(target)) {
        return [
          {
            id: 'create-summary-block',
            label: '상위 블록 생성',
            command: 'create-summary-block',
            icon: 'plus',
          },
        ]
      }

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

    if (command === 'create-milestone' && target.kind === 'canvas' && canCreateMilestoneOnCanvasTarget(target) && target.date) {
      activateMilestone({ date: target.date })
      return
    }

    if (command === 'create-item' && target.kind === 'canvas' && canCreateItemOnCanvasTarget(target) && target.rowId && target.date) {
      openWorkCreateDialog({
        rowId: target.rowId,
        startDate: target.date,
      })
      return
    }

    if (command === 'create-summary-block' && target.kind === 'canvas' && canCreateSummaryBlockOnCanvasTarget(target) && target.rowId && target.date) {
      workingRows.value = scheduleService.addSummaryBlock(workingRows.value, {
        rowId: target.rowId,
        startDate: target.date,
      })
      closeContextMenu()
      return
    }

    if (target.kind === 'row' || target.kind === 'summary-block') {
      const targetRow = rowById.value.get(target.rowId)
      if (!targetRow || targetRow.kind !== 'parent-process') {
        closeContextMenu()
        return
      }

      if (command === 'change-color') {
        openColorPalette(target)
        return
      }

      if (command === 'change-properties') {
        const currentName = target.kind === 'summary-block'
          ? targetRow.summaryBlocks.find((summaryBlock) => summaryBlock.id === target.summaryBlockId)?.name ?? targetRow.name
          : targetRow.name
        const nextName = promptForName(
          target.kind === 'summary-block' ? '상위 블록명을 입력하세요.' : '상위 공정명을 입력하세요.',
          currentName,
        )
        if (nextName) {
          workingRows.value = target.kind === 'summary-block'
            ? scheduleService.updateSummaryBlockName(workingRows.value, target.rowId, target.summaryBlockId, nextName)
            : scheduleService.updateRowName(workingRows.value, target.rowId, nextName)
        }
        closeContextMenu()
        return
      }

      if (target.kind === 'summary-block' && command === 'delete-summary-block') {
        workingRows.value = scheduleService.deleteSummaryBlocks(workingRows.value, [target.summaryBlockId])
        selectionState.value = createEmptyScheduleSelectionState()
        closeContextMenu()
        return
      }
    }

    if (target.kind === 'item') {
      const scopedItemIds = getScopedItemIds(target.itemId)

      if (command === 'toggle-dependency') {
        connectionCreationState.value = {
          kind: 'dependency',
          sourceItemId: target.itemId,
        }
        selectionState.value = {
          ...createEmptyScheduleSelectionState(),
          itemIds: [target.itemId],
        }
        closeContextMenu()
        return
      }

      if (command === 'toggle-link') {
        connectionCreationState.value = {
          kind: 'link',
          sourceItemId: target.itemId,
        }
        selectionState.value = {
          ...createEmptyScheduleSelectionState(),
          itemIds: [target.itemId],
        }
        closeContextMenu()
        return
      }

      if (command === 'toggle-critical-path') {
        const criticalPathDraft = scheduleService.createCriticalPathDraft(workingCriticalPaths.value, target.itemId)
        connectionCreationState.value = {
          kind: 'critical-path',
          sourceItemId: target.itemId,
          pathId: criticalPathDraft.pathId,
          colorHex: criticalPathDraft.colorHex,
        }
        selectionState.value = {
          ...createEmptyScheduleSelectionState(),
          itemIds: [target.itemId],
        }
        closeContextMenu()
        return
      }

      if (command === 'delete-item') {
        workingItems.value = scheduleService.deleteItems(workingItems.value, scopedItemIds)
        workingDependencies.value = scheduleService.removeDependenciesForItems(workingDependencies.value, scopedItemIds)
        workingLinks.value = scheduleService.removeLinksForItems(workingLinks.value, scopedItemIds)
        workingCriticalPaths.value = workingCriticalPaths.value.filter((criticalPath) => (
          !scopedItemIds.includes(criticalPath.sourceItemId) &&
          !scopedItemIds.includes(criticalPath.targetItemId)
        ))
        workingGroups.value = scheduleService.ungroupItems(workingGroups.value, scopedItemIds)
        selectionState.value = createEmptyScheduleSelectionState()
        closeContextMenu()
        return
      }

      if (command === 'change-color') {
        openColorPalette(target)
        return
      }

      if (command === 'change-properties') {
        openWorkEditDialog(target.itemId)
        return
      }
    }

    if (target.kind === 'dependency' && command === 'remove-dependency') {
      workingDependencies.value = scheduleService.removeDependenciesByIds(workingDependencies.value, [target.dependencyId])
      closeContextMenu()
      return
    }

    if (target.kind === 'link' && command === 'remove-link') {
      workingLinks.value = scheduleService.removeLinksByIds(workingLinks.value, [target.linkId])
      closeContextMenu()
      return
    }

    if (target.kind === 'critical-path' && command === 'remove-critical-path') {
      workingCriticalPaths.value = scheduleService.removeCriticalPathsByIds(
        workingCriticalPaths.value,
        [target.criticalPathId],
      )
      closeContextMenu()
      return
    }

    if (target.kind === 'critical-path' && command === 'remove-critical-path-chain') {
      workingCriticalPaths.value = scheduleService.removeConnectedCriticalPathChain(
        workingCriticalPaths.value,
        target.criticalPathId,
      )
      closeContextMenu()
      return
    }
  }

  function cancelConnectionCreation() {
    connectionCreationState.value = null
  }

  function completeConnectionCreation(targetItemId: string) {
    const connectionCreation = connectionCreationState.value
    if (!connectionCreation) return

    if (connectionCreation.sourceItemId !== targetItemId) {
      if (connectionCreation.kind === 'dependency') {
        workingDependencies.value = scheduleService.createDependency(workingDependencies.value, {
          sourceItemId: connectionCreation.sourceItemId,
          targetItemId,
        })
      } else if (connectionCreation.kind === 'critical-path') {
        const criticalPathDraft = scheduleService.createCriticalPathDraft(
          workingCriticalPaths.value,
          connectionCreation.sourceItemId,
        )
        const pathId = connectionCreation.pathId ?? criticalPathDraft.pathId
        const colorHex = connectionCreation.colorHex ?? criticalPathDraft.colorHex
        workingCriticalPaths.value = scheduleService.createCriticalPath(workingCriticalPaths.value, {
          sourceItemId: connectionCreation.sourceItemId,
          targetItemId,
          pathId,
          colorHex,
        })

        selectionState.value = {
          ...createEmptyScheduleSelectionState(),
          itemIds: [connectionCreation.sourceItemId, targetItemId],
        }
        connectionCreationState.value = {
          kind: 'critical-path',
          sourceItemId: targetItemId,
          pathId,
          colorHex,
        }
        closeContextMenu()
        return
      } else {
        const gapDays = promptForGapDays()
        if (gapDays === null) return

        workingLinks.value = scheduleService.createLink(workingLinks.value, {
          sourceItemId: connectionCreation.sourceItemId,
          targetItemId,
          gapDays,
        })
      }

      selectionState.value = {
        ...createEmptyScheduleSelectionState(),
        itemIds: [connectionCreation.sourceItemId, targetItemId],
      }
    }

    connectionCreationState.value = null
    closeContextMenu()
  }

  function activateMilestone(payload: { date: string; milestoneId?: string }) {
    closeContextMenu()

    const existingMilestone = payload.milestoneId
      ? workingMilestones.value.find((milestone) => milestone.id === payload.milestoneId)
      : workingMilestones.value.find((milestone) => milestone.date === payload.date && milestone.rowId === null)
    const nextLabel = promptForMilestoneLabel(existingMilestone?.label ?? '')
    if (!nextLabel) return

    workingMilestones.value = scheduleService.upsertMilestone(workingMilestones.value, {
      date: existingMilestone?.date ?? payload.date,
      label: nextLabel,
      rowId: null,
    })

    const nextActiveMilestone = workingMilestones.value.find((milestone) => (
      milestone.date === (existingMilestone?.date ?? payload.date) &&
      milestone.rowId === null
    ))
    selectionState.value = {
      ...createEmptyScheduleSelectionState(),
      milestoneIds: nextActiveMilestone ? [nextActiveMilestone.id] : [],
    }
  }

  function startMoveSession(
    payload:
      | { kind: 'item'; itemId: string }
      | { kind: 'summary'; rowId: string; summaryBlockId: string },
  ) {
    const selectedItemIds = payload.kind === 'item' && selectionState.value.itemIds.includes(payload.itemId)
      ? selectionState.value.itemIds
      : payload.kind === 'item'
        ? [payload.itemId]
        : selectionState.value.summaryBlockIds.includes(payload.summaryBlockId)
          ? selectionState.value.itemIds
          : []
    const selectedSummaryBlockIds = payload.kind === 'summary' && selectionState.value.summaryBlockIds.includes(payload.summaryBlockId)
      ? selectionState.value.summaryBlockIds
      : payload.kind === 'summary'
        ? [payload.summaryBlockId]
        : selectionState.value.itemIds.includes(payload.itemId)
          ? selectionState.value.summaryBlockIds
          : []
    const baseLaneByItemId = Object.fromEntries(
      (shellLayout.value?.bars ?? [])
        .filter((bar) => bar.kind === 'item' && selectedItemIds.includes(bar.itemId))
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

    selectBars({
      itemIds: selectedItemIds,
      summaryBlockIds: selectedSummaryBlockIds,
    })
    interactionSession.value = {
      type: 'move',
      anchor: payload.kind,
      itemIds: selectedItemIds,
      summaryBlockIds: selectedSummaryBlockIds,
      baseItems: workingItems.value.map((item) => ({ ...item })),
      baseRows: cloneRows(workingRows.value),
      baseLaneByItemId,
      maxLaneIndexByRowId,
      pinnedLaneByItemId: baseLaneByItemId,
    }
  }

  function previewMoveSession(payload: { deltaDays: number; deltaLanes: number }) {
    const session = interactionSession.value
    if (!session || session.type !== 'move') return

    if (session.summaryBlockIds.length > 0) {
      workingRows.value = scheduleService.moveSummaryBlocks(
        session.baseRows,
        session.summaryBlockIds,
        payload.deltaDays,
      )
    }

    if (session.itemIds.length === 0) {
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
          const deltaLanes = session.anchor === 'item' ? payload.deltaLanes : 0
          const clampedDeltaLanes = Math.min(
            Math.max(deltaLanes, -(rowBounds?.minLane ?? laneIndex)),
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
      workingDependencies.value,
      workingLinks.value,
    )
  }

  function endMoveSession() {
    const session = interactionSession.value
    if (!session || session.type !== 'move') return

    if (session.itemIds.length === 0) {
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
      | { kind: 'summary'; rowId: string; summaryBlockId: string; edge: 'left' | 'right' },
  ) {
    if (payload.kind === 'summary') {
      selectionState.value = {
        ...createEmptyScheduleSelectionState(),
        summaryBlockIds: [payload.summaryBlockId],
      }
      closeContextMenu()
      interactionSession.value = {
        type: 'resize',
        target: 'summary',
        rowId: payload.rowId,
        summaryBlockId: payload.summaryBlockId,
        edge: payload.edge,
        baseRows: cloneRows(workingRows.value),
      }
      return
    }

    selectBars({
      itemIds: [payload.itemId],
      summaryBlockIds: [],
    })
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
      workingRows.value = scheduleService.resizeSummaryBlock(
        session.baseRows,
        session.rowId,
        session.summaryBlockId,
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
      workingDependencies.value,
      workingLinks.value,
    )
  }

  function endResizeSession() {
    if (interactionSession.value?.type === 'resize') {
      interactionSession.value = null
    }
  }

  function setDayWidth(nextDayWidth: number, viewportWidth: number) {
    if (nextDayWidth === dayWidth.value) return

    if (timeline.value) {
      chartScrollLeft.value = scheduleService.getScrollLeftForZoom(
        timeline.value,
        nextDayWidth,
        chartScrollLeft.value,
        viewportWidth,
      )
    }

    dayWidth.value = nextDayWidth
    closeContextMenu()
  }

  function zoomIn(viewportWidth: number) {
    if (!canZoomIn.value) return
    setDayWidth(SCHEDULE_TIMELINE_ZOOM_LEVELS[currentZoomIndex.value + 1]!, viewportWidth)
  }

  function zoomOut(viewportWidth: number) {
    if (!canZoomOut.value) return
    setDayWidth(SCHEDULE_TIMELINE_ZOOM_LEVELS[currentZoomIndex.value - 1]!, viewportWidth)
  }

  function toggleCriticalPaths() {
    if (criticalPathCount.value === 0) return

    showCriticalPaths.value = !showCriticalPaths.value
    closeContextMenu()
  }

  return {
    snapshot,
    workingItems,
    isLoading,
    errorMessage,
    summary,
    selectionState,
    contextMenuState,
    colorPaletteState,
    workCreateDialogState,
    contextMenuItems,
    dayWidth,
    canZoomIn,
    canZoomOut,
    showCriticalPaths,
    criticalPathCount,
    rowHeight,
    connectionCreationState,
    timeline,
    shellLayout,
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
    closeWorkCreateDialog,
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
    syncRowPanelScroll,
  }
}
