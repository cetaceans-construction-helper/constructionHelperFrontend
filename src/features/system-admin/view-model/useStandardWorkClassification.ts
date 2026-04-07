import { ref, watch } from 'vue'
import { standardApi } from '@/shared/network-core/apis/standard'
import type { IdNameResponse } from '@/shared/network-core/apis/reference'
import type {
  StdWorkTypeResponse,
  StdSubWorkTypeResponse,
  StdWorkStepResponse,
} from '@/features/system-admin/model/standard-types'

export function useStandardWorkClassification() {
  const divisions = ref<IdNameResponse[]>([])
  const workTypes = ref<StdWorkTypeResponse[]>([])
  const subWorkTypes = ref<StdSubWorkTypeResponse[]>([])
  const workSteps = ref<StdWorkStepResponse[]>([])

  const selectedDivisionId = ref<number | null>(null)
  const selectedWorkTypeId = ref<number | null>(null)
  const selectedSubWorkTypeId = ref<number | null>(null)

  const newDivisionName = ref('')
  const newWorkTypeName = ref('')
  const newSubWorkTypeName = ref('')
  const newWorkStepName = ref('')

  const isCreating = ref(false)
  const isDeleting = ref(false)

  // 목록 로드
  const loadDivisions = async () => {
    try {
      divisions.value = await standardApi.division.getList()
    } catch (error) {
      console.error('StdDivision 목록 로드 실패:', error)
    }
  }

  const loadWorkTypes = async (divisionId: number) => {
    try {
      workTypes.value = await standardApi.workType.getList(divisionId)
    } catch (error) {
      console.error('StdWorkType 목록 로드 실패:', error)
    }
  }

  const loadSubWorkTypes = async (workTypeId: number) => {
    try {
      subWorkTypes.value = await standardApi.subWorkType.getList(workTypeId)
    } catch (error) {
      console.error('StdSubWorkType 목록 로드 실패:', error)
    }
  }

  const loadWorkSteps = async (subWorkTypeId: number) => {
    try {
      workSteps.value = await standardApi.workStep.getList(subWorkTypeId)
    } catch (error) {
      console.error('StdWorkStep 목록 로드 실패:', error)
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
      const result = await standardApi.division.create({ name })
      newDivisionName.value = ''
      await loadDivisions()
      selectDivision(result.id)
    } catch (error: unknown) {
      console.error('StdDivision 추가 실패:', error)
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
      const result = await standardApi.workType.create({ name, parentId: selectedDivisionId.value })
      newWorkTypeName.value = ''
      await loadWorkTypes(selectedDivisionId.value)
      selectWorkType(result.id)
    } catch (error: unknown) {
      console.error('StdWorkType 추가 실패:', error)
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
      const result = await standardApi.subWorkType.create({ name, parentId: selectedWorkTypeId.value })
      newSubWorkTypeName.value = ''
      await loadSubWorkTypes(selectedWorkTypeId.value)
      selectSubWorkType(result.id)
    } catch (error: unknown) {
      console.error('StdSubWorkType 추가 실패:', error)
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
      await standardApi.workStep.create({ name, parentId: selectedSubWorkTypeId.value })
      newWorkStepName.value = ''
      await loadWorkSteps(selectedSubWorkTypeId.value)
    } catch (error: unknown) {
      console.error('StdWorkStep 추가 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreating.value = false
    }
  }

  // 삭제
  const deleteDivision = async (id: number) => {
    if (isDeleting.value) return
    isDeleting.value = true
    try {
      await standardApi.division.delete(id)
      if (selectedDivisionId.value === id) {
        selectedDivisionId.value = null
        selectedWorkTypeId.value = null
        selectedSubWorkTypeId.value = null
        workTypes.value = []
        subWorkTypes.value = []
        workSteps.value = []
      }
      divisions.value = divisions.value.filter((d) => d.id !== id)
    } catch (error: unknown) {
      console.error('StdDivision 삭제 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeleting.value = false
    }
  }

  const deleteWorkType = async (id: number) => {
    if (isDeleting.value) return
    isDeleting.value = true
    try {
      await standardApi.workType.delete(id)
      if (selectedWorkTypeId.value === id) {
        selectedWorkTypeId.value = null
        selectedSubWorkTypeId.value = null
        subWorkTypes.value = []
        workSteps.value = []
      }
      workTypes.value = workTypes.value.filter((wt) => wt.id !== id)
    } catch (error: unknown) {
      console.error('StdWorkType 삭제 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeleting.value = false
    }
  }

  const deleteSubWorkType = async (id: number) => {
    if (isDeleting.value) return
    isDeleting.value = true
    try {
      await standardApi.subWorkType.delete(id)
      if (selectedSubWorkTypeId.value === id) {
        selectedSubWorkTypeId.value = null
        workSteps.value = []
      }
      subWorkTypes.value = subWorkTypes.value.filter((swt) => swt.id !== id)
    } catch (error: unknown) {
      console.error('StdSubWorkType 삭제 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeleting.value = false
    }
  }

  const deleteWorkStep = async (id: number) => {
    if (isDeleting.value) return
    isDeleting.value = true
    try {
      await standardApi.workStep.delete(id)
      workSteps.value = workSteps.value.filter((ws) => ws.id !== id)
    } catch (error: unknown) {
      console.error('StdWorkStep 삭제 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeleting.value = false
    }
  }

  // 수정
  const updateDivisionName = async (id: number, name: string) => {
    try {
      await standardApi.division.update(id, { name })
      const item = divisions.value.find((d) => d.id === id)
      if (item) item.name = name
    } catch (error: unknown) {
      console.error('StdDivision 수정 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      await loadDivisions()
    }
  }

  const updateWorkTypeName = async (id: number, name: string) => {
    try {
      await standardApi.workType.update(id, { name })
      const item = workTypes.value.find((wt) => wt.id === id)
      if (item) item.name = name
    } catch (error: unknown) {
      console.error('StdWorkType 수정 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      if (selectedDivisionId.value) await loadWorkTypes(selectedDivisionId.value)
    }
  }

  const updateSubWorkTypeName = async (id: number, name: string) => {
    try {
      await standardApi.subWorkType.update(id, { name })
      const item = subWorkTypes.value.find((swt) => swt.id === id)
      if (item) item.name = name
    } catch (error: unknown) {
      console.error('StdSubWorkType 수정 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      if (selectedWorkTypeId.value) await loadSubWorkTypes(selectedWorkTypeId.value)
    }
  }

  const updateWorkStepName = async (id: number, name: string) => {
    try {
      await standardApi.workStep.update(id, { name })
      const item = workSteps.value.find((ws) => ws.id === id)
      if (item) item.name = name
    } catch (error: unknown) {
      console.error('StdWorkStep 수정 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      if (selectedSubWorkTypeId.value) await loadWorkSteps(selectedSubWorkTypeId.value)
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
    isDeleting,
    loadDivisions,
    selectDivision,
    selectWorkType,
    selectSubWorkType,
    addDivision,
    addWorkType,
    addSubWorkType,
    addWorkStep,
    deleteDivision,
    deleteWorkType,
    deleteSubWorkType,
    deleteWorkStep,
    updateDivisionName,
    updateWorkTypeName,
    updateSubWorkTypeName,
    updateWorkStepName,
  }
}
