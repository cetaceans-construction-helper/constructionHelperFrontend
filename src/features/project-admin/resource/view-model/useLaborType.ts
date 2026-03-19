import { ref, watch } from 'vue'
import {
  referenceApi,
  type IdNameResponse,
  type WorkTypeResponse,
  type LaborTypeResponse,
} from '@/shared/network-core/apis/reference'
import { analyticsClient } from '@/shared/analytics/analyticsClient'

interface ApiError {
  response?: { data?: { message?: string } }
  message?: string
}

export function useLaborType() {
  // 분류/공종 목록
  const divisions = ref<IdNameResponse[]>([])
  const workTypes = ref<WorkTypeResponse[]>([])

  // 선택된 ID
  const selectedDivisionId = ref<number | null>(null)
  const selectedWorkTypeId = ref<number | null>(null)

  // 선택된 공종의 직종 목록
  const laborTypes = ref<LaborTypeResponse[]>([])

  // 입력 필드
  const newLaborTypeName = ref('')
  const isCreating = ref(false)
  const isDeleting = ref(false)

  // 분류 목록 로드
  const loadDivisions = async () => {
    try {
      divisions.value = await referenceApi.getDivisionList()
    } catch (error) {
      console.error('Division 목록 로드 실패:', error)
    }
  }

  // 공종 목록 로드
  const loadWorkTypes = async (divisionId: number) => {
    try {
      workTypes.value = await referenceApi.getWorkTypeList(divisionId)
    } catch (error) {
      console.error('WorkType 목록 로드 실패:', error)
    }
  }

  // 공종별 직종 목록 로드
  const loadLaborTypes = async (workTypeId: number) => {
    try {
      laborTypes.value = await referenceApi.getLaborTypeListByWorkType(workTypeId)
    } catch (error) {
      console.error('LaborType 목록 로드 실패:', error)
    }
  }

  // 분류 선택
  const selectDivision = (id: number) => {
    selectedDivisionId.value = id
    selectedWorkTypeId.value = null
    workTypes.value = []
    laborTypes.value = []
  }

  // 공종 선택
  const selectWorkType = (id: number) => {
    selectedWorkTypeId.value = id
  }

  // 직종 추가
  const addLaborType = async () => {
    if (isCreating.value) return
    const name = newLaborTypeName.value.trim()
    const workTypeId = selectedWorkTypeId.value
    if (!name || !workTypeId) return

    isCreating.value = true
    try {
      await referenceApi.createLaborType({
        name,
        workTypeId,
        subWorkTypeId: null,
      })
      newLaborTypeName.value = ''
      await loadLaborTypes(workTypeId)
      analyticsClient.trackAction('admin_resource_data', 'create_labor_type', 'success')
    } catch (error: unknown) {
      console.error('LaborType 추가 실패:', error)
      analyticsClient.trackAction('admin_resource_data', 'create_labor_type', 'fail')
      const err = error as ApiError
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreating.value = false
    }
  }

  // 직종 삭제
  const deleteLaborType = async (id: number) => {
    if (isDeleting.value) return
    isDeleting.value = true
    try {
      await referenceApi.deleteLaborType(id)
      laborTypes.value = laborTypes.value.filter((lt) => lt.id !== id)
      analyticsClient.trackAction('admin_resource_data', 'delete_labor_type', 'success')
    } catch (error: unknown) {
      console.error('LaborType 삭제 실패:', error)
      analyticsClient.trackAction('admin_resource_data', 'delete_labor_type', 'fail')
      const err = error as ApiError
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeleting.value = false
    }
  }

  // 직종 이름 수정
  const updateLaborTypeName = async (id: number, name: string) => {
    try {
      await referenceApi.updateLaborType({ id, name })
      const item = laborTypes.value.find((lt) => lt.id === id)
      if (item) item.name = name
      analyticsClient.trackAction('admin_resource_data', 'update_labor_type', 'success')
    } catch (error: unknown) {
      console.error('LaborType 이름 수정 실패:', error)
      analyticsClient.trackAction('admin_resource_data', 'update_labor_type', 'fail')
      const err = error as ApiError
      alert(err.response?.data?.message || err.message)
      if (selectedWorkTypeId.value) await loadLaborTypes(selectedWorkTypeId.value)
    }
  }

  // 직종 정렬 변경
  const reorderLaborTypes = async (ids: number[]) => {
    if (!selectedWorkTypeId.value) return
    try {
      await referenceApi.updateLaborType({ ids })
      await loadLaborTypes(selectedWorkTypeId.value)
    } catch (error: unknown) {
      console.error('LaborType 정렬 실패:', error)
      const err = error as ApiError
      alert(err.response?.data?.message || err.message)
      if (selectedWorkTypeId.value) await loadLaborTypes(selectedWorkTypeId.value)
    }
  }

  // 캐스케이딩 로드
  watch(selectedDivisionId, (id) => {
    workTypes.value = []
    if (id) loadWorkTypes(id)
  })

  watch(selectedWorkTypeId, (id) => {
    laborTypes.value = []
    if (id) loadLaborTypes(id)
  })

  return {
    divisions,
    workTypes,
    laborTypes,
    selectedDivisionId,
    selectedWorkTypeId,
    newLaborTypeName,
    isCreating,
    isDeleting,
    loadDivisions,
    selectDivision,
    selectWorkType,
    addLaborType,
    deleteLaborType,
    updateLaborTypeName,
    reorderLaborTypes,
  }
}
