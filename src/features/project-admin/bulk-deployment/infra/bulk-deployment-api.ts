import apiClient from '@/shared/network-core/apiClient'

export interface BulkAttendanceEntry {
  laborTypeId: number
  totalCount: number
}

export interface BulkEquipmentEntry {
  equipmentSpecId: number
  workTypeId: number
  totalCount: number
}

export interface BulkDeploymentPayload {
  startDate: string
  endDate: string
  attendanceEntries: BulkAttendanceEntry[]
  equipmentEntries: BulkEquipmentEntry[]
}

export const bulkDeploymentApi = {
  async createBulkDeployment(payload: BulkDeploymentPayload): Promise<void> {
    await apiClient.post('/bulk/createBulkDeployment', payload)
  },
}
