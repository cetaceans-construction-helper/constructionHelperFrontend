import { ref, watch } from 'vue'
import {
  referenceApi,
  type IdNameResponse,
  type WorkTypeResponse,
  type SubWorkTypeResponse,
  type LaborTypeResponse,
} from '@/api/reference'

interface ApiError {
  response?: { data?: { message?: string } }
  message?: string
}

export function useLaborType() {
  // 분류/공종/세부공종 목록
  const divisions = ref<IdNameResponse[]>([])
  const workTypes = ref<WorkTypeResponse[]>([])
  const subWorkTypes = ref<SubWorkTypeResponse[]>([])

  // 선택된 ID
  const selectedDivisionId = ref<number | null>(null)
  const selectedWorkTypeId = ref<number | null>(null)
  const selectedSubWorkTypeId = ref<number | null>(null)

  // 전체 직종 목록
  const laborTypes = ref<LaborTypeResponse[]>([])

  // 입력 필드
  const newLaborTypeName = ref('')
  const isCreating = ref(false)

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

  // 세부공종 목록 로드
  const loadSubWorkTypes = async (workTypeId: number) => {
    try {
      subWorkTypes.value = await referenceApi.getSubWorkTypeList(workTypeId)
    } catch (error) {
      console.error('SubWorkType 목록 로드 실패:', error)
    }
  }

  // 전체 직종 목록 로드
  const loadLaborTypes = async () => {
    try {
      laborTypes.value = await referenceApi.getLaborTypeList()
    } catch (error) {
      console.error('LaborType 목록 로드 실패:', error)
    }
  }

  // 분류 선택
  const selectDivision = (id: number) => {
    selectedDivisionId.value = id
    selectedWorkTypeId.value = null
    selectedSubWorkTypeId.value = null
    workTypes.value = []
    subWorkTypes.value = []
  }

  // 공종 선택
  const selectWorkType = (id: number) => {
    selectedWorkTypeId.value = id
    selectedSubWorkTypeId.value = null
    subWorkTypes.value = []
  }

  // 세부공종 선택
  const selectSubWorkType = (id: number | null) => {
    selectedSubWorkTypeId.value = id
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
        subWorkTypeId: selectedSubWorkTypeId.value,
      })
      newLaborTypeName.value = ''
      // 생성 후 전체 목록 갱신
      await loadLaborTypes()
    } catch (error: unknown) {
      console.error('LaborType 추가 실패:', error)
      const err = error as ApiError
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreating.value = false
    }
  }

  // 캐스케이딩 로드
  watch(selectedDivisionId, (id) => {
    workTypes.value = []
    if (id) loadWorkTypes(id)
  })

  watch(selectedWorkTypeId, (id) => {
    subWorkTypes.value = []
    if (id) loadSubWorkTypes(id)
  })

  return {
    divisions,
    workTypes,
    subWorkTypes,
    laborTypes,
    selectedDivisionId,
    selectedWorkTypeId,
    selectedSubWorkTypeId,
    newLaborTypeName,
    isCreating,
    loadDivisions,
    loadLaborTypes,
    selectDivision,
    selectWorkType,
    selectSubWorkType,
    addLaborType,
  }
}
