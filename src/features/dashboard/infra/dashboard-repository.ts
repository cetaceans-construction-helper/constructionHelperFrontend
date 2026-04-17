import { attendanceApi, equipmentApi } from '@/features/attendance/public'
import { materialOrderApi } from '@/features/material/public'
import { calendarApi } from '@/shared/network-core/apis/calendar'
import { workApi } from '@/shared/network-core/apis/work'
import { actualWorkApi } from '@/shared/network-core/apis/actualWork'
import type { DashboardRepository } from '@/features/dashboard/use-cases/dashboard-repository'

export const dashboardRepository: DashboardRepository = {
  getWeatherByDate: (date) => calendarApi.getWeatherByDate(date).catch(() => null),
  // 다음 작업일 판정 용도 (works 배열은 무시)
  get2DaysWorkListByDate: (date) => workApi.get2DaysWorkListByDate(date),
  get2DaysWorkListByDateWithNoCheck: (date) => workApi.get2DaysWorkListByDateWithNoCheck(date),
  getAttendanceListByDate: (date) => attendanceApi.getAttendanceListByDate(date),
  getTotalDeliveryQuantityByDate: (date) => materialOrderApi.getTotalDeliveryQuantityByDate(date),
  getEquipmentDeploymentListByDate: (date) => equipmentApi.getEquipmentDeploymentListByDate(date),
  // ActualWork
  getActualWorkListByDate: (date) => actualWorkApi.getActualWorkListByDate(date),
  createActualWork: (payload) => actualWorkApi.createActualWork(payload),
  updateActualWork: (id, payload) => actualWorkApi.updateActualWork(id, payload),
  deleteActualWork: (id) => actualWorkApi.deleteActualWork(id),
  getNextDateWithActualWorkChecker: (date) => actualWorkApi.getNextDateWithActualWorkChecker(date),
}
