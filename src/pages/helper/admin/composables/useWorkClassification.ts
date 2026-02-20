import { ref, watch } from 'vue'
import {
  referenceApi,
  type IdNameResponse,
  type WorkTypeResponse,
  type SubWorkTypeResponse,
  type WorkStepResponse,
} from '@/api/reference'

export function useWorkClassification() {
  const divisions = ref<IdNameResponse[]>([])
  const workTypes = ref<WorkTypeResponse[]>([])
  const subWorkTypes = ref<SubWorkTypeResponse[]>([])
  const workSteps = ref<WorkStepResponse[]>([])

  const selectedDivisionId = ref<number | null>(null)
  const selectedWorkTypeId = ref<number | null>(null)
  const selectedSubWorkTypeId = ref<number | null>(null)

  const newDivisionName = ref('')
  const newWorkTypeName = ref('')
  const newSubWorkTypeName = ref('')
  const newWorkStepName = ref('')

  const isCreating = ref(false)

  // 목록 로드
  const loadDivisions = async () => {
    try {
      divisions.value = await referenceApi.getDivisionList()
    } catch (error) {
      console.error('Division 목록 로드 실패:', error)
    }
  }

  const loadWorkTypes = async (divisionId: number) => {
    try {
      workTypes.value = await referenceApi.getWorkTypeList(divisionId)
    } catch (error) {
      console.error('WorkType 목록 로드 실패:', error)
    }
  }

  const loadSubWorkTypes = async (workTypeId: number) => {
    try {
      subWorkTypes.value = await referenceApi.getSubWorkTypeList(workTypeId)
    } catch (error) {
      console.error('SubWorkType 목록 로드 실패:', error)
    }
  }

  const loadWorkSteps = async (subWorkTypeId: number) => {
    try {
      workSteps.value = await referenceApi.getWorkStepList(subWorkTypeId)
    } catch (error) {
      console.error('WorkStep 목록 로드 실패:', error)
    }
  }

  // 선택
  const selectDivision = (id: number) => {
    selectedDivisionId.value = id
    selectedWorkTypeId.value = null
    selectedSubWorkTypeId.value = null
    subWorkTypes.value = []
    workSteps.value = []
  }

  const selectWorkType = (id: number) => {
    selectedWorkTypeId.value = id
    selectedSubWorkTypeId.value = null
    workSteps.value = []
  }

  const selectSubWorkType = (id: number) => {
    selectedSubWorkTypeId.value = id
  }

  // 추가
  const addDivision = async () => {
    if (isCreating.value) return
    const name = newDivisionName.value.trim()
    if (!name) return

    isCreating.value = true
    try {
      await referenceApi.createDivision(name)
      newDivisionName.value = ''
      await loadDivisions()
    } catch (error: unknown) {
      console.error('Division 추가 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreating.value = false
    }
  }

  const addWorkType = async () => {
    if (isCreating.value) return
    const name = newWorkTypeName.value.trim()
    if (!name || !selectedDivisionId.value) return

    isCreating.value = true
    try {
      await referenceApi.createWorkType(selectedDivisionId.value, name)
      newWorkTypeName.value = ''
      await loadWorkTypes(selectedDivisionId.value)
    } catch (error: unknown) {
      console.error('WorkType 추가 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreating.value = false
    }
  }

  const addSubWorkType = async () => {
    if (isCreating.value) return
    const name = newSubWorkTypeName.value.trim()
    if (!name || !selectedWorkTypeId.value) return

    isCreating.value = true
    try {
      await referenceApi.createSubWorkType(selectedWorkTypeId.value, name)
      newSubWorkTypeName.value = ''
      await loadSubWorkTypes(selectedWorkTypeId.value)
    } catch (error: unknown) {
      console.error('SubWorkType 추가 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreating.value = false
    }
  }

  const addWorkStep = async () => {
    if (isCreating.value) return
    const name = newWorkStepName.value.trim()
    if (!name || !selectedSubWorkTypeId.value) return

    isCreating.value = true
    try {
      await referenceApi.createWorkStep(selectedSubWorkTypeId.value, name)
      newWorkStepName.value = ''
      await loadWorkSteps(selectedSubWorkTypeId.value)
    } catch (error: unknown) {
      console.error('WorkStep 추가 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
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

  watch(selectedSubWorkTypeId, (id) => {
    workSteps.value = []
    if (id) loadWorkSteps(id)
  })

  return {
    divisions,
    workTypes,
    subWorkTypes,
    workSteps,
    selectedDivisionId,
    selectedWorkTypeId,
    selectedSubWorkTypeId,
    newDivisionName,
    newWorkTypeName,
    newSubWorkTypeName,
    newWorkStepName,
    isCreating,
    loadDivisions,
    selectDivision,
    selectWorkType,
    selectSubWorkType,
    addDivision,
    addWorkType,
    addSubWorkType,
    addWorkStep,
  }
}
