import apiClient from '@/shared/network-core/apiClient'

export interface Object2DResponse {
  id: number
  drawingId: number
  componentCodeId: number | null
  componentCode: string | null
  componentTypeId: number | null
  componentTypeName: string | null
  isStructure: boolean | null
  ltX: number
  ltY: number
  rbX: number
  rbY: number
  axisLabel: string | null
}

export const object2dApi = {
  async createObject2d(data: {
    drawingId: number
    ltX: number
    ltY: number
    rbX: number
    rbY: number
  }): Promise<Object2DResponse> {
    const res = await apiClient.post('/object2d/createObject2d', data)
    return res.data
  },

  async getObject2dList(drawingId: number): Promise<Object2DResponse[]> {
    const res = await apiClient.get('/object2d/getObject2dList', { params: { drawingId } })
    return res.data
  },

  async updateObject2dList(data: {
    objectIds: number[]
    ltX?: number
    ltY?: number
    rbX?: number
    rbY?: number
    componentCodeId?: number
  }): Promise<void> {
    await apiClient.put('/object2d/updateObject2dList', data)
  },

  async deleteObject2d(object2dId: number): Promise<void> {
    await apiClient.delete(`/object2d/deleteObject2d/${object2dId}`)
  },
}
