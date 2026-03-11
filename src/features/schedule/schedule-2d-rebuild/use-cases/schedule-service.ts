import type {
  ScheduleContractState,
  ScheduleBarLayout,
  ScheduleDependency,
  ScheduleItem,
  ScheduleItemAppearance,
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
}

interface RowBarDraft {
  id: string
  itemId: string
  rowId: string
  laneIndex: number
  name: string
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

export const SCHEDULE_SHELL_DEFAULTS = {
  rowHeight: 44,
  barHeight: 24,
} as const

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
      })
    } else {
      existingParent.minPositionY = Math.min(existingParent.minPositionY, task.positionY)
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

function buildItems(tasks: ScheduleSourceTask[]): ScheduleItem[] {
  return [...tasks].sort(compareTasks).map((task) => ({
    id: `item:${task.workId}`,
    workId: task.workId,
    rowId: makeChildRowId(task.workType || '미분류 공정', task.subWorkTypeId, task.subWorkType || '세부공정 미분류'),
    name: task.name,
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
      lagDays: link.lagDays,
      pathName: link.pathName,
      color: link.color,
      isCriticalCandidate: link.critical,
    }))
}

function buildSnapshot(bundle: ScheduleSourceBundle): ScheduleSnapshot {
  const rows = buildRows(bundle.tasks)
  const items = buildItems(bundle.tasks)
  const dependencies = buildDependencies(bundle)
  const parentRowCount = rows.filter((row) => row.kind === 'parent-process').length
  const childRowCount = rows.filter((row) => row.kind === 'child-process').length
  const uniquePathCount = new Set(bundle.links.map((link) => link.pathId)).size

  return {
    rows,
    items,
    dependencies,
    groups: [],
    milestones: [],
    pendingContracts,
    metadata: {
      source: bundle.source,
      generatedAt: new Date().toISOString(),
      workCount: bundle.tasks.length,
      pathCount: uniquePathCount,
      dependencyCount: dependencies.length,
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

function buildShellLayout(
  rowsSource: ScheduleRow[],
  items: ScheduleItem[],
  timeline: ScheduleTimelineLayout,
  options: ShellLayoutOptions = {},
): ScheduleShellLayout {
  const rowHeight = options.rowHeight ?? SCHEDULE_SHELL_DEFAULTS.rowHeight
  const barHeight = options.barHeight ?? SCHEDULE_SHELL_DEFAULTS.barHeight
  const itemCountByRow = new Map<string, number>()
  const itemsByRow = new Map<string, ScheduleItem[]>()
  const rowBarDraftsById = new Map<string, RowBarDraft[]>()
  const rowHeightById = new Map<string, number>()
  const rowTopById = new Map<string, number>()
  const verticalPadding = Math.max((rowHeight - barHeight) / 2, 6)
  const laneGap = 6
  const preferredLaneByItemId = options.preferredLaneByItemId ?? {}
  const pinnedLaneByItemId = options.pinnedLaneByItemId ?? {}

  items.forEach((item) => {
    itemCountByRow.set(item.rowId, (itemCountByRow.get(item.rowId) ?? 0) + 1)
    const rowItems = itemsByRow.get(item.rowId) ?? []
    rowItems.push(item)
    itemsByRow.set(item.rowId, rowItems)
  })

  const orderedRows = [...rowsSource].sort((a, b) => a.order - b.order)

  orderedRows.forEach((row) => {
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

        let fallbackLaneIndex = 0
        fallbackLaneIndex = findFirstAvailableLaneForDraft(draft, 0)
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

  let accumulatedTop = 0
  const rows: ScheduleShellRow[] = orderedRows.map((row) => {
    const nextRowHeight = rowHeightById.get(row.id) ?? rowHeight
    rowTopById.set(row.id, accumulatedTop)

    const shellRow = {
      id: row.id,
      name: row.name,
      kind: row.kind,
      depth: row.depth,
      order: row.order,
      top: accumulatedTop,
      height: nextRowHeight,
      itemCount: itemCountByRow.get(row.id) ?? 0,
    }
    accumulatedTop += nextRowHeight
    return shellRow
  })

  const bars: ScheduleBarLayout[] = orderedRows.flatMap((row) => {
    const rowTop = rowTopById.get(row.id)
    if (rowTop === undefined) return []

    return (rowBarDraftsById.get(row.id) ?? []).map((barDraft) => ({
      id: barDraft.id,
      itemId: barDraft.itemId,
      rowId: barDraft.rowId,
      laneIndex: barDraft.laneIndex,
      name: barDraft.name,
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

  return {
    rows,
    bars,
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

function moveItems(
  baseItems: ScheduleItem[],
  itemIds: string[],
  deltaDays: number,
): ScheduleItem[] {
  if (itemIds.length === 0) return baseItems

  const selectedIds = new Set(itemIds)

  return baseItems.map((item) => {
    if (!selectedIds.has(item.id)) return item

    return {
      ...item,
      startDate: shiftDateString(item.startDate, deltaDays),
      endDate: shiftDateString(item.endDate, deltaDays),
    }
  })
}

function resizeItem(
  baseItems: ScheduleItem[],
  itemId: string,
  edge: ResizeEdge,
  deltaDays: number,
): ScheduleItem[] {
  return baseItems.map((item) => {
    if (item.id !== itemId) return item

    if (edge === 'left') {
      const clampedDelta = Math.min(deltaDays, item.durationDays - 1)
      return {
        ...item,
        startDate: shiftDateString(item.startDate, clampedDelta),
        durationDays: item.durationDays - clampedDelta,
      }
    }

    const nextDurationDays = Math.max(item.durationDays + deltaDays, 1)
    const endDateDelta = nextDurationDays - item.durationDays

    return {
      ...item,
      durationDays: nextDurationDays,
      endDate: shiftDateString(item.endDate, endDateDelta),
    }
  })
}

export const scheduleService = {
  buildSnapshot,
  loadSnapshot,
  buildTimeline,
  buildShellLayout,
  getInitialScrollLeftForYesterday,
  moveItems,
  resizeItem,
}
