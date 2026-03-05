import type {
  AttendanceByDateItem,
  EquipmentDeploymentByDateItem,
} from '@/features/attendance/public'
import type { WorkPhotoResponse } from '@/api/work'

export interface PhotoWithWork {
  photo: WorkPhotoResponse
  workName: string
}

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

export interface WorkPhotoDialogExpose {
  openDialog(photo: WorkPhotoResponse, imgUrl: string): void
}
