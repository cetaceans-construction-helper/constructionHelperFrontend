export type ScheduleContractStatus = 'native' | 'pending-contract'

export type ScheduleRowKind = 'parent-process' | 'child-process'
export type ScheduleRowSourceKind = 'work-type' | 'sub-work-type' | 'mock'
export type ScheduleItemAppearance = 'standard' | 'holiday-off'
export type SchedulePendingContractKind = 'process-hierarchy' | 'group' | 'milestone'
export type ScheduleBarKind = 'item' | 'summary'

export interface ScheduleContractState {
  status: ScheduleContractStatus
  reason?: string
}

export interface ScheduleRowSource {
  kind: ScheduleRowSourceKind
  derivedFrom: string
  workType?: string
  subWorkType?: string
  subWorkTypeId?: number
}

export interface ScheduleRow {
  id: string
  kind: ScheduleRowKind
  parentId: string | null
  name: string
  order: number
  depth: number
  collapsed: boolean
  source: ScheduleRowSource
  contract: ScheduleContractState
}

export interface ScheduleItem {
  id: string
  workId: number
  rowId: string
  name: string
  startDate: string
  endDate: string
  durationDays: number
  positionY: number
  appearance: ScheduleItemAppearance
  division: string
  workType: string
  subWorkType: string
  annotation?: string
}

export interface ScheduleDependency {
  id: string
  pathId: number
  sourceItemId: string
  targetItemId: string
  lagDays: number | null
  pathName: string | null
  color: string
  isCriticalCandidate: boolean
}

export interface ScheduleGroup {
  id: string
  name: string
  parentGroupId: string | null
  itemIds: string[]
  contract: ScheduleContractState
}

export interface ScheduleMilestone {
  id: string
  date: string
  label: string
  rowId: string | null
  contract: ScheduleContractState
}

export interface SchedulePendingContract {
  id: string
  kind: SchedulePendingContractKind
  title: string
  description: string
}

export interface ScheduleSourceTask {
  workId: number
  name: string
  startDate: string
  endDate: string
  durationDays: number
  division: string
  workType: string
  subWorkType: string
  subWorkTypeId: number
  positionY: number
  isWorkingOnHoliday: boolean
  annotation?: string
}

export interface ScheduleSourceLink {
  pathId: number
  sourceWorkId: number
  targetWorkId: number
  lagDays: number | null
  pathName: string | null
  color: string
  critical: boolean
}

export interface ScheduleSourceBundle {
  tasks: ScheduleSourceTask[]
  links: ScheduleSourceLink[]
  source: 'work-and-path-api'
}

export interface ScheduleSnapshotMetadata {
  source: 'work-and-path-api'
  generatedAt: string
  workCount: number
  pathCount: number
  dependencyCount: number
  parentRowCount: number
  childRowCount: number
}

export interface ScheduleSnapshot {
  rows: ScheduleRow[]
  items: ScheduleItem[]
  dependencies: ScheduleDependency[]
  groups: ScheduleGroup[]
  milestones: ScheduleMilestone[]
  pendingContracts: SchedulePendingContract[]
  metadata: ScheduleSnapshotMetadata
}

export interface ScheduleTimelineCell {
  key: string
  index: number
  date: string
  label: string
  dayOfMonth: number
  dayName: string
  monthLabel: string
  yearLabel: string
  left: number
  width: number
  isToday: boolean
  isWeekend: boolean
}

export interface ScheduleTimelineGroup {
  key: string
  label: string
  startIndex: number
  span: number
  left: number
  width: number
}

export interface ScheduleShellRow {
  id: string
  parentId: string | null
  name: string
  kind: ScheduleRowKind
  collapsed: boolean
  hasChildren: boolean
  depth: number
  order: number
  top: number
  height: number
  itemCount: number
}

export interface ScheduleBarLayout {
  id: string
  itemId: string
  rowId: string
  kind: ScheduleBarKind
  laneIndex: number
  name: string
  left: number
  top: number
  width: number
  height: number
  startDate: string
  endDate: string
  durationDays: number
  appearance: ScheduleItemAppearance
}

export interface ScheduleTimelineLayout {
  startDate: string
  endDate: string
  dayWidth: number
  chartWidth: number
  days: ScheduleTimelineCell[]
  monthGroups: ScheduleTimelineGroup[]
  yearGroups: ScheduleTimelineGroup[]
}

export interface ScheduleShellLayout {
  rows: ScheduleShellRow[]
  bars: ScheduleBarLayout[]
  chartHeight: number
  rowHeight: number
}
