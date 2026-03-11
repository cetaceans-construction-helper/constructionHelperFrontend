import { workApi } from '@/shared/network-core/apis/work'
import { workPathApi } from '@/shared/network-core/apis/workPath'
import { adaptWorkPathApiData } from '@/features/schedule/schedule-2d-rebuild/infra/schedule-rebuild-adapter'
import { scheduleService, type ScheduleSnapshotRepository } from '@/features/schedule/schedule-2d-rebuild/use-cases/schedule-service'

export const schedule2dRebuildRepository: ScheduleSnapshotRepository = {
  async getScheduleSnapshot() {
    const [works, paths] = await Promise.all([workApi.getWorkList(), workPathApi.getPathList()])
    const sourceBundle = adaptWorkPathApiData(works, paths)
    return scheduleService.buildSnapshot(sourceBundle)
  },
}
