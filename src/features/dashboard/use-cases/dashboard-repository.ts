import type { AttendanceByDateItem, EquipmentDeploymentByDateItem } from '@/features/attendance/public'
import type { DeliveryQuantityByDate } from '@/features/material/public'
import type { WeatherByDateResponse } from '@/shared/network-core/contracts/calendar'
import type { TwoDaysWorkListResponse, WorkResponse } from '@/shared/network-core/apis/work'

export interface DashboardRepository {
  getWeatherByDate(date: string): Promise<WeatherByDateResponse | null>
  get2DaysWorkListByDate(date: string): Promise<TwoDaysWorkListResponse>
  get2DaysWorkListByDateWithNoCheck(date: string): Promise<TwoDaysWorkListResponse>
  getAttendanceListByDate(date: string): Promise<AttendanceByDateItem[]>
  getTotalDeliveryQuantityByDate(date: string): Promise<DeliveryQuantityByDate[]>
  getEquipmentDeploymentListByDate(date: string): Promise<EquipmentDeploymentByDateItem[]>
  getWorkListByDate(date: string): Promise<WorkResponse[]>
  downloadWorkPhoto(url: string): Promise<string>
  createWorkPhoto(workId: number, date: string, files: File[], descriptions?: string[]): Promise<void>
}
