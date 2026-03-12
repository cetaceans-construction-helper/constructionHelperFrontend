import type {
  ScheduleContractState,
  ScheduleBarLayout,
  ScheduleConnectionKind,
  ScheduleConnectionLayout,
  ScheduleCriticalPath,
  ScheduleDependency,
  ScheduleGroup,
  ScheduleItem,
  ScheduleItemAppearance,
  ScheduleLink,
  ScheduleMilestone,
  ScheduleMilestoneLayout,
  SchedulePendingContract,
  ScheduleRow,
  ScheduleShellLayout,
  ScheduleShellRow,
  ScheduleSnapshot,
  ScheduleSourceBundle,
  ScheduleSourceTask,
  ScheduleTimelineCell,
  ScheduleTimelineGroup,
  ScheduleTimelineLayout,
} from '@/features/schedule/schedule-2d-rebuild/model/schedule-rebuild-types'

interface ParentRowDraft {
  id: string
  name: string
  minPositionY: number
  startDate: string
  endDate: string
}

interface ChildRowDraft {
  id: string
  parentId: string
  name: string
  workType: string
  subWorkType: string
  subWorkTypeId: number
  minPositionY: number
}

export interface ScheduleSnapshotRepository {
  getScheduleSnapshot(): Promise<ScheduleSnapshot>
}

interface TimelineOptions {
  dayWidth?: number
  paddingBeforeDays?: number
  paddingAfterDays?: number
}

interface ShellLayoutOptions {
  rowHeight?: number
  barHeight?: number
  preferredLaneByItemId?: Readonly<Record<string, number>>
  pinnedLaneByItemId?: Readonly<Record<string, number>>
  dependencies?: ScheduleDependency[]
  links?: ScheduleLink[]
  criticalPaths?: ScheduleCriticalPath[]
  milestones?: ScheduleMilestone[]
  showCriticalPaths?: boolean
}

interface RowBarDraft {
  id: string
  itemId: string
  rowId: string
  laneIndex: number
  name: string
  colorHex: string | null
  left: number
  width: number
  height: number
  startDate: string
  endDate: string
  durationDays: number
  appearance: ScheduleItemAppearance
}

type ResizeEdge = 'left' | 'right'

export const SCHEDULE_TIMELINE_DEFAULTS = {
  dayWidth: 36,
  paddingBeforeDays: 7,
  paddingAfterDays: 14,
} as const

export const SCHEDULE_TIMELINE_ZOOM_LEVELS = [20, 28, 36, 48, 64] as const

export const SCHEDULE_SHELL_DEFAULTS = {
  rowHeight: 44,
  barHeight: 24,
} as const

export const SCHEDULE_MILESTONE_ROW_ID = 'row:milestones'

const CRITICAL_PATH_COLORS = [
  '#dc2626',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#0f766e',
  '#0284c7',
  '#2563eb',
  '#7c3aed',
  '#db2777',
] as const

let localPathIdCounter = Date.now()

const MILESTONE_MARKER_SIZE = 12
const MILESTONE_BADGE_HEIGHT = 24
const MILESTONE_BADGE_GAP = 6
const MILESTONE_BADGE_HORIZONTAL_GAP = 8
const MILESTONE_BADGE_HORIZONTAL_PADDING = 10
const MILESTONE_MIN_LABEL_WIDTH = 52

const nativeContract: ScheduleContractState = { status: 'native' }

const pendingContracts: SchedulePendingContract[] = [
  {
    id: 'pending-process-hierarchy',
    kind: 'process-hierarchy',
    title: '상위/하위 공정 저장 계약 필요',
    description:
      '현재 row tree는 workType/subWorkType에서 파생한 임시 읽기 모델이다. 전용 공정 계층 저장 계약이 추가되어야 편집 결과를 영속화할 수 있다.',
  },
  {
    id: 'pending-group',
    kind: 'group',
    title: '그룹 저장 계약 필요',
    description:
      '중첩 그룹과 그룹 이동 규칙은 내부 모델만 준비된 상태다. group 엔티티 저장 계약이 추가되기 전까지 영속화할 수 없다.',
  },
  {
    id: 'pending-milestone',
    kind: 'milestone',
    title: '마일스톤 저장 계약 필요',
    description:
      '마일스톤은 표시 도메인으로 분리할 예정이지만, 현재 API 계약에는 대응 엔티티가 없다.',
  },
]

function toStableIdPart(value: string): string {
  return encodeURIComponent(value.trim().toLowerCase() || 'unclassified')
}

function makeParentRowId(workType: string): string {
  return `parent:${toStableIdPart(workType)}`
}

function makeChildRowId(workType: string, subWorkTypeId: number, subWorkType: string): string {
  const subPart = subWorkTypeId > 0 ? String(subWorkTypeId) : toStableIdPart(subWorkType)
  return `child:${toStableIdPart(workType)}:${subPart}`
}

function compareByPositionThenName(a: { minPositionY: number; name: string }, b: { minPositionY: number; name: string }) {
  return a.minPositionY - b.minPositionY || a.name.localeCompare(b.name, 'ko')
}

function compareTasks(a: ScheduleSourceTask, b: ScheduleSourceTask) {
  return (
    a.positionY - b.positionY ||
    a.workType.localeCompare(b.workType, 'ko') ||
    a.subWorkType.localeCompare(b.subWorkType, 'ko') ||
    a.name.localeCompare(b.name, 'ko') ||
    a.workId - b.workId
  )
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1)
}

function formatLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function diffDays(startDate: string, endDate: string): number {
  const start = parseLocalDate(startDate)
  const end = parseLocalDate(endDate)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)
  return Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
}

function shiftDateString(date: string, days: number): string {
  return formatLocalDate(addDays(parseLocalDate(date), days))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function createLocalPathId(): number {
  localPathIdCounter += 1
  return localPathIdCounter
}

function getCriticalPathColor(pathId: number): string {
  const paletteIndex = ((pathId % CRITICAL_PATH_COLORS.length) + CRITICAL_PATH_COLORS.length) % CRITICAL_PATH_COLORS.length
  return CRITICAL_PATH_COLORS[paletteIndex]!
}

function estimateMilestoneLabelWidth(label: string, dayWidth: number): number {
  return Math.max(MILESTONE_MIN_LABEL_WIDTH, Math.round(label.length * 8) + MILESTONE_BADGE_HORIZONTAL_PADDING * 2, dayWidth)
}

function buildMilestoneLayouts(
  timeline: ScheduleTimelineLayout,
  milestones: ScheduleMilestone[],
  baseRowHeight: number,
): { rowHeight: number; milestones: ScheduleMilestoneLayout[] } {
  const rowVerticalPadding = Math.max((baseRowHeight - MILESTONE_BADGE_HEIGHT) / 2, 8)
  const laneIntervals = new Map<number, Array<{ left: number; right: number }>>()
  const milestoneLayouts: ScheduleMilestoneLayout[] = []

  const sortedMilestones = [...milestones].sort((a, b) => (
    a.date.localeCompare(b.date) ||
    a.label.localeCompare(b.label, 'ko')
  ))

  sortedMilestones.forEach((milestone) => {
    const dayLeft = diffDays(timeline.startDate, milestone.date) * timeline.dayWidth
    const markerLeft = dayLeft + timeline.dayWidth / 2 - MILESTONE_MARKER_SIZE / 2
    const labelWidth = estimateMilestoneLabelWidth(milestone.label, timeline.dayWidth)
    const totalWidth = MILESTONE_MARKER_SIZE + MILESTONE_BADGE_HORIZONTAL_GAP + labelWidth
    const maxLeft = Math.max(timeline.chartWidth - totalWidth, 0)
    const left = clamp(Math.round(markerLeft), 0, maxLeft)
    const right = left + totalWidth

    let laneIndex = 0
    while ((laneIntervals.get(laneIndex) ?? []).some((interval) => left < interval.right && right > interval.left)) {
      laneIndex += 1
    }

    const intervals = laneIntervals.get(laneIndex) ?? []
    intervals.push({ left, right })
    laneIntervals.set(laneIndex, intervals)

    milestoneLayouts.push({
      id: milestone.id,
      date: milestone.date,
      label: milestone.label,
      rowId: milestone.rowId,
      left,
      top: rowVerticalPadding + laneIndex * (MILESTONE_BADGE_HEIGHT + MILESTONE_BADGE_GAP),
      width: totalWidth,
      height: MILESTONE_BADGE_HEIGHT,
    })
  })

  const laneCount = Math.max(
    milestoneLayouts.reduce((maxLaneIndex, milestone) => Math.max(maxLaneIndex, Math.round((milestone.top - rowVerticalPadding) / (MILESTONE_BADGE_HEIGHT + MILESTONE_BADGE_GAP))), -1) + 1,
    1,
  )
  const rowHeight = Math.max(
    baseRowHeight,
    rowVerticalPadding * 2 + laneCount * MILESTONE_BADGE_HEIGHT + Math.max(laneCount - 1, 0) * MILESTONE_BADGE_GAP,
  )

  return {
    rowHeight,
    milestones: milestoneLayouts,
  }
}

function createCriticalPathDraft(
  criticalPaths: ScheduleCriticalPath[],
  preferredItemId?: string,
): { pathId: number; colorHex: string } {
  if (preferredItemId) {
    const relatedPathMetaById = new Map<number, { count: number; hasOutgoing: boolean; colorHex: string }>()

    criticalPaths.forEach((criticalPath) => {
      if (criticalPath.sourceItemId !== preferredItemId && criticalPath.targetItemId !== preferredItemId) return

      const currentMeta = relatedPathMetaById.get(criticalPath.pathId)
      relatedPathMetaById.set(criticalPath.pathId, {
        count: (currentMeta?.count ?? 0) + 1,
        hasOutgoing: (currentMeta?.hasOutgoing ?? false) || criticalPath.sourceItemId === preferredItemId,
        colorHex: currentMeta?.colorHex ?? criticalPath.colorHex ?? getCriticalPathColor(criticalPath.pathId),
      })
    })

    const preferredPathEntry = [...relatedPathMetaById.entries()]
      .sort((a, b) => (
        b[1].count - a[1].count ||
        Number(b[1].hasOutgoing) - Number(a[1].hasOutgoing) ||
        a[0] - b[0]
      ))[0]

    if (preferredPathEntry) {
      return {
        pathId: preferredPathEntry[0],
        colorHex: preferredPathEntry[1].colorHex,
      }
    }
  }

  const usedColors = new Set<string>()
  const seenPathIds = new Set<number>()

  criticalPaths.forEach((criticalPath) => {
    if (seenPathIds.has(criticalPath.pathId)) return

    seenPathIds.add(criticalPath.pathId)
    usedColors.add(criticalPath.colorHex ?? getCriticalPathColor(criticalPath.pathId))
  })

  const nextColor = CRITICAL_PATH_COLORS.find((color) => !usedColors.has(color))
    ?? CRITICAL_PATH_COLORS[seenPathIds.size % CRITICAL_PATH_COLORS.length]
    ?? CRITICAL_PATH_COLORS[0]

  return {
    pathId: createLocalPathId(),
    colorHex: nextColor,
  }
}

function shiftItemByDays(item: ScheduleItem, deltaDays: number): ScheduleItem {
  if (deltaDays === 0) return item

  return {
    ...item,
    startDate: shiftDateString(item.startDate, deltaDays),
    endDate: shiftDateString(item.endDate, deltaDays),
  }
}

function getSuccessorStartDateFromPredecessor(endDate: string, gapDays: number): string {
  return shiftDateString(endDate, gapDays + 1)
}

function getPredecessorEndDateFromSuccessor(startDate: string, gapDays: number): string {
  return shiftDateString(startDate, -(gapDays + 1))
}

function getCurrentGapDays(sourceItem: ScheduleItem, targetItem: ScheduleItem): number {
  return diffDays(sourceItem.endDate, targetItem.startDate) - 1
}

function formatGapDaysLabel(gapDays: number): string {
  return `${gapDays >= 0 ? '+' : ''}${gapDays}일`
}

function serializeItemsInBaseOrder(baseItems: ScheduleItem[], itemsById: Map<string, ScheduleItem>): ScheduleItem[] {
  return baseItems.map((item) => itemsById.get(item.id) ?? item)
}

function buildRelationMaps<
  TRelation extends { sourceItemId: string; targetItemId: string },
>(relations: TRelation[]) {
  const outgoingByItemId = new Map<string, TRelation[]>()
  const incomingByItemId = new Map<string, TRelation[]>()

  relations.forEach((relation) => {
    const outgoing = outgoingByItemId.get(relation.sourceItemId) ?? []
    outgoing.push(relation)
    outgoingByItemId.set(relation.sourceItemId, outgoing)

    const incoming = incomingByItemId.get(relation.targetItemId) ?? []
    incoming.push(relation)
    incomingByItemId.set(relation.targetItemId, incoming)
  })

  return {
    outgoingByItemId,
    incomingByItemId,
  }
}

function getConnectionVerticalOffset(kind: ScheduleConnectionKind): number {
  if (kind === 'critical-path') return 8
  if (kind === 'link') return -8
  return 0
}

function buildConnectionGeometry(
  sourceBar: ScheduleBarLayout,
  targetBar: ScheduleBarLayout,
  kind: ScheduleConnectionKind,
): { path: string; labelX: number; labelY: number } {
  const verticalOffset = getConnectionVerticalOffset(kind)
  const sourceX = sourceBar.left + sourceBar.width
  const sourceY = sourceBar.top + sourceBar.height / 2 + verticalOffset
  const targetX = targetBar.left
  const targetY = targetBar.top + targetBar.height / 2 + verticalOffset

  if (targetX >= sourceX + 24) {
    const controlOffset = Math.max((targetX - sourceX) / 2, 28)
    return {
      path: `M ${sourceX} ${sourceY} C ${sourceX + controlOffset} ${sourceY}, ${targetX - controlOffset} ${targetY}, ${targetX} ${targetY}`,
      labelX: (sourceX + targetX) / 2,
      labelY: (sourceY + targetY) / 2,
    }
  }

  const bendX = Math.max(sourceX, targetX) + 36 + Math.abs(verticalOffset)
  const midY = sourceY + (targetY - sourceY) / 2

  return {
    path: `M ${sourceX} ${sourceY} L ${bendX} ${sourceY} L ${bendX} ${targetY} L ${targetX} ${targetY}`,
    labelX: bendX + 10,
    labelY: midY,
  }
}

function buildRangeMismatchSegments(
  timeline: ScheduleTimelineLayout,
  sourceRange: { startDate: string; endDate: string },
  compareRange: { startDate: string; endDate: string },
): Array<{ left: number; width: number }> {
  const segments: Array<{ startDate: string; endDate: string }> = []

  function pushSegment(startDate: string, endDate: string) {
    if (startDate > endDate) return
    segments.push({ startDate, endDate })
  }

  if (sourceRange.startDate < compareRange.startDate) {
    pushSegment(
      sourceRange.startDate,
      sourceRange.endDate < compareRange.startDate
        ? sourceRange.endDate
        : formatLocalDate(addDays(parseLocalDate(compareRange.startDate), -1)),
    )
  } else if (compareRange.startDate < sourceRange.startDate) {
    pushSegment(
      compareRange.startDate,
      compareRange.endDate < sourceRange.startDate
        ? compareRange.endDate
        : formatLocalDate(addDays(parseLocalDate(sourceRange.startDate), -1)),
    )
  }

  if (sourceRange.endDate > compareRange.endDate) {
    pushSegment(
      sourceRange.startDate > compareRange.endDate
        ? sourceRange.startDate
        : formatLocalDate(addDays(parseLocalDate(compareRange.endDate), 1)),
      sourceRange.endDate,
    )
  } else if (compareRange.endDate > sourceRange.endDate) {
    pushSegment(
      compareRange.startDate > sourceRange.endDate
        ? compareRange.startDate
        : formatLocalDate(addDays(parseLocalDate(sourceRange.endDate), 1)),
      compareRange.endDate,
    )
  }

  return segments.map((segment) => ({
    left: diffDays(timeline.startDate, segment.startDate) * timeline.dayWidth,
    width: Math.max((diffDays(segment.startDate, segment.endDate) + 1) * timeline.dayWidth, timeline.dayWidth),
  }))
}

function buildTimelineGroups(
  days: ScheduleTimelineCell[],
  keySelector: (cell: ScheduleTimelineCell) => string,
  labelSelector: (cell: ScheduleTimelineCell) => string,
): ScheduleTimelineGroup[] {
  if (days.length === 0) return []

  const groups: ScheduleTimelineGroup[] = []
  let currentKey = keySelector(days[0]!)
  let startIndex = 0

  for (let index = 1; index <= days.length; index += 1) {
    const cell = days[index]
    const nextKey = cell ? keySelector(cell) : null

    if (currentKey !== nextKey) {
      const startCell = days[startIndex]!
      const span = index - startIndex
      groups.push({
        key: `${currentKey}:${startIndex}`,
        label: labelSelector(startCell),
        startIndex,
        span,
        left: startCell.left,
        width: span * startCell.width,
      })

      if (cell) {
        currentKey = nextKey as string
        startIndex = index
      }
    }
  }

  return groups
}

function buildRows(tasks: ScheduleSourceTask[]): ScheduleRow[] {
  const parentDrafts = new Map<string, ParentRowDraft>()
  const childDrafts = new Map<string, ChildRowDraft>()

  tasks.forEach((task) => {
    const workType = task.workType || '미분류 공정'
    const subWorkType = task.subWorkType || '세부공정 미분류'
    const parentId = makeParentRowId(workType)
    const childId = makeChildRowId(workType, task.subWorkTypeId, subWorkType)

    const existingParent = parentDrafts.get(parentId)
    if (!existingParent) {
      parentDrafts.set(parentId, {
        id: parentId,
        name: workType,
        minPositionY: task.positionY,
        startDate: task.startDate,
        endDate: task.endDate,
      })
    } else {
      existingParent.minPositionY = Math.min(existingParent.minPositionY, task.positionY)
      existingParent.startDate = task.startDate < existingParent.startDate ? task.startDate : existingParent.startDate
      existingParent.endDate = task.endDate > existingParent.endDate ? task.endDate : existingParent.endDate
    }

    const existingChild = childDrafts.get(childId)
    if (!existingChild) {
      childDrafts.set(childId, {
        id: childId,
        parentId,
        name: subWorkType,
        workType,
        subWorkType,
        subWorkTypeId: task.subWorkTypeId,
        minPositionY: task.positionY,
      })
    } else {
      existingChild.minPositionY = Math.min(existingChild.minPositionY, task.positionY)
    }
  })

  const sortedParents = Array.from(parentDrafts.values()).sort(compareByPositionThenName)
  const childDraftsByParent = new Map<string, ChildRowDraft[]>()

  childDrafts.forEach((childDraft) => {
    const entries = childDraftsByParent.get(childDraft.parentId) ?? []
    entries.push(childDraft)
    childDraftsByParent.set(childDraft.parentId, entries)
  })

  childDraftsByParent.forEach((entries) => entries.sort(compareByPositionThenName))

  const rows: ScheduleRow[] = []

  sortedParents.forEach((parentDraft) => {
    rows.push({
      id: parentDraft.id,
      kind: 'parent-process',
      parentId: null,
      name: parentDraft.name,
      colorHex: null,
      summaryStartDate: parentDraft.startDate,
      summaryEndDate: parentDraft.endDate,
      order: rows.length,
      depth: 0,
      collapsed: false,
      source: {
        kind: 'work-type',
        derivedFrom: parentDraft.name,
        workType: parentDraft.name,
      },
      contract: nativeContract,
    })

    const childRows = childDraftsByParent.get(parentDraft.id) ?? []
    childRows.forEach((childDraft) => {
      rows.push({
        id: childDraft.id,
        kind: 'child-process',
        parentId: childDraft.parentId,
        name: childDraft.name,
        colorHex: null,
        summaryStartDate: null,
        summaryEndDate: null,
        order: rows.length,
        depth: 1,
        collapsed: false,
        source: {
          kind: 'sub-work-type',
          derivedFrom: `${childDraft.workType} / ${childDraft.subWorkType}`,
          workType: childDraft.workType,
          subWorkType: childDraft.subWorkType,
          subWorkTypeId: childDraft.subWorkTypeId,
        },
        contract: nativeContract,
      })
    })
  })

  return rows
}

function reindexRows(rows: ScheduleRow[]): ScheduleRow[] {
  return rows.map((row, index) => ({
    ...row,
    order: index,
  }))
}

function createLocalRowId(prefix: 'parent' | 'child'): string {
  return `${prefix}:mock:${Date.now()}-${Math.floor(Math.random() * 1_000_000).toString(36)}`
}

function createLocalEntityId(prefix: 'dependency' | 'critical-path' | 'group' | 'milestone'): string {
  return `${prefix}:local:${Date.now()}-${Math.floor(Math.random() * 1_000_000).toString(36)}`
}

function createLocalItemId(): string {
  return `item:local:${Date.now()}-${Math.floor(Math.random() * 1_000_000).toString(36)}`
}

function addParentRow(rows: ScheduleRow[]): ScheduleRow[] {
  const nextParentIndex = rows.filter((row) => row.kind === 'parent-process').length + 1

  return reindexRows([
    ...rows,
    {
      id: createLocalRowId('parent'),
      kind: 'parent-process',
      parentId: null,
      name: `새 상위 공정 ${nextParentIndex}`,
      colorHex: null,
      summaryStartDate: null,
      summaryEndDate: null,
      order: rows.length,
      depth: 0,
      collapsed: false,
      source: {
        kind: 'mock',
        derivedFrom: 'manual-parent-row',
      },
      contract: {
        status: 'pending-contract',
        reason: '상위/하위 공정 저장 계약 필요',
      },
    },
  ])
}

function addChildRow(rows: ScheduleRow[], parentRowId: string): ScheduleRow[] {
  const parentRow = rows.find((row) => row.id === parentRowId && row.kind === 'parent-process')
  if (!parentRow) return rows

  const parentChildRows = rows.filter((row) => row.parentId === parentRowId)
  const nextChildIndex = parentChildRows.length + 1
  const insertAfterOrder = parentChildRows.length > 0
    ? Math.max(...parentChildRows.map((row) => row.order))
    : parentRow.order
  const childRow: ScheduleRow = {
    id: createLocalRowId('child'),
    kind: 'child-process',
    parentId: parentRowId,
    name: `새 하위 공정 ${nextChildIndex}`,
    colorHex: null,
    summaryStartDate: null,
    summaryEndDate: null,
    order: insertAfterOrder + 1,
    depth: 1,
    collapsed: false,
    source: {
      kind: 'mock',
      derivedFrom: parentRow.name,
      workType: parentRow.source.workType ?? parentRow.name,
    },
    contract: {
      status: 'pending-contract',
      reason: '상위/하위 공정 저장 계약 필요',
    },
  }

  const nextRows = rows
    .map((row) => (
      row.id === parentRowId
        ? { ...row, collapsed: false }
        : row
    ))
    .flatMap((row) => (
      row.order === insertAfterOrder
        ? [row, childRow]
        : [row]
    ))

  return reindexRows(nextRows)
}

function toggleRowCollapse(rows: ScheduleRow[], rowId: string): ScheduleRow[] {
  return rows.map((row) => (
    row.id === rowId && row.kind === 'parent-process'
      ? { ...row, collapsed: !row.collapsed }
      : row
  ))
}

function deleteItems(items: ScheduleItem[], itemIds: string[]): ScheduleItem[] {
  if (itemIds.length === 0) return items

  const itemIdSet = new Set(itemIds)
  return items.filter((item) => !itemIdSet.has(item.id))
}

function deleteRows(
  rows: ScheduleRow[],
  items: ScheduleItem[],
  rowIds: string[],
): { rows: ScheduleRow[]; items: ScheduleItem[]; deletedItemIds: string[] } {
  if (rowIds.length === 0) {
    return {
      rows,
      items,
      deletedItemIds: [],
    }
  }

  const rowIdSet = new Set(rowIds)
  const descendantRowIds = new Set<string>()

  rows.forEach((row) => {
    if (rowIdSet.has(row.id)) {
      descendantRowIds.add(row.id)
      if (row.kind === 'parent-process') {
        rows
          .filter((candidate) => candidate.parentId === row.id)
          .forEach((childRow) => descendantRowIds.add(childRow.id))
      }
    }
  })

  const nextRows = reindexRows(rows.filter((row) => !descendantRowIds.has(row.id)))
  const deletedItemIds = items
    .filter((item) => descendantRowIds.has(item.rowId))
    .map((item) => item.id)
  const nextItems = items.filter((item) => !descendantRowIds.has(item.rowId))

  return {
    rows: nextRows,
    items: nextItems,
    deletedItemIds,
  }
}

function createSequentialDependencies(
  dependencies: ScheduleDependency[],
  items: ScheduleItem[],
  itemIds: string[],
): ScheduleDependency[] {
  if (itemIds.length < 2) return dependencies

  const selectedItemIdSet = new Set(itemIds)
  const selectedItems = items
    .filter((item) => selectedItemIdSet.has(item.id))
    .sort((a, b) => (
      a.startDate.localeCompare(b.startDate) ||
      a.endDate.localeCompare(b.endDate) ||
      a.rowId.localeCompare(b.rowId) ||
      a.name.localeCompare(b.name, 'ko') ||
      a.workId - b.workId
    ))
  if (selectedItems.length < 2) return dependencies

  const existingPairs = new Set(
    dependencies.map((dependency) => `${dependency.sourceItemId}->${dependency.targetItemId}`),
  )
  const nextDependencies = [...dependencies]

  selectedItems.slice(0, -1).forEach((sourceItem, index) => {
    const targetItem = selectedItems[index + 1]
    if (!targetItem) return

    const pairKey = `${sourceItem.id}->${targetItem.id}`
    if (existingPairs.has(pairKey)) return

    nextDependencies.push({
      id: createLocalEntityId('dependency'),
      pathId: Date.now() + index,
      sourceItemId: sourceItem.id,
      targetItemId: targetItem.id,
      lagDays: 0,
      pathName: null,
      color: '#64748b',
      isCriticalCandidate: false,
    })
    existingPairs.add(pairKey)
  })

  return nextDependencies
}

function createDependency(
  dependencies: ScheduleDependency[],
  payload: { sourceItemId: string; targetItemId: string },
): ScheduleDependency[] {
  if (
    payload.sourceItemId === payload.targetItemId ||
    dependencies.some((dependency) => (
      dependency.sourceItemId === payload.sourceItemId &&
      dependency.targetItemId === payload.targetItemId
    ))
  ) {
    return dependencies
  }

  return [
    ...dependencies,
    {
      id: createLocalEntityId('dependency'),
      pathId: Date.now(),
      sourceItemId: payload.sourceItemId,
      targetItemId: payload.targetItemId,
      lagDays: 0,
      pathName: null,
      color: '#64748b',
      isCriticalCandidate: false,
    },
  ]
}

function removeDependenciesForItems(dependencies: ScheduleDependency[], itemIds: string[]): ScheduleDependency[] {
  if (itemIds.length === 0) return dependencies

  const itemIdSet = new Set(itemIds)
  return dependencies.filter((dependency) => (
    !itemIdSet.has(dependency.sourceItemId) && !itemIdSet.has(dependency.targetItemId)
  ))
}

function removeDependenciesByIds(dependencies: ScheduleDependency[], dependencyIds: string[]): ScheduleDependency[] {
  if (dependencyIds.length === 0) return dependencies

  const dependencyIdSet = new Set(dependencyIds)
  return dependencies.filter((dependency) => !dependencyIdSet.has(dependency.id))
}

function createSequentialLinks(
  links: ScheduleLink[],
  items: ScheduleItem[],
  itemIds: string[],
): ScheduleLink[] {
  if (itemIds.length < 2) return links

  const selectedItemIdSet = new Set(itemIds)
  const selectedItems = items
    .filter((item) => selectedItemIdSet.has(item.id))
    .sort((a, b) => (
      a.startDate.localeCompare(b.startDate) ||
      a.endDate.localeCompare(b.endDate) ||
      a.rowId.localeCompare(b.rowId) ||
      a.name.localeCompare(b.name, 'ko') ||
      a.workId - b.workId
    ))
  if (selectedItems.length < 2) return links

  const existingPairs = new Set(
    links.map((link) => `${link.sourceItemId}->${link.targetItemId}`),
  )
  const nextLinks = [...links]

  selectedItems.slice(0, -1).forEach((sourceItem, index) => {
    const targetItem = selectedItems[index + 1]
    if (!targetItem) return

    const pairKey = `${sourceItem.id}->${targetItem.id}`
    if (existingPairs.has(pairKey)) return

    nextLinks.push({
      id: `link:local:${Date.now()}-${index}-${Math.floor(Math.random() * 1_000_000).toString(36)}`,
      pathId: Date.now() + index,
      sourceItemId: sourceItem.id,
      targetItemId: targetItem.id,
      gapDays: getCurrentGapDays(sourceItem, targetItem),
      pathName: null,
      color: '#0f766e',
    })
    existingPairs.add(pairKey)
  })

  return nextLinks
}

function removeLinksForItems(links: ScheduleLink[], itemIds: string[]): ScheduleLink[] {
  if (itemIds.length === 0) return links

  const itemIdSet = new Set(itemIds)
  return links.filter((link) => (
    !itemIdSet.has(link.sourceItemId) && !itemIdSet.has(link.targetItemId)
  ))
}

function createLink(
  links: ScheduleLink[],
  payload: { sourceItemId: string; targetItemId: string; gapDays: number },
): ScheduleLink[] {
  if (
    payload.sourceItemId === payload.targetItemId ||
    links.some((link) => (
      link.sourceItemId === payload.sourceItemId &&
      link.targetItemId === payload.targetItemId
    ))
  ) {
    return links
  }

  return [
    ...links,
    {
      id: `link:local:${Date.now()}-${Math.floor(Math.random() * 1_000_000).toString(36)}`,
      pathId: Date.now(),
      sourceItemId: payload.sourceItemId,
      targetItemId: payload.targetItemId,
      gapDays: payload.gapDays,
      pathName: null,
      color: '#64748b',
    },
  ]
}

function removeLinksByIds(links: ScheduleLink[], linkIds: string[]): ScheduleLink[] {
  if (linkIds.length === 0) return links

  const linkIdSet = new Set(linkIds)
  return links.filter((link) => !linkIdSet.has(link.id))
}

function createCriticalPath(
  criticalPaths: ScheduleCriticalPath[],
  payload: { sourceItemId: string; targetItemId: string; pathId?: number; colorHex?: string | null },
): ScheduleCriticalPath[] {
  if (
    payload.sourceItemId === payload.targetItemId ||
    criticalPaths.some((criticalPath) => (
      criticalPath.sourceItemId === payload.sourceItemId &&
      criticalPath.targetItemId === payload.targetItemId
    ))
  ) {
    return criticalPaths
  }

  return [
    ...criticalPaths,
    {
      id: createLocalEntityId('critical-path'),
      pathId: payload.pathId ?? createLocalPathId(),
      sourceItemId: payload.sourceItemId,
      targetItemId: payload.targetItemId,
      colorHex: payload.colorHex ?? null,
    },
  ]
}

function removeCriticalPathsByIds(
  criticalPaths: ScheduleCriticalPath[],
  criticalPathIds: string[],
): ScheduleCriticalPath[] {
  if (criticalPathIds.length === 0) return criticalPaths

  const criticalPathIdSet = new Set(criticalPathIds)
  return criticalPaths.filter((criticalPath) => !criticalPathIdSet.has(criticalPath.id))
}

function removeConnectedCriticalPathChain(
  criticalPaths: ScheduleCriticalPath[],
  seedCriticalPathId: string,
): ScheduleCriticalPath[] {
  const seedCriticalPath = criticalPaths.find((criticalPath) => criticalPath.id === seedCriticalPathId)
  if (!seedCriticalPath) return criticalPaths

  return criticalPaths.filter((criticalPath) => criticalPath.pathId !== seedCriticalPath.pathId)
}

function createGroup(groups: ScheduleGroup[], itemIds: string[]): ScheduleGroup[] {
  const nextItemIds = Array.from(new Set(itemIds))
  if (nextItemIds.length < 2) return groups

  const nextGroups = ungroupItems(groups, nextItemIds)
  const nextGroupIndex = nextGroups.length + 1

  return [
    ...nextGroups,
    {
      id: createLocalEntityId('group'),
      name: `그룹 ${nextGroupIndex}`,
      parentGroupId: null,
      itemIds: nextItemIds,
      contract: {
        status: 'pending-contract',
        reason: '그룹 저장 계약 필요',
      },
    },
  ]
}

function ungroupItems(groups: ScheduleGroup[], itemIds: string[]): ScheduleGroup[] {
  if (itemIds.length === 0) return groups

  const itemIdSet = new Set(itemIds)
  return groups
    .map((group) => ({
      ...group,
      itemIds: group.itemIds.filter((itemId) => !itemIdSet.has(itemId)),
    }))
    .filter((group) => group.itemIds.length > 0)
}

function upsertMilestone(
  milestones: ScheduleMilestone[],
  payload: { date: string; label: string; rowId: string | null },
): ScheduleMilestone[] {
  const nextLabel = payload.label.trim()
  if (!nextLabel) return milestones

  const existingMilestoneIndex = milestones.findIndex((milestone) => (
    milestone.date === payload.date &&
    (milestone.rowId ?? null) === payload.rowId
  ))

  if (existingMilestoneIndex >= 0) {
    return milestones.map((milestone, index) => (
      index === existingMilestoneIndex
        ? {
            ...milestone,
            label: nextLabel,
          }
        : milestone
    ))
  }

  return [
    ...milestones,
    {
      id: createLocalEntityId('milestone'),
      date: payload.date,
      label: nextLabel,
      rowId: payload.rowId,
      contract: {
        status: 'pending-contract',
        reason: '마일스톤 저장 계약 필요',
      },
    },
  ]
}

function createItem(
  rows: ScheduleRow[],
  items: ScheduleItem[],
  payload: { rowId: string; startDate: string },
): ScheduleItem[] {
  const targetRow = rows.find((row) => row.id === payload.rowId)
  if (!targetRow || targetRow.kind !== 'child-process') return items

  const nextItemIndex = items.filter((item) => item.rowId === payload.rowId).length + 1

  return [
    ...items,
    {
      id: createLocalItemId(),
      workId: Date.now(),
      rowId: payload.rowId,
      name: `새 작업 ${nextItemIndex}`,
      colorHex: null,
      startDate: payload.startDate,
      endDate: payload.startDate,
      durationDays: 1,
      positionY: targetRow.order,
      appearance: 'standard',
      division: '',
      workType: targetRow.source.workType ?? '',
      subWorkType: targetRow.source.subWorkType ?? targetRow.name,
      annotation: '',
    },
  ]
}

function updateRowColor(rows: ScheduleRow[], rowId: string, colorHex: string | null): ScheduleRow[] {
  return rows.map((row) => (
    row.id === rowId
      ? { ...row, colorHex }
      : row
  ))
}

function updateRowName(rows: ScheduleRow[], rowId: string, name: string): ScheduleRow[] {
  const trimmedName = name.trim()
  if (!trimmedName) return rows

  return rows.map((row) => (
    row.id === rowId
      ? { ...row, name: trimmedName }
      : row
  ))
}

function updateItemColor(items: ScheduleItem[], itemIds: string[], colorHex: string | null): ScheduleItem[] {
  if (itemIds.length === 0) return items

  const itemIdSet = new Set(itemIds)
  return items.map((item) => (
    itemIdSet.has(item.id)
      ? { ...item, colorHex }
      : item
  ))
}

function updateItemName(items: ScheduleItem[], itemId: string, name: string): ScheduleItem[] {
  const trimmedName = name.trim()
  if (!trimmedName) return items

  return items.map((item) => (
    item.id === itemId
      ? { ...item, name: trimmedName }
      : item
  ))
}

function buildItems(tasks: ScheduleSourceTask[]): ScheduleItem[] {
  return [...tasks].sort(compareTasks).map((task) => ({
    id: `item:${task.workId}`,
    workId: task.workId,
    rowId: makeChildRowId(task.workType || '미분류 공정', task.subWorkTypeId, task.subWorkType || '세부공정 미분류'),
    name: task.name,
    colorHex: null,
    startDate: task.startDate,
    endDate: task.endDate,
    durationDays: task.durationDays,
    positionY: task.positionY,
    appearance: task.isWorkingOnHoliday ? 'standard' : 'holiday-off',
    division: task.division,
    workType: task.workType,
    subWorkType: task.subWorkType,
    annotation: task.annotation,
  }))
}

function buildDependencies(bundle: ScheduleSourceBundle): ScheduleDependency[] {
  const itemIds = new Set(bundle.tasks.map((task) => `item:${task.workId}`))

  return bundle.links
    .filter((link) => itemIds.has(`item:${link.sourceWorkId}`) && itemIds.has(`item:${link.targetWorkId}`))
    .map((link) => ({
      id: `dependency:${link.pathId}:${link.sourceWorkId}:${link.targetWorkId}`,
      pathId: link.pathId,
      sourceItemId: `item:${link.sourceWorkId}`,
      targetItemId: `item:${link.targetWorkId}`,
      lagDays: 0,
      pathName: link.pathName,
      color: '#64748b',
      isCriticalCandidate: false,
    }))
}

function buildLinks(bundle: ScheduleSourceBundle): ScheduleLink[] {
  const itemIds = new Set(bundle.tasks.map((task) => `item:${task.workId}`))

  return bundle.links
    .filter((link) => (
      itemIds.has(`item:${link.sourceWorkId}`) &&
      itemIds.has(`item:${link.targetWorkId}`) &&
      typeof link.lagDays === 'number' &&
      link.lagDays > 0
    ))
    .map((link) => ({
      id: `link:${link.pathId}:${link.sourceWorkId}:${link.targetWorkId}`,
      pathId: link.pathId,
      sourceItemId: `item:${link.sourceWorkId}`,
      targetItemId: `item:${link.targetWorkId}`,
      gapDays: link.lagDays ?? 0,
      pathName: link.pathName,
      color: '#0f766e',
    }))
}

function buildCriticalPaths(bundle: ScheduleSourceBundle): ScheduleCriticalPath[] {
  const itemIds = new Set(bundle.tasks.map((task) => `item:${task.workId}`))

  return bundle.links
    .filter((link) => (
      itemIds.has(`item:${link.sourceWorkId}`) &&
      itemIds.has(`item:${link.targetWorkId}`) &&
      link.critical
    ))
    .map((link) => ({
      id: `critical:${link.pathId}:${link.sourceWorkId}:${link.targetWorkId}`,
      pathId: link.pathId,
      sourceItemId: `item:${link.sourceWorkId}`,
      targetItemId: `item:${link.targetWorkId}`,
    }))
}

function buildSnapshot(bundle: ScheduleSourceBundle): ScheduleSnapshot {
  const rows = buildRows(bundle.tasks)
  const items = buildItems(bundle.tasks)
  const dependencies = buildDependencies(bundle)
  const links = buildLinks(bundle)
  const criticalPaths = buildCriticalPaths(bundle)
  const parentRowCount = rows.filter((row) => row.kind === 'parent-process').length
  const childRowCount = rows.filter((row) => row.kind === 'child-process').length
  const uniquePathCount = new Set(bundle.links.map((link) => link.pathId)).size

  return {
    rows,
    items,
    dependencies,
    links,
    criticalPaths,
    groups: [],
    milestones: [],
    pendingContracts,
    metadata: {
      source: bundle.source,
      generatedAt: new Date().toISOString(),
      workCount: bundle.tasks.length,
      pathCount: uniquePathCount,
      dependencyCount: dependencies.length,
      linkCount: links.length,
      criticalPathCount: criticalPaths.length,
      parentRowCount,
      childRowCount,
    },
  }
}

async function loadSnapshot(repository: ScheduleSnapshotRepository): Promise<ScheduleSnapshot> {
  return repository.getScheduleSnapshot()
}

function buildTimeline(items: ScheduleItem[], options: TimelineOptions = {}): ScheduleTimelineLayout {
  const dayWidth = options.dayWidth ?? SCHEDULE_TIMELINE_DEFAULTS.dayWidth
  const paddingBeforeDays = options.paddingBeforeDays ?? SCHEDULE_TIMELINE_DEFAULTS.paddingBeforeDays
  const paddingAfterDays = options.paddingAfterDays ?? SCHEDULE_TIMELINE_DEFAULTS.paddingAfterDays

  const itemDates = items.flatMap((item) => [item.startDate, item.endDate])
  const todayString = formatLocalDate(new Date())

  const baseStartDate = itemDates.length > 0
    ? itemDates.reduce((min, value) => (value < min ? value : min), itemDates[0]!)
    : todayString
  const baseEndDate = itemDates.length > 0
    ? itemDates.reduce((max, value) => (value > max ? value : max), itemDates[0]!)
    : todayString

  const startDate = formatLocalDate(addDays(parseLocalDate(baseStartDate), -paddingBeforeDays))
  const endDate = formatLocalDate(addDays(parseLocalDate(baseEndDate), paddingAfterDays))
  const totalDays = diffDays(startDate, endDate) + 1

  const days: ScheduleTimelineCell[] = Array.from({ length: totalDays }, (_, index) => {
    const date = addDays(parseLocalDate(startDate), index)
    const dateString = formatLocalDate(date)
    const dayOfWeek = date.getDay()

    return {
      key: dateString,
      index,
      date: dateString,
      label: String(date.getDate()),
      dayOfMonth: date.getDate(),
      dayName: ['일', '월', '화', '수', '목', '금', '토'][dayOfWeek]!,
      monthLabel: `${date.getMonth() + 1}월`,
      yearLabel: `${date.getFullYear()}년`,
      left: index * dayWidth,
      width: dayWidth,
      isToday: dateString === todayString,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    }
  })

  return {
    startDate,
    endDate,
    dayWidth,
    chartWidth: totalDays * dayWidth,
    days,
    monthGroups: buildTimelineGroups(days, (cell) => `${cell.yearLabel}-${cell.monthLabel}`, (cell) => cell.monthLabel),
    yearGroups: buildTimelineGroups(days, (cell) => cell.yearLabel, (cell) => cell.yearLabel),
  }
}

function buildConnectionLayouts(
  itemBars: ScheduleBarLayout[],
  dependencies: ScheduleDependency[],
  links: ScheduleLink[],
  criticalPaths: ScheduleCriticalPath[],
): ScheduleConnectionLayout[] {
  const itemBarById = new Map(
    itemBars
      .filter((bar) => bar.kind === 'item')
      .map((bar) => [bar.itemId, bar] as const),
  )

  const connectionLayouts: ScheduleConnectionLayout[] = []

  function pushConnection(
    id: string,
    kind: ScheduleConnectionKind,
    pathId: number,
    colorHex: string | null,
    sourceItemId: string,
    targetItemId: string,
    label: string | null,
  ) {
    const sourceBar = itemBarById.get(sourceItemId)
    const targetBar = itemBarById.get(targetItemId)
    if (!sourceBar || !targetBar) return

    const geometry = buildConnectionGeometry(sourceBar, targetBar, kind)
    connectionLayouts.push({
      id,
      kind,
      pathId,
      colorHex,
      sourceItemId,
      targetItemId,
      path: geometry.path,
      label,
      labelX: geometry.labelX,
      labelY: geometry.labelY,
    })
  }

  dependencies.forEach((dependency) => {
    pushConnection(
      dependency.id,
      'dependency',
      dependency.pathId,
      dependency.color,
      dependency.sourceItemId,
      dependency.targetItemId,
      'FS',
    )
  })

  links.forEach((link) => {
    pushConnection(
      link.id,
      'link',
      link.pathId,
      link.color,
      link.sourceItemId,
      link.targetItemId,
      formatGapDaysLabel(link.gapDays),
    )
  })

  criticalPaths.forEach((criticalPath) => {
    pushConnection(
      criticalPath.id,
      'critical-path',
      criticalPath.pathId,
      criticalPath.colorHex ?? getCriticalPathColor(criticalPath.pathId),
      criticalPath.sourceItemId,
      criticalPath.targetItemId,
      null,
    )
  })

  return connectionLayouts
}

function buildShellLayout(
  rowsSource: ScheduleRow[],
  items: ScheduleItem[],
  timeline: ScheduleTimelineLayout,
  options: ShellLayoutOptions = {},
): ScheduleShellLayout {
  const rowHeight = options.rowHeight ?? SCHEDULE_SHELL_DEFAULTS.rowHeight
  const barHeight = options.barHeight ?? SCHEDULE_SHELL_DEFAULTS.barHeight
  const summaryBarHeight = barHeight
  const itemCountByRow = new Map<string, number>()
  const itemsByRow = new Map<string, ScheduleItem[]>()
  const childRowsByParentId = new Map<string, ScheduleRow[]>()
  const childItemsByParentId = new Map<string, ScheduleItem[]>()
  const descendantItemCountByParentId = new Map<string, number>()
  const rowBarDraftsById = new Map<string, RowBarDraft[]>()
  const rowHeightById = new Map<string, number>()
  const rowTopById = new Map<string, number>()
  const verticalPadding = Math.max((rowHeight - barHeight) / 2, 6)
  const laneGap = 6
  const preferredLaneByItemId = options.preferredLaneByItemId ?? {}
  const pinnedLaneByItemId = options.pinnedLaneByItemId ?? {}
  const dependencies = options.dependencies ?? []
  const links = options.links ?? []
  const criticalPaths = options.showCriticalPaths === false ? [] : options.criticalPaths ?? []
  const milestones = options.milestones ?? []
  const orderedRows = [...rowsSource].sort((a, b) => a.order - b.order)
  const rowById = new Map(orderedRows.map((row) => [row.id, row]))

  items.forEach((item) => {
    itemCountByRow.set(item.rowId, (itemCountByRow.get(item.rowId) ?? 0) + 1)
    const rowItems = itemsByRow.get(item.rowId) ?? []
    rowItems.push(item)
    itemsByRow.set(item.rowId, rowItems)
  })

  orderedRows.forEach((row) => {
    if (row.parentId) {
      const childRows = childRowsByParentId.get(row.parentId) ?? []
      childRows.push(row)
      childRowsByParentId.set(row.parentId, childRows)
    }
  })

  items.forEach((item) => {
    const row = rowById.get(item.rowId)
    if (!row?.parentId) return

    const parentItems = childItemsByParentId.get(row.parentId) ?? []
    parentItems.push(item)
    childItemsByParentId.set(row.parentId, parentItems)
    descendantItemCountByParentId.set(row.parentId, (descendantItemCountByParentId.get(row.parentId) ?? 0) + 1)
  })

  const visibleRows = orderedRows.filter((row) => {
    if (!row.parentId) return true
    const parentRow = rowById.get(row.parentId)
    return !parentRow?.collapsed
  })
  const milestoneLayoutResult = buildMilestoneLayouts(timeline, milestones, rowHeight)

  visibleRows.forEach((row) => {
    if (row.kind !== 'child-process') {
      rowHeightById.set(row.id, rowHeight)
      return
    }

    const rowItems = [...(itemsByRow.get(row.id) ?? [])]
      .sort((a, b) => (
        a.startDate.localeCompare(b.startDate) ||
        a.endDate.localeCompare(b.endDate) ||
        a.name.localeCompare(b.name, 'ko') ||
        a.workId - b.workId
      ))

    const laneIntervals = new Map<number, Array<{ left: number; right: number }>>()
    const rowBarDrafts: RowBarDraft[] = []

    function buildBarDraft(item: ScheduleItem, laneIndex: number): RowBarDraft {
      const left = diffDays(timeline.startDate, item.startDate) * timeline.dayWidth
      const width = Math.max(item.durationDays * timeline.dayWidth, timeline.dayWidth)
      return {
        id: `bar:${item.id}`,
        itemId: item.id,
        rowId: item.rowId,
        laneIndex,
        name: item.name,
        colorHex: item.colorHex ?? null,
        left,
        width,
        height: barHeight,
        startDate: item.startDate,
        endDate: item.endDate,
        durationDays: item.durationDays,
        appearance: item.appearance,
      }
    }

    function isLaneAvailable(laneIndex: number, draft: RowBarDraft): boolean {
      const intervals = laneIntervals.get(laneIndex) ?? []
      const draftRight = draft.left + draft.width
      return intervals.every((interval) => draft.left >= interval.right || draftRight <= interval.left)
    }

    function reserveLane(laneIndex: number, draft: RowBarDraft) {
      const intervals = laneIntervals.get(laneIndex) ?? []
      intervals.push({ left: draft.left, right: draft.left + draft.width })
      laneIntervals.set(laneIndex, intervals)
      rowBarDrafts.push(draft)
    }

    function findFirstAvailableLaneForDraft(draft: RowBarDraft, startLaneIndex = 0): number {
      let laneIndex = startLaneIndex
      while (!isLaneAvailable(laneIndex, draft)) {
        laneIndex += 1
      }
      return laneIndex
    }

    rowItems
      .filter((item) => pinnedLaneByItemId[item.id] !== undefined)
      .sort((a, b) => (
        (pinnedLaneByItemId[a.id] ?? 0) - (pinnedLaneByItemId[b.id] ?? 0) ||
        a.startDate.localeCompare(b.startDate) ||
        a.workId - b.workId
      ))
      .forEach((item) => {
        const requestedLaneIndex = pinnedLaneByItemId[item.id]!
        const draft = buildBarDraft(item, requestedLaneIndex)

        if (isLaneAvailable(requestedLaneIndex, draft)) {
          reserveLane(requestedLaneIndex, draft)
          return
        }

        const fallbackLaneIndex = findFirstAvailableLaneForDraft(draft, 0)
        reserveLane(fallbackLaneIndex, { ...draft, laneIndex: fallbackLaneIndex })
      })

    rowItems
      .filter((item) => pinnedLaneByItemId[item.id] === undefined && preferredLaneByItemId[item.id] !== undefined)
      .sort((a, b) => (
        (preferredLaneByItemId[a.id] ?? 0) - (preferredLaneByItemId[b.id] ?? 0) ||
        a.startDate.localeCompare(b.startDate) ||
        a.workId - b.workId
      ))
      .forEach((item) => {
        const draft = buildBarDraft(item, preferredLaneByItemId[item.id] ?? 0)
        const laneIndex = findFirstAvailableLaneForDraft(draft, 0)

        reserveLane(laneIndex, { ...draft, laneIndex })
      })

    rowItems
      .filter((item) => pinnedLaneByItemId[item.id] === undefined && preferredLaneByItemId[item.id] === undefined)
      .forEach((item) => {
        const draft = buildBarDraft(item, 0)
        const laneIndex = findFirstAvailableLaneForDraft(draft, 0)

        reserveLane(laneIndex, { ...draft, laneIndex })
      })

    const laneCount = Math.max(
      rowBarDrafts.reduce((maxLaneIndex, draft) => Math.max(maxLaneIndex, draft.laneIndex), -1) + 1,
      1,
    )
    const stackedRowHeight = verticalPadding * 2 + laneCount * barHeight + Math.max(laneCount - 1, 0) * laneGap

    rowBarDraftsById.set(row.id, rowBarDrafts)
    rowHeightById.set(row.id, row.kind === 'child-process' ? Math.max(rowHeight, stackedRowHeight) : rowHeight)
  })

  const milestoneRow: ScheduleShellRow = {
    id: SCHEDULE_MILESTONE_ROW_ID,
    parentId: null,
    name: '마일스톤',
    kind: 'milestone',
    collapsed: false,
    hasChildren: false,
    depth: 0,
    order: -1,
    top: 0,
    height: milestoneLayoutResult.rowHeight,
    itemCount: milestones.length,
  }

  let accumulatedTop = milestoneLayoutResult.rowHeight
  const processRows: ScheduleShellRow[] = visibleRows.map((row) => {
    const nextRowHeight = rowHeightById.get(row.id) ?? rowHeight
    rowTopById.set(row.id, accumulatedTop)

    const shellRow = {
      id: row.id,
      parentId: row.parentId,
      name: row.name,
      kind: row.kind,
      collapsed: row.collapsed,
      hasChildren: (childRowsByParentId.get(row.id)?.length ?? 0) > 0,
      depth: row.depth,
      order: row.order,
      top: accumulatedTop,
      height: nextRowHeight,
      itemCount: row.kind === 'parent-process'
        ? descendantItemCountByParentId.get(row.id) ?? 0
        : itemCountByRow.get(row.id) ?? 0,
    }
    accumulatedTop += nextRowHeight
    return shellRow
  })
  const rows: ScheduleShellRow[] = [milestoneRow, ...processRows]

  const itemBars: ScheduleBarLayout[] = visibleRows.flatMap((row) => {
    const rowTop = rowTopById.get(row.id)
    if (rowTop === undefined || row.kind !== 'child-process') return []

    return (rowBarDraftsById.get(row.id) ?? []).map((barDraft) => ({
      id: barDraft.id,
      itemId: barDraft.itemId,
      rowId: barDraft.rowId,
      kind: 'item',
      laneIndex: barDraft.laneIndex,
      name: barDraft.name,
      colorHex: barDraft.colorHex,
      left: barDraft.left,
      top: rowTop + verticalPadding + barDraft.laneIndex * (barHeight + laneGap),
      width: barDraft.width,
      height: barDraft.height,
      startDate: barDraft.startDate,
      endDate: barDraft.endDate,
      durationDays: barDraft.durationDays,
      appearance: barDraft.appearance,
    }))
  })

  const summaryBars: ScheduleBarLayout[] = visibleRows.flatMap((row) => {
    if (row.kind !== 'parent-process') return []

    const rowTop = rowTopById.get(row.id)
    const parentItems = childItemsByParentId.get(row.id) ?? []
    if (rowTop === undefined) return []

    const childStartDate = parentItems.length > 0
      ? parentItems.reduce((min, item) => (item.startDate < min ? item.startDate : min), parentItems[0]!.startDate)
      : null
    const childEndDate = parentItems.length > 0
      ? parentItems.reduce((max, item) => (item.endDate > max ? item.endDate : max), parentItems[0]!.endDate)
      : null
    const actualStartDate = row.summaryStartDate ?? childStartDate
    const actualEndDate = row.summaryEndDate ?? childEndDate
    if (!actualStartDate || !actualEndDate) return []

    const left = diffDays(timeline.startDate, actualStartDate) * timeline.dayWidth
    const durationDays = diffDays(actualStartDate, actualEndDate) + 1
    const absoluteMismatchSegments = childStartDate !== null && childEndDate !== null
      ? buildRangeMismatchSegments(
          timeline,
          { startDate: actualStartDate, endDate: actualEndDate },
          { startDate: childStartDate, endDate: childEndDate },
        )
      : []
    const rangeMismatchSegments = absoluteMismatchSegments
      .filter((segment) => segment.left >= left && segment.left + segment.width <= left + durationDays * timeline.dayWidth)
      .map((segment) => ({
        left: segment.left - left,
        width: segment.width,
      }))
    const overflowRangeSegments = absoluteMismatchSegments
      .filter((segment) => segment.left < left || segment.left + segment.width > left + durationDays * timeline.dayWidth)

    return [{
      id: `bar:summary:${row.id}`,
      itemId: `summary:${row.id}`,
      rowId: row.id,
      kind: 'summary',
      laneIndex: 0,
      name: row.name,
      colorHex: row.colorHex ?? null,
      rangeMismatchSegments,
      overflowRangeSegments,
      left,
      top: rowTop + (rowHeight - summaryBarHeight) / 2,
      width: Math.max(durationDays * timeline.dayWidth, timeline.dayWidth),
      height: summaryBarHeight,
      startDate: actualStartDate,
      endDate: actualEndDate,
      durationDays: diffDays(actualStartDate, actualEndDate) + 1,
      appearance: 'standard',
    }]
  })

  const connections = buildConnectionLayouts(itemBars, dependencies, links, criticalPaths)

  return {
    rows,
    bars: [...summaryBars, ...itemBars],
    milestones: milestoneLayoutResult.milestones,
    connections,
    chartHeight: accumulatedTop,
    rowHeight,
  }
}

function getInitialScrollLeftForYesterday(timeline: ScheduleTimelineLayout, viewportWidth: number): number {
  if (viewportWidth <= 0) return 0

  const yesterday = formatLocalDate(addDays(new Date(), -1))
  const maxScrollLeft = Math.max(timeline.chartWidth - viewportWidth, 0)

  if (yesterday <= timeline.startDate) return 0
  if (yesterday >= timeline.endDate) return maxScrollLeft

  const yesterdayRight = (diffDays(timeline.startDate, yesterday) + 1) * timeline.dayWidth
  return clamp(yesterdayRight - viewportWidth, 0, maxScrollLeft)
}

function getScrollLeftForZoom(
  timeline: ScheduleTimelineLayout,
  nextDayWidth: number,
  currentScrollLeft: number,
  viewportWidth: number,
): number {
  if (viewportWidth <= 0 || nextDayWidth <= 0) return currentScrollLeft

  const anchorDayIndex = (currentScrollLeft + viewportWidth / 2) / timeline.dayWidth
  const nextChartWidth = timeline.days.length * nextDayWidth
  const maxScrollLeft = Math.max(nextChartWidth - viewportWidth, 0)

  return clamp(anchorDayIndex * nextDayWidth - viewportWidth / 2, 0, maxScrollLeft)
}

function applyRelationshipConstraints(
  baseItems: ScheduleItem[],
  itemsById: Map<string, ScheduleItem>,
  seedItemIds: string[],
  dependencies: ScheduleDependency[],
  links: ScheduleLink[],
): ScheduleItem[] {
  if (seedItemIds.length === 0 || (dependencies.length === 0 && links.length === 0)) {
    return serializeItemsInBaseOrder(baseItems, itemsById)
  }

  const dependencyMaps = buildRelationMaps(dependencies)
  const linkMaps = buildRelationMaps(links)
  const queue = Array.from(new Set(seedItemIds))
  const queuedItemIds = new Set(queue)
  const maxIterations = Math.max(baseItems.length * Math.max(dependencies.length + links.length, 1) * 4, 32)
  let iterationCount = 0

  function enqueue(itemId: string) {
    if (queuedItemIds.has(itemId)) return
    queue.push(itemId)
    queuedItemIds.add(itemId)
  }

  while (queue.length > 0 && iterationCount < maxIterations) {
    iterationCount += 1
    const currentItemId = queue.shift()
    if (!currentItemId) continue

    queuedItemIds.delete(currentItemId)
    const currentItem = itemsById.get(currentItemId)
    if (!currentItem) continue

    ;(linkMaps.outgoingByItemId.get(currentItemId) ?? []).forEach((link) => {
      const targetItem = itemsById.get(link.targetItemId)
      if (!targetItem) return

      const requiredStartDate = getSuccessorStartDateFromPredecessor(currentItem.endDate, link.gapDays)
      const deltaDays = diffDays(targetItem.startDate, requiredStartDate)
      if (deltaDays === 0) return

      itemsById.set(targetItem.id, shiftItemByDays(targetItem, deltaDays))
      enqueue(targetItem.id)
    })

    ;(linkMaps.incomingByItemId.get(currentItemId) ?? []).forEach((link) => {
      const sourceItem = itemsById.get(link.sourceItemId)
      if (!sourceItem) return

      const requiredEndDate = getPredecessorEndDateFromSuccessor(currentItem.startDate, link.gapDays)
      const deltaDays = diffDays(sourceItem.endDate, requiredEndDate)
      if (deltaDays === 0) return

      itemsById.set(sourceItem.id, shiftItemByDays(sourceItem, deltaDays))
      enqueue(sourceItem.id)
    })

    ;(dependencyMaps.outgoingByItemId.get(currentItemId) ?? []).forEach((dependency) => {
      const targetItem = itemsById.get(dependency.targetItemId)
      if (!targetItem) return

      const requiredStartDate = getSuccessorStartDateFromPredecessor(currentItem.endDate, dependency.lagDays ?? 0)
      if (targetItem.startDate >= requiredStartDate) return

      const deltaDays = diffDays(targetItem.startDate, requiredStartDate)
      itemsById.set(targetItem.id, shiftItemByDays(targetItem, deltaDays))
      enqueue(targetItem.id)
    })

    ;(dependencyMaps.incomingByItemId.get(currentItemId) ?? []).forEach((dependency) => {
      const sourceItem = itemsById.get(dependency.sourceItemId)
      const nextCurrentItem = itemsById.get(currentItemId)
      if (!sourceItem || !nextCurrentItem) return

      const requiredStartDate = getSuccessorStartDateFromPredecessor(sourceItem.endDate, dependency.lagDays ?? 0)
      if (nextCurrentItem.startDate >= requiredStartDate) return

      const deltaDays = diffDays(nextCurrentItem.startDate, requiredStartDate)
      itemsById.set(nextCurrentItem.id, shiftItemByDays(nextCurrentItem, deltaDays))
      enqueue(nextCurrentItem.id)
    })
  }

  return serializeItemsInBaseOrder(baseItems, itemsById)
}

function moveItems(
  baseItems: ScheduleItem[],
  itemIds: string[],
  deltaDays: number,
  dependencies: ScheduleDependency[] = [],
  links: ScheduleLink[] = [],
): ScheduleItem[] {
  if (itemIds.length === 0) return baseItems

  const selectedIds = new Set(itemIds)
  const itemsById = new Map(
    baseItems.map((item) => [
      item.id,
      selectedIds.has(item.id) ? shiftItemByDays(item, deltaDays) : item,
    ] as const),
  )

  return applyRelationshipConstraints(baseItems, itemsById, itemIds, dependencies, links)
}

function moveSummaryRows(
  baseRows: ScheduleRow[],
  rowIds: string[],
  deltaDays: number,
): ScheduleRow[] {
  if (rowIds.length === 0) return baseRows

  const rowIdSet = new Set(rowIds)
  return baseRows.map((row) => {
    if (!rowIdSet.has(row.id) || row.kind !== 'parent-process' || !row.summaryStartDate || !row.summaryEndDate) {
      return row
    }

    return {
      ...row,
      summaryStartDate: shiftDateString(row.summaryStartDate, deltaDays),
      summaryEndDate: shiftDateString(row.summaryEndDate, deltaDays),
    }
  })
}

function resizeItem(
  baseItems: ScheduleItem[],
  itemId: string,
  edge: ResizeEdge,
  deltaDays: number,
  dependencies: ScheduleDependency[] = [],
  links: ScheduleLink[] = [],
): ScheduleItem[] {
  const itemsById = new Map(baseItems.map((item) => [item.id, item] as const))
  const targetItem = itemsById.get(itemId)
  if (!targetItem) return baseItems

  if (edge === 'left') {
    const clampedDelta = Math.min(deltaDays, targetItem.durationDays - 1)
    itemsById.set(itemId, {
      ...targetItem,
      startDate: shiftDateString(targetItem.startDate, clampedDelta),
      durationDays: targetItem.durationDays - clampedDelta,
    })
  } else {
    const nextDurationDays = Math.max(targetItem.durationDays + deltaDays, 1)
    const endDateDelta = nextDurationDays - targetItem.durationDays

    itemsById.set(itemId, {
      ...targetItem,
      durationDays: nextDurationDays,
      endDate: shiftDateString(targetItem.endDate, endDateDelta),
    })
  }

  return applyRelationshipConstraints(baseItems, itemsById, [itemId], dependencies, links)
}

function resizeSummaryRow(
  baseRows: ScheduleRow[],
  rowId: string,
  edge: ResizeEdge,
  deltaDays: number,
): ScheduleRow[] {
  return baseRows.map((row) => {
    if (row.id !== rowId || row.kind !== 'parent-process' || !row.summaryStartDate || !row.summaryEndDate) {
      return row
    }

    const summaryDurationDays = diffDays(row.summaryStartDate, row.summaryEndDate) + 1

    if (edge === 'left') {
      const clampedDelta = Math.min(deltaDays, summaryDurationDays - 1)
      return {
        ...row,
        summaryStartDate: shiftDateString(row.summaryStartDate, clampedDelta),
      }
    }

    const nextDurationDays = Math.max(summaryDurationDays + deltaDays, 1)
    const endDateDelta = nextDurationDays - summaryDurationDays

    return {
      ...row,
      summaryEndDate: shiftDateString(row.summaryEndDate, endDateDelta),
    }
  })
}

export const scheduleService = {
  buildSnapshot,
  loadSnapshot,
  buildTimeline,
  buildShellLayout,
  SCHEDULE_MILESTONE_ROW_ID,
  createCriticalPathDraft,
  createLocalPathId,
  getCriticalPathColor,
  addParentRow,
  addChildRow,
  toggleRowCollapse,
  deleteItems,
  deleteRows,
  createSequentialDependencies,
  createDependency,
  createSequentialLinks,
  createLink,
  createCriticalPath,
  removeDependenciesForItems,
  removeDependenciesByIds,
  removeLinksForItems,
  removeLinksByIds,
  removeCriticalPathsByIds,
  removeConnectedCriticalPathChain,
  createGroup,
  ungroupItems,
  upsertMilestone,
  createItem,
  updateRowColor,
  updateRowName,
  updateItemColor,
  updateItemName,
  getScrollLeftForZoom,
  getInitialScrollLeftForYesterday,
  moveItems,
  moveSummaryRows,
  resizeItem,
  resizeSummaryRow,
}
