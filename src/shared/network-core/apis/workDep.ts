import apiClient from '@/shared/network-core/apiClient'
import type { MutationResponse } from './work'

export interface WorkDepResponse {
  id: number
  sourceWorkId: number
  targetWorkId: number
  lagDays: number | null
  scheduleVersionId: number
}

export interface CreateWorkDepRequest {
  sourceWorkId: number
  targetWorkId: number
  lagDays: number | null
  scheduleVersionId: number
}

export const workDepApi = {
  async getWorkDepListByVersion(scheduleVersionId: number): Promise<WorkDepResponse[]> {
    const { data } = await apiClient.get<WorkDepResponse[]>('/workDep/getWorkDepListByVersion', {
      params: { scheduleVersionId },
    })
    return data
  },

  async createWorkDep(request: CreateWorkDepRequest): Promise<MutationResponse> {
    const { data } = await apiClient.post<MutationResponse>('/workDep/createWorkDep', request)
    return data
  },

  async updateWorkDep(workDepId: number, body: { lagDays: number | null }): Promise<MutationResponse> {
    const { data } = await apiClient.put<MutationResponse>(`/workDep/updateWorkDep/${workDepId}`, body)
    return data
  },

  async deleteWorkDep(workDepId: number): Promise<MutationResponse> {
    const { data } = await apiClient.delete<MutationResponse>(`/workDep/deleteWorkDep/${workDepId}`)
    return data
  },
}
