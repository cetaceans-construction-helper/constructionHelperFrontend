import { onMounted, ref } from 'vue'
import { materialInspectionRequestRepository } from '@/features/document/infra/material-inspection-request-repository'
import type { MaterialInspectionRequestResponse } from '@/features/document/model/document-types'
import {
  deleteMaterialInspectionRequest,
  downloadMaterialInspectionRequest,
  getMaterialInspectionRequests,
} from '@/features/document/use-cases/material-inspection-request'
import { analyticsClient } from '@/lib/analytics/analyticsClient'

interface ApiError {
  response?: { data?: { message?: string } }
  message?: string
}

const getErrorMessage = (error: unknown): string => {
  const err = error as ApiError
  return err.response?.data?.message || err.message || '알 수 없는 오류가 발생했습니다.'
}

export const useMaterialInspectionPage = () => {
  const isLoading = ref(false)
  const mirList = ref<MaterialInspectionRequestResponse[]>([])
  const isDownloading = ref<Record<number, boolean>>({})

  const showDeleteDialog = ref(false)
  const deleteTargetId = ref<number | null>(null)
  const deleteTargetName = ref('')
  const isDeleting = ref(false)

  const loadList = async () => {
    isLoading.value = true
    try {
      mirList.value = await getMaterialInspectionRequests(materialInspectionRequestRepository)
    } catch (error: unknown) {
      console.error('MIR 목록 로드 실패:', error)
      alert(getErrorMessage(error))
    } finally {
      isLoading.value = false
    }
  }

  const openDeleteDialog = (request: MaterialInspectionRequestResponse) => {
    deleteTargetId.value = request.id
    deleteTargetName.value = request.documentNumber
    showDeleteDialog.value = true
  }

  const confirmDelete = async () => {
    if (deleteTargetId.value == null) return
    isDeleting.value = true
    try {
      await deleteMaterialInspectionRequest(materialInspectionRequestRepository, deleteTargetId.value)
      showDeleteDialog.value = false
      analyticsClient.trackAction('material_delivery', 'delete_mir', 'success')
      await loadList()
    } catch (error: unknown) {
      console.error('MIR 삭제 실패:', error)
      analyticsClient.trackAction('material_delivery', 'delete_mir', 'fail')
      alert(getErrorMessage(error))
    } finally {
      isDeleting.value = false
    }
  }

  const downloadMir = async (request: MaterialInspectionRequestResponse) => {
    isDownloading.value[request.id] = true
    try {
      const { blobUrl, fileName } = await downloadMaterialInspectionRequest(
        materialInspectionRequestRepository,
        request,
      )
      const anchor = document.createElement('a')
      anchor.href = blobUrl
      anchor.download = fileName
      anchor.click()
      URL.revokeObjectURL(blobUrl)
      analyticsClient.trackAction('material_delivery', 'download_mir', 'success')
    } catch (error: unknown) {
      console.error('MIR 다운로드 실패:', error)
      analyticsClient.trackAction('material_delivery', 'download_mir', 'fail')
      alert(getErrorMessage(error))
    } finally {
      isDownloading.value[request.id] = false
    }
  }

  const formatDate = (dateStr: string): string => dateStr.split('T')[0] ?? ''

  onMounted(() => {
    loadList()
  })

  return {
    confirmDelete,
    deleteTargetName,
    downloadMir,
    formatDate,
    isDeleting,
    isDownloading,
    isLoading,
    mirList,
    openDeleteDialog,
    showDeleteDialog,
  }
}
