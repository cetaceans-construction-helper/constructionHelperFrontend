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
  | { kind: 'canvas'; rowId: string | null; date: string | null }

export type ScheduleContextMenuCommand =
  | 'create-item'
  | 'toggle-dependency'
  | 'toggle-link'
  | 'change-color'
  | 'change-properties'

export type ScheduleContextMenuIcon =
  | 'plus'
  | 'link'
  | 'unlink'
  | 'palette'
  | 'pencil'

export interface ScheduleContextMenuItem {
  id: string
  label: string
  command: ScheduleContextMenuCommand
  icon: ScheduleContextMenuIcon
  disabled?: boolean
  danger?: boolean
}

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
