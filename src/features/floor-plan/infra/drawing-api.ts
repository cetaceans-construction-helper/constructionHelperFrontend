import apiClient from '@/shared/network-core/apiClient'

export interface DrawingResponse {
  id: number
  zoneId: number | null
  floorId: number
  imageUrl: string | null
  posX: number
  posY: number
  scaleX: number
  scaleY: number
}

export const drawingApi = {
  async createDrawing(data: { zoneId: number | null; floorId: number }, image?: File): Promise<DrawingResponse> {
    const formData = new FormData()
    formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }))
    if (image) formData.append('image', image)
    const res = await apiClient.post('/drawing/createDrawing', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  async getDrawing(drawingId: number): Promise<DrawingResponse> {
    const res = await apiClient.get(`/drawing/getDrawing/${drawingId}`)
    return res.data
  },

  async getDrawingByLocation(zoneId: number | null, floorId: number): Promise<DrawingResponse> {
    const params: Record<string, number> = { floorId }
    if (zoneId != null) params.zoneId = zoneId
    const res = await apiClient.get('/drawing/getDrawingByLocation', { params })
    return res.data
  },

  async getDrawingList(): Promise<DrawingResponse[]> {
    const res = await apiClient.get('/drawing/getDrawingList')
    return res.data
  },

  async updateDrawing(
    drawingId: number,
    data: { posX?: number; posY?: number; scaleX?: number; scaleY?: number },
    image?: File,
  ): Promise<DrawingResponse> {
    const formData = new FormData()
    formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }))
    if (image) formData.append('image', image)
    const res = await apiClient.put(`/drawing/updateDrawing/${drawingId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  async deleteDrawing(drawingId: number): Promise<void> {
    await apiClient.delete(`/drawing/deleteDrawing/${drawingId}`)
  },
}
