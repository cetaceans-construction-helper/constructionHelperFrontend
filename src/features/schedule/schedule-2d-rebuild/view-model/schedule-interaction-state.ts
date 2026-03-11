export interface ScheduleSelectionState {
  rowIds: string[]
  itemIds: string[]
  dependencyIds: string[]
  groupIds: string[]
  milestoneIds: string[]
}

export type ScheduleContextMenuTarget =
  | { kind: 'row'; rowId: string }
  | { kind: 'item'; itemId: string }
  | { kind: 'dependency'; dependencyId: string }
  | { kind: 'group'; groupId: string }
  | { kind: 'milestone'; milestoneId: string }
  | { kind: 'canvas' }

export interface ScheduleContextMenuState {
  open: boolean
  x: number
  y: number
  target: ScheduleContextMenuTarget | null
}

export function createEmptyScheduleSelectionState(): ScheduleSelectionState {
  return {
    rowIds: [],
    itemIds: [],
    dependencyIds: [],
    groupIds: [],
    milestoneIds: [],
  }
}

export function createClosedScheduleContextMenuState(): ScheduleContextMenuState {
  return {
    open: false,
    x: 0,
    y: 0,
    target: null,
  }
}
