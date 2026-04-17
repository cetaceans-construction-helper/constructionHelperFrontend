import type { AttendanceByDateItem, EquipmentDeploymentByDateItem } from '@/features/attendance/public'
import type { DeliveryQuantityByDate } from '@/features/material/public'
import type { WeatherByDateResponse } from '@/shared/network-core/contracts/calendar'
import type { TwoDaysWorkListResponse } from '@/shared/network-core/apis/work'
import type {
  ActualWorkResponse,
  CreateActualWorkPayload,
  UpdateActualWorkPayload,
} from '@/shared/network-core/apis/actualWork'

export interface DashboardRepository {
  getWeatherByDate(date: string): Promise<WeatherByDateResponse | null>
  // 작업일보 영역은 다음 작업일 날짜 판정 용도로만 사용 (응답의 works 배열은 무시)
  get2DaysWorkListByDate(date: string): Promise<TwoDaysWorkListResponse>
  get2DaysWorkListByDateWithNoCheck(date: string): Promise<TwoDaysWorkListResponse>
  getAttendanceListByDate(date: string): Promise<AttendanceByDateItem[]>
  getTotalDeliveryQuantityByDate(date: string): Promise<DeliveryQuantityByDate[]>
  getEquipmentDeploymentListByDate(date: string): Promise<EquipmentDeploymentByDateItem[]>
  // ActualWork
  getActualWorkListByDate(date: string): Promise<ActualWorkResponse[]>
  createActualWork(payload: CreateActualWorkPayload): Promise<ActualWorkResponse>
  updateActualWork(id: number, payload: UpdateActualWorkPayload): Promise<ActualWorkResponse>
  deleteActualWork(id: number): Promise<void>
  getNextDateWithActualWorkChecker(date: string): Promise<{ date: string }>
}
