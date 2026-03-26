import apiClient from '@/shared/network-core/apiClient'

export const scheduleApi = {
  async create3WeekSchedule(scheduleVersionId: number, excludedSubWorkTypeIds?: number[]): Promise<string> {
    const body: Record<string, unknown> = { scheduleVersionId }
    if (excludedSubWorkTypeIds?.length) body.excludedSubWorkTypeIds = excludedSubWorkTypeIds
    const { data } = await apiClient.post<Blob>(
      '/schedule/create3WeekSchedule',
      body,
      { responseType: 'blob' },
    )
    return URL.createObjectURL(data)
  },

  async create3MonthSchedule(scheduleVersionId: number, excludedSubWorkTypeIds?: number[]): Promise<string> {
    const body: Record<string, unknown> = { scheduleVersionId }
    if (excludedSubWorkTypeIds?.length) body.excludedSubWorkTypeIds = excludedSubWorkTypeIds
    const { data } = await apiClient.post<Blob>(
      '/schedule/create3MonthSchedule',
      body,
      { responseType: 'blob' },
    )
    return URL.createObjectURL(data)
  },
}
