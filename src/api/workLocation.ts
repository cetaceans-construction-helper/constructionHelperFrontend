import apiClient from './apiClient'
import type { IdNameResponse } from './subWorkType'

export const workLocationApi = {
  // GET - 목록 조회
  async getZoneList(): Promise<IdNameResponse[]> {
    const { data } = await apiClient.get<IdNameResponse[]>('/workLocation/getZoneList')
    return data
  },

  async getFloorList(): Promise<IdNameResponse[]> {
    const { data } = await apiClient.get<IdNameResponse[]>('/workLocation/getFloorList')
    return data
  },

  async getSectionList(): Promise<IdNameResponse[]> {
    const { data } = await apiClient.get<IdNameResponse[]>('/workLocation/getSectionList')
    return data
  },

  async getUsageList(): Promise<IdNameResponse[]> {
    const { data } = await apiClient.get<IdNameResponse[]>('/workLocation/getUsageList')
    return data
  },

  // POST - 생성
  async createZone(name: string): Promise<IdNameResponse> {
    const { data } = await apiClient.post<IdNameResponse>('/workLocation/createZone', { name })
    return data
  },

  async createFloor(name: string): Promise<IdNameResponse> {
    const { data } = await apiClient.post<IdNameResponse>('/workLocation/createFloor', { name })
    return data
  },

  async createSection(name: string): Promise<IdNameResponse> {
    const { data } = await apiClient.post<IdNameResponse>('/workLocation/createSection', { name })
    return data
  },

  async createUsage(name: string): Promise<IdNameResponse> {
    const { data } = await apiClient.post<IdNameResponse>('/workLocation/createUsage', { name })
    return data
  },
}
