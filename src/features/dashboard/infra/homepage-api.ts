import apiClient from '@/shared/network-core/apiClient'
import type { CreateDailyReportInWebPayload } from '@/features/dashboard/model/homepage-daily-report-types'
import { authApi } from '@/features/auth/public'

export const homepageApi = {
  async getPublicKey(): Promise<string> {
    return authApi.getPublicKey()
  },

  async createDailyReportInWeb(payload: CreateDailyReportInWebPayload): Promise<void> {
    await apiClient.post('/dailyReport/createDailyReportInEanrncWeb', payload, { timeout: 20000 })
  },
}
