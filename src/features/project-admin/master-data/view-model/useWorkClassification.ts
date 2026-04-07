import { ref, watch } from 'vue'
import {
  referenceApi,
  type IdNameResponse,
  type WorkTypeResponse,
  type SubWorkTypeResponse,
  type WorkStepResponse,
} from '@/shared/network-core/apis/reference'
import { standardApi } from '@/shared/network-core/apis/standard'
import { analyticsClient } from '@/shared/analytics/analyticsClient'

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

    isCreating.value = true
    try {
      const result = await referenceApi.createWorkType(selectedDivisionId.value, name)
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

  const addWorkStep = async () => {
    if (isCreating.value) return
    const name = newWorkStepName.value.trim()
    if (!name || !selectedSubWorkTypeId.value) return

    isCreating.value = true
    try {
      await referenceApi.createWorkStep(selectedSubWorkTypeId.value, name)
      newWorkStepName.value = ''
      await loadWorkSteps(selectedSubWorkTypeId.value)
      analyticsClient.trackAction('admin_master_data', 'create_work_step', 'success')
    } catch (error: unknown) {
      console.error('WorkStep 추가 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'create_work_step', 'fail')
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
        workSteps.value = []
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
        workSteps.value = []
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
        workSteps.value = []
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

  const deleteWorkStep = async (id: number) => {
    if (isDeleting.value) return
    isDeleting.value = true
    try {
      await referenceApi.deleteWorkStep(id)
      workSteps.value = workSteps.value.filter((ws) => ws.id !== id)
      analyticsClient.trackAction('admin_master_data', 'delete_work_step', 'success')
    } catch (error: unknown) {
      console.error('WorkStep 삭제 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'delete_work_step', 'fail')
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

  const updateWorkTypeName = async (id: number, name: string, displayName?: string) => {
    try {
      await referenceApi.updateWorkType({ id, name })
      if (displayName != null) {
        await referenceApi.updateWorkTypeDisplayName(id, displayName)
      }
      const item = workTypes.value.find((wt) => wt.id === id)
      if (item) {
        item.name = name
        if (displayName != null) item.displayName = displayName
      }
      analyticsClient.trackAction('admin_master_data', 'update_work_type', 'success')
    } catch (error: unknown) {
      console.error('WorkType 이름 수정 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'update_work_type', 'fail')
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

  const updateWorkStepName = async (id: number, name: string) => {
    try {
      await referenceApi.updateWorkStep({ id, name })
      const item = workSteps.value.find((ws) => ws.id === id)
      if (item) item.name = name
      analyticsClient.trackAction('admin_master_data', 'update_work_step', 'success')
    } catch (error: unknown) {
      console.error('WorkStep 이름 수정 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'update_work_step', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      if (selectedSubWorkTypeId.value) await loadWorkSteps(selectedSubWorkTypeId.value)
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
      await referenceApi.updateWorkType({ ids, parentId: selectedDivisionId.value })
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

  const reorderWorkSteps = async (ids: number[]) => {
    if (!selectedSubWorkTypeId.value) return
    try {
      await referenceApi.updateWorkStep({ ids, parentId: selectedSubWorkTypeId.value })
      await loadWorkSteps(selectedSubWorkTypeId.value)
    } catch (error: unknown) {
      console.error('WorkStep 정렬 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      if (selectedSubWorkTypeId.value) await loadWorkSteps(selectedSubWorkTypeId.value)
    }
  }

  // ========== 표준 매핑 ==========

  const stdDivisions = ref<IdNameResponse[]>([])
  const stdWorkTypes = ref<{ id: number; name: string }[]>([])
  const stdSubWorkTypes = ref<{ id: number; name: string }[]>([])
  const stdWorkSteps = ref<{ id: number; name: string }[]>([])

  const loadStdDivisions = async () => {
    try {
      stdDivisions.value = await standardApi.division.getList()
    } catch (error) {
      console.error('StdDivision 로드 실패:', error)
    }
  }

  const setDivisionStandard = async (id: number, standardId: number | null) => {
    try {
      await referenceApi.updateDivision({ id, standardId })
      const item = divisions.value.find((d) => d.id === id)
      if (item) item.standardId = standardId
    } catch (error: unknown) {
      console.error('Division 표준 매핑 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    }
  }

  const setWorkTypeStandard = async (id: number, standardId: number | null) => {
    try {
      await referenceApi.updateWorkType({ id, standardId })
      const item = workTypes.value.find((wt) => wt.id === id)
      if (item) item.standardId = standardId
    } catch (error: unknown) {
      console.error('WorkType 표준 매핑 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    }
  }

  const setSubWorkTypeStandard = async (id: number, standardId: number | null) => {
    try {
      await referenceApi.updateSubWorkType({ id, standardId })
      const item = subWorkTypes.value.find((swt) => swt.id === id)
      if (item) item.standardId = standardId
    } catch (error: unknown) {
      console.error('SubWorkType 표준 매핑 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    }
  }

  const setWorkStepStandard = async (id: number, standardId: number | null) => {
    try {
      await referenceApi.updateWorkStep({ id, standardId })
      const item = workSteps.value.find((ws) => ws.id === id)
      if (item) item.standardId = standardId
    } catch (error: unknown) {
      console.error('WorkStep 표준 매핑 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    }
  }

  // 캐스케이딩 로드
  watch(selectedDivisionId, (id) => {
    workTypes.value = []
    stdWorkTypes.value = []
    if (id) {
      loadWorkTypes(id)
      const div = divisions.value.find((d) => d.id === id)
      if (div?.standardId) {
        standardApi.workType.getList(div.standardId).then((list) => { stdWorkTypes.value = list })
      }
    }
  })

  watch(selectedWorkTypeId, (id) => {
    subWorkTypes.value = []
    stdSubWorkTypes.value = []
    if (id) {
      loadSubWorkTypes(id)
      const wt = workTypes.value.find((w) => w.id === id)
      if (wt?.standardId) {
        standardApi.subWorkType.getList(wt.standardId).then((list) => { stdSubWorkTypes.value = list })
      }
    }
  })

  watch(selectedSubWorkTypeId, (id) => {
    workSteps.value = []
    stdWorkSteps.value = []
    if (id) {
      loadWorkSteps(id)
      const swt = subWorkTypes.value.find((s) => s.id === id)
      if (swt?.standardId) {
        standardApi.workStep.getList(swt.standardId).then((list) => { stdWorkSteps.value = list })
      }
    }
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
    reorderDivisions,
    reorderWorkTypes,
    reorderSubWorkTypes,
    reorderWorkSteps,
    stdDivisions,
    stdWorkTypes,
    stdSubWorkTypes,
    stdWorkSteps,
    loadStdDivisions,
    setDivisionStandard,
    setWorkTypeStandard,
    setSubWorkTypeStandard,
    setWorkStepStandard,
  }
}
