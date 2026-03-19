import type {
  DailyReportResponse,
  ValidateDailyReportResponse,
} from '@/features/document/model/document-types'

export interface DailyReportRepository {
  validateDailyReport(date: string, tomorrowWorkMode?: number): Promise<ValidateDailyReportResponse>
  createDailyReport(body: {
    date: string
    excludedIds?: Record<string, string[]>
    excludedPhotoIndices?: number[]
    tomorrowWorkMode?: number
  }): Promise<void>
  getDailyReportList(): Promise<DailyReportResponse[]>
  deleteDailyReport(id: number): Promise<void>
  downloadDailyReportFile(url: string): Promise<string>
}

export const validateDailyReport = async (
  repository: DailyReportRepository,
  date: string,
  tomorrowWorkMode?: number,
): Promise<ValidateDailyReportResponse> => {
  return repository.validateDailyReport(date, tomorrowWorkMode)
}

export const createDailyReport = async (
  repository: DailyReportRepository,
  body: {
    date: string
    excludedIds?: Record<string, string[]>
    excludedPhotoIndices?: number[]
    tomorrowWorkMode?: number
  },
): Promise<void> => {
  await repository.createDailyReport(body)
}

export const getDailyReports = async (
  repository: DailyReportRepository,
): Promise<DailyReportResponse[]> => {
  return repository.getDailyReportList()
}

export const deleteDailyReport = async (
  repository: DailyReportRepository,
  id: number,
): Promise<void> => {
  await repository.deleteDailyReport(id)
}

export const downloadDailyReport = async (
  repository: DailyReportRepository,
  report: Pick<DailyReportResponse, 'date' | 'dailyReportUrl'>,
): Promise<{ blobUrl: string; fileName: string }> => {
  if (!report.dailyReportUrl) {
    throw new Error('다운로드 가능한 문서가 없습니다.')
  }

  const blobUrl = await repository.downloadDailyReportFile(report.dailyReportUrl)
  return {
    blobUrl,
    fileName: `작업일보_${report.date}.xlsx`,
  }
}
