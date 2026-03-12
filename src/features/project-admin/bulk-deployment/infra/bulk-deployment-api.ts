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

export const bulkDeploymentApi = {
  async createBulkAttendance(payload: { startDate: string; endDate: string; entries: BulkAttendanceEntry[] }): Promise<void> {
    await apiClient.post('/bulk/createBulkAttendance', payload)
  },

  async createBulkEquipment(payload: { startDate: string; endDate: string; entries: BulkEquipmentEntry[] }): Promise<void> {
    await apiClient.post('/bulk/createBulkEquipment', payload)
  },
}
