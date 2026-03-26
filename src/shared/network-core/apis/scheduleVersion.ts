import apiClient from '@/shared/network-core/apiClient'

export interface ScheduleVersionResponse {
  id: number
  versionName: string
  isMain: boolean
}

export const scheduleVersionApi = {
  async getScheduleVersionList(): Promise<ScheduleVersionResponse[]> {
    const { data } = await apiClient.get<ScheduleVersionResponse[]>('/scheduleVersion/getScheduleVersionList')
    return data
  },

  async createScheduleVersion(versionName: string): Promise<ScheduleVersionResponse> {
    const { data } = await apiClient.post<ScheduleVersionResponse>('/scheduleVersion/createScheduleVersion', { versionName })
    return data
  },

  async updateScheduleVersion(scheduleVersionId: number, versionName: string, isMain?: boolean): Promise<ScheduleVersionResponse> {
    const { data } = await apiClient.put<ScheduleVersionResponse>(`/scheduleVersion/updateScheduleVersion/${scheduleVersionId}`, { versionName, isMain })
    return data
  },

  async deleteScheduleVersion(scheduleVersionId: number): Promise<void> {
    await apiClient.delete(`/scheduleVersion/deleteScheduleVersion/${scheduleVersionId}`)
  },

  async duplicateScheduleVersion(scheduleVersionId: number, versionName: string): Promise<ScheduleVersionResponse> {
    const { data } = await apiClient.post<ScheduleVersionResponse>(`/scheduleVersion/duplicateScheduleVersion/${scheduleVersionId}`, { versionName })
    return data
  },
}
