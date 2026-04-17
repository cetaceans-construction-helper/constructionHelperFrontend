import type {
  AttendanceByDateItem,
  EquipmentDeploymentByDateItem,
} from '@/features/attendance/public'
import type { ActualWorkResponse } from '@/shared/network-core/apis/actualWork'

export interface AttendanceGroup {
  workTypeName: string
  companyDisplayName: string
  totalCount: number
  items: AttendanceByDateItem[]
}

export interface EquipmentGroup {
  companyDisplayName: string
  totalCount: number
  items: EquipmentDeploymentByDateItem[]
}

// 공종별 actualWork 그룹 (key = workTypeId)
export interface ActualWorkGroup {
  workTypeName: string
  items: ActualWorkResponse[]
}
