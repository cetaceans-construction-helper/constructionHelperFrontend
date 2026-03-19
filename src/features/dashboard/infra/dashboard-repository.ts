import { attendanceApi, equipmentApi } from '@/features/attendance/public'
import { materialOrderApi } from '@/features/material/public'
import { calendarApi } from '@/shared/network-core/apis/calendar'
import { workApi } from '@/shared/network-core/apis/work'
import type { DashboardRepository } from '@/features/dashboard/use-cases/dashboard-repository'

export const dashboardRepository: DashboardRepository = {
  getWeatherByDate: (date) => calendarApi.getWeatherByDate(date).catch(() => null),
  get2DaysWorkListByDate: (date) => workApi.get2DaysWorkListByDate(date),
  get2DaysWorkListByDateWithNoCheck: (date) => workApi.get2DaysWorkListByDateWithNoCheck(date),
  getAttendanceListByDate: (date) => attendanceApi.getAttendanceListByDate(date),
  getTotalDeliveryQuantityByDate: (date) => materialOrderApi.getTotalDeliveryQuantityByDate(date),
  getEquipmentDeploymentListByDate: (date) => equipmentApi.getEquipmentDeploymentListByDate(date),
  getWorkListByDate: (date) => workApi.getWorkListByDate(date),
  downloadWorkPhoto: (url) => workApi.downloadWorkPhoto(url),
  createWorkPhoto: async (workId, date, files, descriptions) => {
    await workApi.createWorkPhoto(workId, date, files, descriptions)
  },
}
