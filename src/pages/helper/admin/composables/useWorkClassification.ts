import { ref, watch } from 'vue'
import {
  subWorkTypeApi,
  type Division,
  type WorkType,
  type SubWorkType,
} from '@/api/subWorkType'

export function useWorkClassification() {
  const divisions = ref<Division[]>([])
  const workTypes = ref<WorkType[]>([])
  const subWorkTypes = ref<SubWorkType[]>([])

  const selectedDivisionId = ref<number | null>(null)
  const selectedWorkTypeId = ref<number | null>(null)

  const newDivisionName = ref('')
  const newWorkTypeName = ref('')
  const newSubWorkTypeName = ref('')

  const isCreating = ref(false)

  // 목록 로드
  const loadDivisions = async () => {
    try {
      divisions.value = await subWorkTypeApi.getDivisionList()
    } catch (error) {
      console.error('Division 목록 로드 실패:', error)
    }
  }

  const loadWorkTypes = async (divisionId: number) => {
    try {
      workTypes.value = await subWorkTypeApi.getWorkTypeList(divisionId)
    } catch (error) {
      console.error('WorkType 목록 로드 실패:', error)
    }
  }

  const loadSubWorkTypes = async (workTypeId: number) => {
    try {
      subWorkTypes.value = await subWorkTypeApi.getSubWorkTypeList(workTypeId)
    } catch (error) {
      console.error('SubWorkType 목록 로드 실패:', error)
    }
  }

  // 선택
  const selectDivision = (id: number) => {
    selectedDivisionId.value = id
    selectedWorkTypeId.value = null
    subWorkTypes.value = []
  }

  const selectWorkType = (id: number) => {
    selectedWorkTypeId.value = id
  }

  // 추가
  const addDivision = async () => {
    const name = newDivisionName.value.trim()
    if (!name) return

    isCreating.value = true
    try {
      await subWorkTypeApi.createDivision(name)
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
    const name = newWorkTypeName.value.trim()
    if (!name || !selectedDivisionId.value) return

    isCreating.value = true
    try {
      await subWorkTypeApi.createWorkType(name, selectedDivisionId.value)
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
    const name = newSubWorkTypeName.value.trim()
    if (!name || !selectedWorkTypeId.value) return

    isCreating.value = true
    try {
      await subWorkTypeApi.createSubWorkType(name, selectedWorkTypeId.value)
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
    selectedDivisionId,
    selectedWorkTypeId,
    newDivisionName,
    newWorkTypeName,
    newSubWorkTypeName,
    isCreating,
    loadDivisions,
    selectDivision,
    selectWorkType,
    addDivision,
    addWorkType,
    addSubWorkType,
  }
}
