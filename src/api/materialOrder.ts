import apiClient from './apiClient'

export interface MaterialOrderLineResponse {
  id: number
  taskId: number
  object3dId: number | null
  materialSpecId: number
  materialSpecName: string
  componentCodeId: number
  componentCodeName: string | null
  workStepId: number | null
  workStepName: string | null
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

export interface SpecSummary {
  materialSpecId: number
  materialSpecName: string
  quantity: number
}

export interface MaterialOrderResponse {
  id: number
  orderNo: string
  orderStatus: string
  materialTypeId: number
  materialTypeName: string
  unit: string
  workTypeId: number
  workTypeName: string
  totalQuantity: number
  specSummary: SpecSummary[]
  orderedAt: string | null
  createdAt: string
  orderLines: MaterialOrderLineResponse[]
}

export interface DeliveryFileInfo {
  noteId?: number
  photoId?: number
  url: string
  description: string
}

export interface MaterialDeliverySummary {
  materialDeliveryId: number
  materialOrderId: number
  materialOrderNumber: string
  supplier: string
  deliveryDate: string
  location: string | null
  noteFiles: DeliveryFileInfo[]
  photoFiles: DeliveryFileInfo[]
  unit: string
}

export interface CreateDeliveryResponse {
  materialDeliveryId: number
}

export interface DeliveryLineResponse {
  deliveryLineId: number
  manufacturer: string | null
  materialSpecId: number | null
  materialSpecName: string | null
  specValidation: boolean
  quantity: number
}

export interface DeliveryQuantityByDate {
  materialTypeName: string
  materialSpecName: string
  totalQuantity: number
  unit: string
  workTypeName: string | null
}

export const materialOrderApi = {
  async createMaterialOrder(
    object3dIds: number[],
    materialTypeId: number,
    workTypeId: number,
  ): Promise<MaterialOrderResponse> {
    const { data } = await apiClient.post<MaterialOrderResponse>(
      '/materialOrder/createMaterialOrder',
      { object3dIds, materialTypeId, workTypeId },
    )
    return data
  },

  async getTotalDeliveryQuantityByDate(date: string): Promise<DeliveryQuantityByDate[]> {
    const { data } = await apiClient.get<DeliveryQuantityByDate[]>(
      '/materialDelivery/getTotalDeliveryQuantityByDate',
      { params: { date } },
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

  async createMaterialDelivery(params: {
    orderId?: number
    materialTypeId: number
    workTypeId?: number
    deliveryNotes: File[]
    deliveryPhotos: File[]
    zoneIds: number[]
    floorIds: number[]
    sectionIds: number[]
    usageIds: number[]
  }): Promise<CreateDeliveryResponse> {
    const formData = new FormData()
    params.deliveryNotes.forEach((file) => formData.append('deliveryNotes', file))
    params.deliveryPhotos.forEach((file) => formData.append('deliveryPhotos', file))
    params.zoneIds.forEach((id) => formData.append('zoneIds', String(id)))
    params.floorIds.forEach((id) => formData.append('floorIds', String(id)))
    params.sectionIds.forEach((id) => formData.append('sectionIds', String(id)))
    params.usageIds.forEach((id) => formData.append('usageIds', String(id)))

    const queryParams: Record<string, string> = {
      materialTypeId: String(params.materialTypeId),
    }
    if (params.orderId != null) queryParams.orderId = String(params.orderId)
    if (params.workTypeId != null) queryParams.workTypeId = String(params.workTypeId)

    const { data } = await apiClient.post<CreateDeliveryResponse>(
      '/materialDelivery/createMaterialDelivery',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
        params: queryParams,
      },
    )
    return data
  },

  async deleteMaterialDelivery(deliveryId: number): Promise<void> {
    await apiClient.delete(`/materialDelivery/deleteMaterialDelivery/${deliveryId}`)
  },

  async getMaterialDeliveryList(): Promise<MaterialDeliverySummary[]> {
    const { data } = await apiClient.get<MaterialDeliverySummary[]>(
      '/materialDelivery/getMaterialDeliveryList',
    )
    return data
  },

  async getMaterialDeliveryLineList(
    materialDeliveryId: number,
  ): Promise<DeliveryLineResponse[]> {
    const { data } = await apiClient.get<DeliveryLineResponse[]>(
      '/materialDelivery/getMaterialDeliveryLineList',
      { params: { materialDeliveryId } },
    )
    return data
  },

  async updateMaterialDelivery(
    deliveryId: number,
    body: {
      supplier: string
      deliveryDate: string
      location?: string | null
      deliveryLines: {
        deliveryLineId: number | null
        manufacturer: string | null
        specId: number | null
        quantity: string
      }[]
      noteDescriptions?: { noteId: number; description: string }[]
      photoDescriptions?: { photoId: number; description: string }[]
    },
  ): Promise<void> {
    await apiClient.put(
      `/materialDelivery/updateMaterialDelivery/${deliveryId}`,
      body,
    )
  },

  async getDeliveryNoteImage(url: string): Promise<string> {
    const { data } = await apiClient.get<Blob>('/materialDelivery/downloadFile', {
      params: { url },
      responseType: 'blob',
    })
    return URL.createObjectURL(data)
  },
}
