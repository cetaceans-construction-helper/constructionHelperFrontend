import { ref } from 'vue'
import { workRulesApi } from '@/shared/network-core/apis/work-rules'
import { systemAdminApi } from '@/features/system-admin/infra/system-admin-api'
import { standardApi } from '@/shared/network-core/apis/standard'
import type { IdNameResponse } from '@/shared/network-core/apis/reference'
import type { StdWorkTypeResponse, StdSubWorkTypeResponse, WorkRule } from '@/features/system-admin/model/standard-types'

export function useWorkRules() {
  const workRules = ref<WorkRule[]>([])
  const isLoading = ref(false)
  const isCreating = ref(false)
  const isDeleting = ref(false)

  // 필터용 표준 데이터
  const stdDivisions = ref<IdNameResponse[]>([])
  const stdWorkTypes = ref<StdWorkTypeResponse[]>([])
  const stdSubWorkTypes = ref<StdSubWorkTypeResponse[]>([])

  const filterDivisionId = ref<number | null>(null)
  const filterWorkTypeId = ref<number | null>(null)
  const filterSubWorkTypeId = ref<number | null>(null)

  // 생성/수정 폼
  const formMode = ref<'workType' | 'subWorkType'>('workType')
  const formWorkTypeId = ref<number | null>(null)
  const formSubWorkTypeId = ref<number | null>(null)
  const formRules = ref('')

  const editingId = ref<number | null>(null)
  const editingRules = ref('')

  const loadStdDivisions = async () => {
    try {
      stdDivisions.value = await standardApi.division.getList()
    } catch (error) {
      console.error('StdDivision 로드 실패:', error)
    }
  }

  const loadStdWorkTypes = async (divisionId: number) => {
    try {
      stdWorkTypes.value = await standardApi.workType.getList(divisionId)
    } catch (error) {
      console.error('StdWorkType 로드 실패:', error)
    }
  }

  const loadStdSubWorkTypes = async (workTypeId: number) => {
    try {
      stdSubWorkTypes.value = await standardApi.subWorkType.getList(workTypeId)
    } catch (error) {
      console.error('StdSubWorkType 로드 실패:', error)
    }
  }

  const loadWorkRules = async () => {
    isLoading.value = true
    try {
      const params: { stdWorkTypeId?: number; stdSubWorkTypeId?: number } = {}
      if (filterWorkTypeId.value) params.stdWorkTypeId = filterWorkTypeId.value
      if (filterSubWorkTypeId.value) params.stdSubWorkTypeId = filterSubWorkTypeId.value
      workRules.value = await workRulesApi.getList(
        Object.keys(params).length > 0 ? params : undefined,
      )
    } catch (error) {
      console.error('WorkRules 로드 실패:', error)
    } finally {
      isLoading.value = false
    }
  }

  const createWorkRule = async () => {
    if (isCreating.value) return
    const rules = formRules.value.trim()
    if (!rules) return

    const payload: { stdWorkTypeId?: number | null; stdSubWorkTypeId?: number | null; rules: string } = { rules }
    if (formMode.value === 'workType') {
      if (!formWorkTypeId.value) return
      payload.stdWorkTypeId = formWorkTypeId.value
      payload.stdSubWorkTypeId = null
    } else {
      if (!formSubWorkTypeId.value) return
      payload.stdWorkTypeId = null
      payload.stdSubWorkTypeId = formSubWorkTypeId.value
    }

    isCreating.value = true
    try {
      await systemAdminApi.createWorkRules(payload)
      formRules.value = ''
      formWorkTypeId.value = null
      formSubWorkTypeId.value = null
      await loadWorkRules()
    } catch (error: unknown) {
      console.error('WorkRule 생성 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreating.value = false
    }
  }

  const startEditing = (rule: WorkRule) => {
    editingId.value = rule.id
    editingRules.value = rule.rules
  }

  const cancelEditing = () => {
    editingId.value = null
    editingRules.value = ''
  }

  const updateWorkRule = async () => {
    if (!editingId.value) return
    const rules = editingRules.value.trim()
    if (!rules) return

    try {
      await systemAdminApi.updateWorkRules(editingId.value, { rules })
      const item = workRules.value.find((wr) => wr.id === editingId.value)
      if (item) item.rules = rules
      cancelEditing()
    } catch (error: unknown) {
      console.error('WorkRule 수정 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    }
  }

  const deleteWorkRule = async (id: number) => {
    if (isDeleting.value) return
    isDeleting.value = true
    try {
      await systemAdminApi.deleteWorkRules(id)
      workRules.value = workRules.value.filter((wr) => wr.id !== id)
    } catch (error: unknown) {
      console.error('WorkRule 삭제 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeleting.value = false
    }
  }

  return {
    workRules,
    isLoading,
    isCreating,
    isDeleting,
    stdDivisions,
    stdWorkTypes,
    stdSubWorkTypes,
    filterDivisionId,
    filterWorkTypeId,
    filterSubWorkTypeId,
    formMode,
    formWorkTypeId,
    formSubWorkTypeId,
    formRules,
    editingId,
    editingRules,
    loadStdDivisions,
    loadStdWorkTypes,
    loadStdSubWorkTypes,
    loadWorkRules,
    createWorkRule,
    startEditing,
    cancelEditing,
    updateWorkRule,
    deleteWorkRule,
  }
}
