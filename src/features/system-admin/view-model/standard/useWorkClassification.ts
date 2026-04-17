import { ref, computed, watch } from 'vue'
import {
  referenceApi,
  type IdNameResponse,
  type WorkTypeResponse,
  type SubWorkTypeResponse,
} from '@/shared/network-core/apis/reference'
import { analyticsClient } from '@/shared/analytics/analyticsClient'

export function useWorkClassification() {
  const divisions = ref<IdNameResponse[]>([])
  const workTypes = ref<WorkTypeResponse[]>([])
  const subWorkTypes = ref<SubWorkTypeResponse[]>([])

  const selectedDivisionId = ref<number | null>(null)
  // Division → isStructure → WorkType 계층. 필터 겸 새 WorkType 생성 시의 isStructure 값.
  const selectedIsStructure = ref<boolean | null>(null)
  const selectedWorkTypeId = ref<number | null>(null)
  const selectedSubWorkTypeId = ref<number | null>(null)

  const filteredWorkTypes = computed(() => {
    if (selectedIsStructure.value == null) return workTypes.value
    return workTypes.value.filter((wt) => wt.isStructure === selectedIsStructure.value)
  })

  const newDivisionName = ref('')
  const newWorkTypeName = ref('')
  const newSubWorkTypeName = ref('')

  const isCreating = ref(false)
  const isDeleting = ref(false)

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

  // 선택
  const selectDivision = (id: number) => {
    selectedDivisionId.value = id
    selectedIsStructure.value = null
    selectedWorkTypeId.value = null
    selectedSubWorkTypeId.value = null
    subWorkTypes.value = []
  }

  const selectIsStructure = (value: boolean) => {
    selectedIsStructure.value = selectedIsStructure.value === value ? null : value
    selectedWorkTypeId.value = null
    selectedSubWorkTypeId.value = null
    subWorkTypes.value = []
  }

  const selectWorkType = (id: number) => {
    selectedWorkTypeId.value = id
    selectedSubWorkTypeId.value = null
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
      const result = await referenceApi.createDivision(name)
      newDivisionName.value = ''
      await loadDivisions()
      selectDivision(result.id)
      analyticsClient.trackAction('admin_master_data', 'create_division', 'success')
    } catch (error: unknown) {
      console.error('Division 추가 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'create_division', 'fail')
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
    if (selectedIsStructure.value == null) {
      alert('구조/비구조를 먼저 선택하세요.')
      return
    }

    isCreating.value = true
    try {
      const result = await referenceApi.createWorkType(
        selectedDivisionId.value,
        name,
        selectedIsStructure.value,
      )
      newWorkTypeName.value = ''
      await loadWorkTypes(selectedDivisionId.value)
      selectWorkType(result.id)
      analyticsClient.trackAction('admin_master_data', 'create_work_type', 'success')
    } catch (error: unknown) {
      console.error('WorkType 추가 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'create_work_type', 'fail')
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
      const result = await referenceApi.createSubWorkType(selectedWorkTypeId.value, name)
      newSubWorkTypeName.value = ''
      await loadSubWorkTypes(selectedWorkTypeId.value)
      selectSubWorkType(result.id)
      analyticsClient.trackAction('admin_master_data', 'create_sub_work_type', 'success')
    } catch (error: unknown) {
      console.error('SubWorkType 추가 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'create_sub_work_type', 'fail')
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
      await referenceApi.deleteDivision(id)
      if (selectedDivisionId.value === id) {
        selectedDivisionId.value = null
        selectedWorkTypeId.value = null
        selectedSubWorkTypeId.value = null
        workTypes.value = []
        subWorkTypes.value = []
      }
      divisions.value = divisions.value.filter((d) => d.id !== id)
      analyticsClient.trackAction('admin_master_data', 'delete_division', 'success')
    } catch (error: unknown) {
      console.error('Division 삭제 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'delete_division', 'fail')
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
      await referenceApi.deleteWorkType(id)
      if (selectedWorkTypeId.value === id) {
        selectedWorkTypeId.value = null
        selectedSubWorkTypeId.value = null
        subWorkTypes.value = []
      }
      workTypes.value = workTypes.value.filter((wt) => wt.id !== id)
      analyticsClient.trackAction('admin_master_data', 'delete_work_type', 'success')
    } catch (error: unknown) {
      console.error('WorkType 삭제 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'delete_work_type', 'fail')
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
      await referenceApi.deleteSubWorkType(id)
      if (selectedSubWorkTypeId.value === id) {
        selectedSubWorkTypeId.value = null
      }
      subWorkTypes.value = subWorkTypes.value.filter((swt) => swt.id !== id)
      analyticsClient.trackAction('admin_master_data', 'delete_sub_work_type', 'success')
    } catch (error: unknown) {
      console.error('SubWorkType 삭제 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'delete_sub_work_type', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeleting.value = false
    }
  }

  // 수정 (이름 변경)
  const updateDivisionName = async (id: number, name: string) => {
    try {
      await referenceApi.updateDivision({ id, name })
      const item = divisions.value.find((d) => d.id === id)
      if (item) item.name = name
      analyticsClient.trackAction('admin_master_data', 'update_division', 'success')
    } catch (error: unknown) {
      console.error('Division 이름 수정 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'update_division', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      await loadDivisions()
    }
  }

  const updateWorkTypeName = async (id: number, name: string) => {
    try {
      await referenceApi.updateWorkType({ id, name })
      const item = workTypes.value.find((wt) => wt.id === id)
      if (item) item.name = name
      analyticsClient.trackAction('admin_master_data', 'update_work_type', 'success')
    } catch (error: unknown) {
      console.error('WorkType 이름 수정 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'update_work_type', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      if (selectedDivisionId.value) await loadWorkTypes(selectedDivisionId.value)
    }
  }

  const updateWorkTypeIsStructure = async (id: number, isStructure: boolean) => {
    try {
      await referenceApi.updateWorkType({ id, isStructure })
      const item = workTypes.value.find((wt) => wt.id === id)
      if (item) item.isStructure = isStructure
      analyticsClient.trackAction('admin_master_data', 'update_work_type_is_structure', 'success')
    } catch (error: unknown) {
      console.error('WorkType 구조플래그 수정 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'update_work_type_is_structure', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      if (selectedDivisionId.value) await loadWorkTypes(selectedDivisionId.value)
    }
  }

  const updateSubWorkTypeName = async (id: number, name: string) => {
    try {
      await referenceApi.updateSubWorkType({ id, name })
      const item = subWorkTypes.value.find((swt) => swt.id === id)
      if (item) item.name = name
      analyticsClient.trackAction('admin_master_data', 'update_sub_work_type', 'success')
    } catch (error: unknown) {
      console.error('SubWorkType 이름 수정 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'update_sub_work_type', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      if (selectedWorkTypeId.value) await loadSubWorkTypes(selectedWorkTypeId.value)
    }
  }

  // 정렬 변경
  const reorderDivisions = async (ids: number[]) => {
    try {
      await referenceApi.updateDivision({ ids })
      await loadDivisions()
    } catch (error: unknown) {
      console.error('Division 정렬 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      await loadDivisions()
    }
  }

  const reorderWorkTypes = async (ids: number[]) => {
    if (!selectedDivisionId.value) return
    try {
      const payload: { ids: number[]; parentId: number; isStructure?: boolean } = {
        ids,
        parentId: selectedDivisionId.value,
      }
      if (selectedIsStructure.value != null) payload.isStructure = selectedIsStructure.value
      await referenceApi.updateWorkType(payload)
      await loadWorkTypes(selectedDivisionId.value)
    } catch (error: unknown) {
      console.error('WorkType 정렬 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      if (selectedDivisionId.value) await loadWorkTypes(selectedDivisionId.value)
    }
  }

  const reorderSubWorkTypes = async (ids: number[]) => {
    if (!selectedWorkTypeId.value) return
    try {
      await referenceApi.updateSubWorkType({ ids, parentId: selectedWorkTypeId.value })
      await loadSubWorkTypes(selectedWorkTypeId.value)
    } catch (error: unknown) {
      console.error('SubWorkType 정렬 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      if (selectedWorkTypeId.value) await loadSubWorkTypes(selectedWorkTypeId.value)
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
    filteredWorkTypes,
    subWorkTypes,
    selectedDivisionId,
    selectedIsStructure,
    selectedWorkTypeId,
    selectedSubWorkTypeId,
    newDivisionName,
    newWorkTypeName,
    newSubWorkTypeName,
    isCreating,
    isDeleting,
    loadDivisions,
    selectDivision,
    selectIsStructure,
    selectWorkType,
    selectSubWorkType,
    addDivision,
    addWorkType,
    addSubWorkType,
    deleteDivision,
    deleteWorkType,
    deleteSubWorkType,
    updateDivisionName,
    updateWorkTypeName,
    updateWorkTypeIsStructure,
    updateSubWorkTypeName,
    reorderDivisions,
    reorderWorkTypes,
    reorderSubWorkTypes,
  }
}
