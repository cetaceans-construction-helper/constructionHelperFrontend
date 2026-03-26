import apiClient from '@/shared/network-core/apiClient'

export interface SkippedWorkResponse {
  id: number
  workId: number
  date: string
}

export const skippedWorkApi = {
  async createSkippedWork(workId: number, date: string): Promise<SkippedWorkResponse> {
    const { data } = await apiClient.post<SkippedWorkResponse>('/skippedWork/createSkippedWork', { workId, date })
    return data
  },

  async deleteSkippedWork(workId: number, date: string): Promise<void> {
    await apiClient.delete('/skippedWork/deleteSkippedWork', { data: { workId, date } })
  },
}
