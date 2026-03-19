import { onMounted, ref } from 'vue'
import { dailyReportRepository } from '@/features/document/infra/daily-report-repository'
import type { DailyReportResponse } from '@/features/document/model/document-types'
import {
  deleteDailyReport,
  downloadDailyReport,
  getDailyReports,
} from '@/features/document/use-cases/daily-report'
import { analyticsClient } from '@/shared/analytics/analyticsClient'

interface ApiError {
  response?: { data?: { message?: string } }
  message?: string
}

const getErrorMessage = (error: unknown): string => {
  const err = error as ApiError
  return err.response?.data?.message || err.message || '알 수 없는 오류가 발생했습니다.'
}

export const useDailyReportPage = () => {
  const isLoading = ref(false)
  const dailyReportList = ref<DailyReportResponse[]>([])
  const isDownloading = ref<Record<number, boolean>>({})

  const showDeleteDialog = ref(false)
  const deleteTargetId = ref<number | null>(null)
  const deleteTargetName = ref('')
  const isDeleting = ref(false)

  const loadList = async () => {
    isLoading.value = true
    try {
      dailyReportList.value = await getDailyReports(dailyReportRepository)
    } catch (error: unknown) {
      console.error('작업일보 목록 로드 실패:', error)
      alert(getErrorMessage(error))
    } finally {
      isLoading.value = false
    }
  }

  const openDeleteDialog = (report: DailyReportResponse) => {
    deleteTargetId.value = report.id
    deleteTargetName.value = report.date
    showDeleteDialog.value = true
  }

  const confirmDelete = async () => {
    if (deleteTargetId.value == null) return
    isDeleting.value = true
    try {
      await deleteDailyReport(dailyReportRepository, deleteTargetId.value)
      showDeleteDialog.value = false
      analyticsClient.trackAction('document', 'delete_daily_report', 'success')
      await loadList()
    } catch (error: unknown) {
      console.error('작업일보 삭제 실패:', error)
      analyticsClient.trackAction('document', 'delete_daily_report', 'fail')
      alert(getErrorMessage(error))
    } finally {
      isDeleting.value = false
    }
  }

  const downloadReport = async (report: DailyReportResponse) => {
    isDownloading.value[report.id] = true
    try {
      const { blobUrl, fileName } = await downloadDailyReport(
        dailyReportRepository,
        report,
      )
      const anchor = document.createElement('a')
      anchor.href = blobUrl
      anchor.download = fileName
      anchor.click()
      URL.revokeObjectURL(blobUrl)
      analyticsClient.trackAction('document', 'download_daily_report', 'success')
    } catch (error: unknown) {
      console.error('작업일보 다운로드 실패:', error)
      analyticsClient.trackAction('document', 'download_daily_report', 'fail')
      alert(getErrorMessage(error))
    } finally {
      isDownloading.value[report.id] = false
    }
  }

  const formatDate = (dateStr: string): string => dateStr.split('T')[0] ?? ''

  onMounted(() => {
    loadList()
  })

  return {
    confirmDelete,
    dailyReportList,
    deleteTargetName,
    downloadReport,
    formatDate,
    isDeleting,
    isDownloading,
    isLoading,
    openDeleteDialog,
    showDeleteDialog,
  }
}
