import apiClient from '@/shared/network-core/apiClient'

export const scheduleApi = {
  async create3WeekSchedule(excludedSubWorkTypeIds?: number[]): Promise<string> {
    const body = excludedSubWorkTypeIds?.length ? { excludedSubWorkTypeIds } : undefined
    const { data } = await apiClient.post<Blob>(
      '/schedule/create3WeekSchedule',
      body,
      { responseType: 'blob' },
    )
    return URL.createObjectURL(data)
  },

  async create3MonthSchedule(excludedSubWorkTypeIds?: number[]): Promise<string> {
    const body = excludedSubWorkTypeIds?.length ? { excludedSubWorkTypeIds } : undefined
    const { data } = await apiClient.post<Blob>(
      '/schedule/create3MonthSchedule',
      body,
      { responseType: 'blob' },
    )
    return URL.createObjectURL(data)
  },
}
