import apiClient from '@/shared/network-core/apiClient'

export interface DrawingAxisResponse {
  id: number
  isX: boolean
  name: string
  position: number
}

export const drawingAxisApi = {
  async createDrawingAxis(data: { isX: boolean; name: string; position: number }[]): Promise<DrawingAxisResponse[]> {
    const res = await apiClient.post('/drawingAxis/createDrawingAxis', data)
    return res.data
  },

  async getDrawingAxisList(): Promise<DrawingAxisResponse[]> {
    const res = await apiClient.get('/drawingAxis/getDrawingAxisList')
    return res.data
  },

  async updateDrawingAxis(data: { id: number; name?: string; position?: number }[]): Promise<DrawingAxisResponse[]> {
    const res = await apiClient.put('/drawingAxis/updateDrawingAxis', data)
    return res.data
  },

  async deleteDrawingAxis(axisId: number): Promise<void> {
    await apiClient.delete(`/drawingAxis/deleteDrawingAxis/${axisId}`)
  },
}
