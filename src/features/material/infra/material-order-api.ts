import apiClient from '@/shared/network-core/apiClient'
import type {
  CreateDeliveryResponse,
  DeliveryLineResponse,
  DeliveryQuantityByDate,
  MaterialDeliverySummary,
  MaterialOrderResponse,
} from '@/features/material/model/material-order-types'

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

  async deleteMaterialOrder(orderId: number): Promise<void> {
    await apiClient.delete(`/materialOrder/deleteMaterialOrder/${orderId}`)
  },

  async createMaterialDelivery(params: {
    materialTypeId: number
    workTypeId?: number
    deliveryNotes: File[]
    deliveryPhotos: File[]
    zoneIds: number[]
    floorIds: number[]
  }): Promise<CreateDeliveryResponse> {
    const formData = new FormData()
    formData.append(
      'data',
      new Blob(
        [JSON.stringify({
          materialTypeId: params.materialTypeId,
          workTypeId: params.workTypeId,
          zoneIds: params.zoneIds,
          floorIds: params.floorIds,
        })],
        { type: 'application/json' },
      ),
    )
    params.deliveryNotes.forEach((file) => formData.append('deliveryNotes', file))
    params.deliveryPhotos.forEach((file) => formData.append('deliveryPhotos', file))

    const { data } = await apiClient.post<CreateDeliveryResponse>(
      '/materialDelivery/createMaterialDelivery',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
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
      supplier?: string
      deliveryDate?: string
      workTypeId?: number
      zoneIds?: number[]
      floorIds?: number[]
      sectionIds?: number[]
      addLines?: { manufacturer?: string; specId?: number; quantity?: string }[]
      updateLines?: { deliveryLineId: number; manufacturer?: string; specId?: number; quantity?: string }[]
      deleteLineIds?: number[]
      noteDescriptions?: { noteId: number; description: string }[]
      photoDescriptions?: { photoId: number; description: string }[]
      deleteNoteIds?: number[]
      deletePhotoIds?: number[]
      replaceNotes?: { noteId: number; fileIndex: number }[]
      replacePhotos?: { photoId: number; fileIndex: number }[]
    },
    files?: {
      deliveryNotes?: File[]
      deliveryPhotos?: File[]
      replaceNoteFiles?: File[]
      replacePhotoFiles?: File[]
    },
  ): Promise<void> {
    const formData = new FormData()
    formData.append(
      'data',
      new Blob([JSON.stringify(body)], { type: 'application/json' }),
    )
    files?.deliveryNotes?.forEach((file) => formData.append('deliveryNotes', file))
    files?.deliveryPhotos?.forEach((file) => formData.append('deliveryPhotos', file))
    files?.replaceNoteFiles?.forEach((file) => formData.append('replaceNoteFiles', file))
    files?.replacePhotoFiles?.forEach((file) => formData.append('replacePhotoFiles', file))
    await apiClient.put(
      `/materialDelivery/updateMaterialDelivery/${deliveryId}`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      },
    )
  },

  async getMaterialDeliveryTotalQuantityList(): Promise<
    { materialDeliveryId: number; totalQuantity: number; unit: string | null }[]
  > {
    const { data } = await apiClient.get<
      { materialDeliveryId: number; totalQuantity: number; unit: string | null }[]
    >('/materialDelivery/getMaterialDeliveryTotalQuantityList')
    return data
  },

  async getDeliveryNoteImage(url: string): Promise<string> {
    const { data } = await apiClient.get<{ url: string }>('/file/downloadFile', {
      params: { url },
    })
    return data.url
  },
}
