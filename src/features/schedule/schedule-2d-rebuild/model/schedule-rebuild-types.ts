export type ScheduleContractStatus = 'native' | 'pending-contract'

export type ScheduleRowKind = 'parent-process' | 'child-process'
export type ScheduleRowSourceKind = 'work-type' | 'sub-work-type' | 'mock'
export type ScheduleItemAppearance = 'standard' | 'holiday-off'
export type SchedulePendingContractKind = 'process-hierarchy' | 'group' | 'milestone'
export type ScheduleBarKind = 'item' | 'summary'
export type ScheduleConnectionKind = 'dependency' | 'link' | 'critical-path'
export type ScheduleShellRowKind = ScheduleRowKind | 'milestone'

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

export interface ScheduleSummaryBlock {
  id: string
  name: string
  startDate: string
  endDate: string
}

export interface ScheduleRow {
  id: string
  kind: ScheduleRowKind
  parentId: string | null
  name: string
  colorHex?: string | null
  summaryStartDate?: string | null
  summaryEndDate?: string | null
  summaryBlocks: ScheduleSummaryBlock[]
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
  colorHex?: string | null
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

export interface ScheduleLink {
  id: string
  pathId: number
  sourceItemId: string
  targetItemId: string
  gapDays: number
  pathName: string | null
  color: string
}

export interface ScheduleCriticalPath {
  id: string
  pathId: number
  sourceItemId: string
  targetItemId: string
  colorHex?: string | null
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
  linkCount: number
  criticalPathCount: number
  parentRowCount: number
  childRowCount: number
}

export interface ScheduleSnapshot {
  rows: ScheduleRow[]
  items: ScheduleItem[]
  dependencies: ScheduleDependency[]
  links: ScheduleLink[]
  criticalPaths: ScheduleCriticalPath[]
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
  kind: ScheduleShellRowKind
  collapsed: boolean
  hasChildren: boolean
  depth: number
  order: number
  top: number
  height: number
  itemCount: number
  colorHex?: string | null
  surfaceColorHex?: string | null
  borderColorHex?: string | null
  textColorHex?: string | null
}

export interface ScheduleMilestoneLayout {
  id: string
  date: string
  label: string
  rowId: string | null
  left: number
  top: number
  width: number
  height: number
}

export interface ScheduleBarLayout {
  id: string
  itemId: string
  rowId: string
  summaryBlockId?: string | null
  kind: ScheduleBarKind
  laneIndex: number
  name: string
  colorHex?: string | null
  borderColorHex?: string | null
  textColorHex?: string | null
  rangeMismatchSegments?: Array<{ left: number; width: number }>
  overflowRangeSegments?: Array<{ left: number; width: number }>
  left: number
  top: number
  width: number
  height: number
  startDate: string
  endDate: string
  durationDays: number
  appearance: ScheduleItemAppearance
}

export interface ScheduleConnectionLayout {
  id: string
  kind: ScheduleConnectionKind
  pathId: number
  colorHex: string | null
  sourceItemId: string
  targetItemId: string
  path: string
  label: string | null
  labelX: number
  labelY: number
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
  milestones: ScheduleMilestoneLayout[]
  connections: ScheduleConnectionLayout[]
  chartHeight: number
  rowHeight: number
}
