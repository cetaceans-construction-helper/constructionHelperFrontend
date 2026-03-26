export { useAttendance } from '@/features/attendance/view-model/useAttendance'
export { useEquipmentDeployment } from '@/features/attendance/view-model/useEquipmentDeployment'
export { attendanceApi } from '@/features/attendance/infra/attendance-api'
export { equipmentApi } from '@/features/attendance/infra/equipment-api'
export type {
  AttendanceByDateItem,
  AttendanceEntry,
  Contractor,
  UpdateAttendancePayload,
} from '@/features/attendance/infra/attendance-api'
export type {
  CreateEquipmentDeploymentPayload,
  EquipmentDeploymentByDateItem,
  EquipmentDeploymentEntry,
} from '@/features/attendance/infra/equipment-api'

export { default as AttendanceInputPageView } from '@/features/attendance/ui/AttendanceInputPage.vue'
export { default as WorkerRegisterPageView } from '@/features/attendance/ui/WorkerRegisterPage.vue'
export { default as AttendanceTabView } from '@/features/attendance/ui/components/AttendanceTab.vue'
export { default as LaborInputDialog } from '@/features/attendance/ui/components/LaborInputDialog.vue'
export { default as EquipmentInputDialog } from '@/features/attendance/ui/components/EquipmentInputDialog.vue'

export const attendanceRouteComponents = {
  AttendanceInputPage: () => import('@/features/attendance/ui/AttendanceInputPage.vue'),
  WorkerRegisterPage: () => import('@/features/attendance/ui/WorkerRegisterPage.vue'),
  CumulativeAttendancePage: () => import('@/features/attendance/ui/CumulativeAttendancePage.vue'),
}
