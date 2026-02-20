import apiClient from './apiClient'

// 장비투입 entry
export interface EquipmentDeploymentEntry {
  equipmentSpecId: number
  count: number
  workTime: number
  companyId: string
}

// 장비투입 생성 요청
export interface CreateEquipmentDeploymentPayload {
  date: string
  entries: EquipmentDeploymentEntry[]
}

// 날짜별 장비투입 조회 응답
export interface EquipmentDeploymentByDateItem {
  equipmentSpecId: number
  equipmentSpecName: string
  equipmentTypeId: number
  equipmentTypeName: string
  count: number
  workTime: number
  companyId: string
  companyDisplayName: string
}

export const equipmentApi = {
  // 장비투입 저장
  async createEquipmentDeployment(payload: CreateEquipmentDeploymentPayload): Promise<void> {
    await apiClient.post('/equipment/createEquipmentDeployment', payload)
  },

  // 날짜별 장비투입 조회
  async getEquipmentDeploymentListByDate(date: string): Promise<EquipmentDeploymentByDateItem[]> {
    const { data } = await apiClient.get<EquipmentDeploymentByDateItem[]>(
      '/equipment/getEquipmentDeploymentListByDate',
      { params: { date } },
    )
    return data
  },
}
