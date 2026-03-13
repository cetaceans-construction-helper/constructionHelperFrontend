import axios from 'axios'
import { appConfig } from '@/app/bootstrap/config'
import type { CreateDailyReportInWebPayload } from '@/features/dashboard/model/homepage-daily-report-types'

const BASE_URL = appConfig.batApiBaseUrl

export const homepageApi = {
  async getPublicKey(): Promise<string> {
    const { data } = await axios.get<{ success: boolean; publicKey: string }>(`${BASE_URL}/api/public-key`)
    return data.publicKey
  },

  async createDailyReportInWeb(payload: CreateDailyReportInWebPayload): Promise<void> {
    await axios.post(`${BASE_URL}/api/createDailyReportInEanrncWeb`, payload)
  },
}
