import type { PathResponse } from '@/shared/network-core/apis/workPath'
import type { WorkResponse } from '@/shared/network-core/apis/work'
import type {
  ScheduleSourceBundle,
  ScheduleSourceLink,
  ScheduleSourceTask,
} from '@/features/schedule/schedule-2d-rebuild/model/schedule-rebuild-types'

function calculateDurationDays(work: WorkResponse): number {
  const start = new Date(work.startDate)
  const end = new Date(work.completionDate)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  const diffDays = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
  return Number.isFinite(diffDays) && diffDays > 0 ? diffDays : Math.max(work.workLeadTime, 1)
}

function adaptWork(work: WorkResponse): ScheduleSourceTask {
  return {
    workId: work.workId,
    name: work.workName,
    startDate: work.startDate,
    endDate: work.completionDate,
    durationDays: calculateDurationDays(work),
    division: work.division,
    workType: work.workType || '미분류 공정',
    subWorkType: work.subWorkType || '세부공정 미분류',
    subWorkTypeId: work.subWorkTypeId,
    positionY: work.positionY,
    isWorkingOnHoliday: work.isWorkingOnHoliday,
    annotation: work.annotation,
  }
}

function adaptPath(path: PathResponse): ScheduleSourceLink[] {
  return path.edges.map((edge) => ({
    pathId: path.workPathId,
    sourceWorkId: edge.sourceWorkId,
    targetWorkId: edge.targetWorkId,
    lagDays: edge.lagDays ?? null,
    pathName: path.workPathName,
    color: path.workPathColor,
    critical: path.critical,
  }))
}

export function adaptWorkPathApiData(works: WorkResponse[], paths: PathResponse[]): ScheduleSourceBundle {
  return {
    tasks: works.map(adaptWork),
    links: paths.flatMap(adaptPath),
    source: 'work-and-path-api',
  }
}
