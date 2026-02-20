import apiClient from './apiClient'

export interface MaterialOrderLineResponse {
  id: number
  taskId: number
  materialSpecId: number
  materialSpecName: string
  componentCodeId: number
  zoneId: number | null
  zoneName: string | null
  floorId: number | null
  floorName: string | null
  sectionId: number | null
  sectionName: string | null
  usageId: number | null
  usageName: string | null
  quantity: number
}

export interface MaterialOrderResponse {
  id: number
  orderNo: string
  orderStatus: string
  materialTypeId: number
  materialTypeName: string
  unit: string
  totalQuantity: number
  orderedAt: string | null
  createdAt: string
  orderLines: MaterialOrderLineResponse[]
}

export const materialOrderApi = {
  async createMaterialOrder(
    object3dIds: number[],
    materialTypeId: number,
  ): Promise<MaterialOrderResponse> {
    const { data } = await apiClient.post<MaterialOrderResponse>(
      '/materialOrder/createMaterialOrder',
      { object3dIds, materialTypeId },
    )
    return data
  },

  async getMaterialOrderList(): Promise<MaterialOrderResponse[]> {
    const { data } = await apiClient.get<MaterialOrderResponse[]>(
      '/materialOrder/getMaterialOrderList',
    )
    return data
  },

  async getMaterialOrder(orderId: number): Promise<MaterialOrderResponse> {
    const { data } = await apiClient.get<MaterialOrderResponse>(
      `/materialOrder/getMaterialOrder/${orderId}`,
    )
    return data
  },
}
