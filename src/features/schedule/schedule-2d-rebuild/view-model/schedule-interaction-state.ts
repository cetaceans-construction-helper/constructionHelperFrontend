export interface ScheduleSelectionState {
  rowIds: string[]
  itemIds: string[]
  dependencyIds: string[]
  linkIds: string[]
  criticalPathIds: string[]
  groupIds: string[]
  milestoneIds: string[]
}

export type ScheduleContextMenuTarget =
  | { kind: 'row'; rowId: string }
  | { kind: 'item'; itemId: string }
  | { kind: 'dependency'; dependencyId: string }
  | { kind: 'link'; linkId: string }
  | { kind: 'critical-path'; criticalPathId: string }
  | { kind: 'group'; groupId: string }
  | { kind: 'milestone'; milestoneId: string }
  | { kind: 'canvas'; rowId: string | null; date: string | null }

export type ScheduleContextMenuCommand =
  | 'create-milestone'
  | 'create-item'
  | 'delete-item'
  | 'toggle-dependency'
  | 'remove-dependency'
  | 'toggle-link'
  | 'remove-link'
  | 'toggle-critical-path'
  | 'remove-critical-path'
  | 'remove-critical-path-chain'
  | 'change-color'
  | 'change-properties'

export type ScheduleContextMenuIcon =
  | 'plus'
  | 'trash'
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
    linkIds: [],
    criticalPathIds: [],
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
