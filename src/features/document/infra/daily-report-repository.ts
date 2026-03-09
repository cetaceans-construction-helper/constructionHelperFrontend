import { dailyReportApi } from '@/features/document/infra/daily-report-api'
import type { DailyReportRepository } from '@/features/document/use-cases/daily-report'

export const dailyReportRepository: DailyReportRepository = {
  validateDailyReport: (date, tomorrowWorkMode) => dailyReportApi.validateDailyReport(date, tomorrowWorkMode),
  createDailyReport: (body) => dailyReportApi.createDailyReport(body),
  getDailyReportList: () => dailyReportApi.getDailyReportList(),
  deleteDailyReport: (id) => dailyReportApi.deleteDailyReport(id),
  downloadDailyReportFile: (url) => dailyReportApi.downloadDailyReportFile(url),
}
