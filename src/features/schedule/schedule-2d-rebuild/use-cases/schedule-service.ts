import type {
  ScheduleContractState,
  ScheduleDependency,
  ScheduleItem,
  SchedulePendingContract,
  ScheduleRow,
  ScheduleSnapshot,
  ScheduleSourceBundle,
  ScheduleSourceTask,
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

export const scheduleService = {
  buildSnapshot,
  loadSnapshot,
}
