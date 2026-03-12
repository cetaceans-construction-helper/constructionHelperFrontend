import apiClient from '@/shared/network-core/apiClient'
import type {
  DailyReportResponse,
  ValidateDailyReportResponse,
} from '@/features/document/model/document-types'

export const dailyReportApi = {
  async validateDailyReport(date: string, tomorrowWorkMode?: number): Promise<ValidateDailyReportResponse> {
    const { data } = await apiClient.get<ValidateDailyReportResponse>(
      '/dailyReport/validateDailyReport',
      { params: { date, tomorrowWorkMode } },
    )
    return data
  },

  async createDailyReport(body: {
    date: string
    excludedIds?: Record<string, string[]>
    excludedPhotoIndices?: number[]
    tomorrowWorkMode?: number
  }): Promise<void> {
    await apiClient.post('/dailyReport/createDailyReport', body)
  },

  async getDailyReportList(): Promise<DailyReportResponse[]> {
    const { data } = await apiClient.get<DailyReportResponse[]>(
      '/dailyReport/getDailyReportList',
    )
    return data
  },

  async deleteDailyReport(id: number): Promise<void> {
    await apiClient.delete(`/dailyReport/deleteDailyReport/${id}`)
  },

  async downloadDailyReportFile(url: string): Promise<string> {
    const { data } = await apiClient.get<Blob>('/materialDelivery/downloadFile', {
      params: { url },
      responseType: 'blob',
    })
    return URL.createObjectURL(data)
  },
}
