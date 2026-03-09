import type { AttendanceByDateItem, EquipmentDeploymentByDateItem } from '@/features/attendance/public'
import type { DeliveryQuantityByDate } from '@/features/material/public'
import type { WeatherByDateResponse } from '@/shared/network-core/contracts/calendar'
import type { WorkResponse } from '@/shared/network-core/apis/work'
import type { DashboardRepository } from '@/features/dashboard/use-cases/dashboard-repository'

export interface DashboardData {
  weather: WeatherByDateResponse | null
  todayWorks: WorkResponse[]
  tomorrowWorks: WorkResponse[]
  nextWorkDateLabel: string
  simpleTomorrowWorks: WorkResponse[]
  simpleTomorrowDateLabel: string
  attendance: AttendanceByDateItem[]
  deliveryQuantities: DeliveryQuantityByDate[]
  equipment: EquipmentDeploymentByDateItem[]
}

export const loadDashboardData = async (
  repository: DashboardRepository,
  todayString: string,
): Promise<DashboardData> => {
  const [weather, twoDaysWork, simpleTwoDaysWork, attendance, deliveryQuantities, equipment] = await Promise.all([
    repository.getWeatherByDate(todayString),
    repository.get2DaysWorkListByDate(todayString),
    repository.get2DaysWorkListByDateWithNoCheck(todayString),
    repository.getAttendanceListByDate(todayString),
    repository.getTotalDeliveryQuantityByDate(todayString),
    repository.getEquipmentDeploymentListByDate(todayString),
  ])

  const todayWorks = twoDaysWork.dates[0]?.works ?? []
  const tomorrowWorks = twoDaysWork.dates[1]?.works ?? []
  const simpleTomorrowWorks = simpleTwoDaysWork.dates[1]?.works ?? []

  const dayNames = ['일', '월', '화', '수', '목', '금', '토']

  let nextWorkDateLabel = ''
  const nextDateStr = twoDaysWork.dates[1]?.date
  if (nextDateStr) {
    const d = new Date(nextDateStr)
    nextWorkDateLabel = `${d.getMonth() + 1}월 ${d.getDate()}일 (${dayNames[d.getDay()]})`
  }

  let simpleTomorrowDateLabel = ''
  const simpleDateStr = simpleTwoDaysWork.dates[1]?.date
  if (simpleDateStr) {
    const d = new Date(simpleDateStr)
    simpleTomorrowDateLabel = `${d.getMonth() + 1}월 ${d.getDate()}일 (${dayNames[d.getDay()]})`
  }

  return {
    weather,
    todayWorks,
    tomorrowWorks,
    nextWorkDateLabel,
    simpleTomorrowWorks,
    simpleTomorrowDateLabel,
    attendance,
    deliveryQuantities,
    equipment,
  }
}
