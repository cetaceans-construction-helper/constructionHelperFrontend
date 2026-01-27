import { ref, computed, watch, type Ref } from 'vue'
import type { Node } from '@vue-flow/core'
import { workApi, type WorkResponse } from '@/api/work'

export function useWorkEditor(
  nodes: Ref<Node[]>,
  onWorkUpdated: () => Promise<void>
) {
  // 작업 선택 및 수정 상태
  const selectedWorkId = ref<number | null>(null)
  const isUpdatingWork = ref(false)
  const workEditForm = ref({ startDate: '', workLeadTime: 1, isWorkingOnHoliday: true })

  // 선택된 작업 데이터
  const selectedWork = computed(() => {
    if (!selectedWorkId.value) return null
    const node = nodes.value.find(n => n.id === `work-${selectedWorkId.value}`)
    return node?.data.work as WorkResponse | undefined
  })

  // 작업 선택 시 폼 초기화
  watch(selectedWork, (work) => {
    if (work) {
      workEditForm.value = {
        startDate: work.startDate,
        workLeadTime: work.workLeadTime,
        isWorkingOnHoliday: work.isWorkingOnHoliday
      }
    }
  })

  // 작업 수정 제출
  const submitWorkUpdate = async () => {
    if (!selectedWorkId.value) return

    isUpdatingWork.value = true
    try {
      await workApi.updateWork(selectedWorkId.value, {
        startDate: workEditForm.value.startDate,
        workLeadTime: workEditForm.value.workLeadTime,
        isWorkingOnHoliday: workEditForm.value.isWorkingOnHoliday
      })
      await onWorkUpdated()
      selectedWorkId.value = null
    } catch (error: any) {
      console.error('작업 수정 실패:', error)
      const errorMessage = error.response?.data?.message || error.message
      alert(errorMessage)
    } finally {
      isUpdatingWork.value = false
    }
  }

  // 작업 선택 해제
  const clearSelection = () => {
    selectedWorkId.value = null
  }

  // 작업 선택
  const selectWork = (workId: number) => {
    selectedWorkId.value = workId
  }

  return {
    // State
    selectedWorkId,
    isUpdatingWork,
    workEditForm,

    // Computed
    selectedWork,

    // Methods
    submitWorkUpdate,
    clearSelection,
    selectWork
  }
}
