import type { AttendanceByDateItem, EquipmentDeploymentByDateItem } from '@/features/attendance/public'
import type { DeliveryQuantityByDate } from '@/features/material/public'
import type { WeatherByDateResponse } from '@/shared/network-core/contracts/calendar'
import type { ActualWorkResponse } from '@/shared/network-core/apis/actualWork'
import type { DashboardRepository } from '@/features/dashboard/use-cases/dashboard-repository'

export interface DashboardData {
  weather: WeatherByDateResponse | null
  todayActualWorks: ActualWorkResponse[]
  tomorrowActualWorks: ActualWorkResponse[]
  attendance: AttendanceByDateItem[]
  deliveryQuantities: DeliveryQuantityByDate[]
  equipment: EquipmentDeploymentByDateItem[]
}

export const loadDashboardData = async (
  repository: DashboardRepository,
  todayString: string,
  tomorrowString: string,
): Promise<DashboardData> => {
  const [
    weather,
    attendance,
    deliveryQuantities,
    equipment,
    todayActualWorks,
    tomorrowActualWorks,
  ] = await Promise.all([
    repository.getWeatherByDate(todayString),
    repository.getAttendanceListByDate(todayString),
    repository.getTotalDeliveryQuantityByDate(todayString),
    repository.getEquipmentDeploymentListByDate(todayString),
    repository.getActualWorkListByDate(todayString),
    tomorrowString
      ? repository.getActualWorkListByDate(tomorrowString)
      : Promise.resolve([]),
  ])

  return {
    weather,
    todayActualWorks,
    tomorrowActualWorks,
    attendance,
    deliveryQuantities,
    equipment,
  }
}
