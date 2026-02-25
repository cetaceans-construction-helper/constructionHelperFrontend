import { ref, watch, computed } from 'vue'
import {
  referenceApi,
  type IdNameResponse,
  type ComponentCodeResponse,
  type ComponentCodeMappingResponse,
  type WorkTypeResponse,
  type SubWorkTypeResponse,
  type WorkStepResponse,
  type MaterialTypeResponse,
  type MaterialSpecResponse,
  type CreateTasksResponse,
} from '@/api/reference'

export function useComponentCode() {
  // 부재 타입 관리
  const componentTypes = ref<IdNameResponse[]>([])
  const newComponentTypeName = ref('')
  const isCreatingType = ref(false)

  const isDeletingType = ref(false)

  // 부재 코드 관리
  const componentCodes = ref<ComponentCodeResponse[]>([])
  const selectedComponentTypeId = ref<number | null>(null)
  const newComponentCode = ref('')
  const isCreatingCode = ref(false)
  const isDeletingCode = ref(false)

  // 매핑 관리
  const allMappings = ref<ComponentCodeMappingResponse[]>([])
  const selectedComponentCodeIds = ref<number[]>([]) // 다중선택
  const isCreatingMapping = ref(false)

  // 매핑 폼: 캐스케이딩 셀렉트 (공종 분류)
  const divisions = ref<IdNameResponse[]>([])
  const workTypes = ref<WorkTypeResponse[]>([])
  const subWorkTypes = ref<SubWorkTypeResponse[]>([])
  const workSteps = ref<WorkStepResponse[]>([])
  const selectedWorkStepIds = ref<number[]>([]) // 다중선택

  // 매핑 폼: 자재 분류
  const materialTypes = ref<MaterialTypeResponse[]>([])
  const materialSpecs = ref<MaterialSpecResponse[]>([])

  const mappingForm = ref({
    divisionId: '',
    workTypeId: '',
    subWorkTypeId: '',
  })

  // 자재 적용 폼 (테이블 하단용)
  const materialApplyForm = ref({
    materialTypeId: '',
    materialSpecId: '',
  })

  // 매핑 row 선택 (매핑 ID 기반)
  const selectedMappingIds = ref<number[]>([])

  const isLoadingWorkTypes = ref(false)
  const isLoadingSubWorkTypes = ref(false)
  const isLoadingWorkSteps = ref(false)
  const isLoadingMaterialSpecs = ref(false)
  const isApplyingMaterial = ref(false)

  // 세부작업 생성
  const isCreatingTasks = ref(false)
  const createTasksResult = ref<CreateTasksResponse | null>(null)
  const showCreateTasksResult = ref(false)

  // ========== 부재 타입 관련 ==========

  const loadComponentTypes = async () => {
    try {
      componentTypes.value = await referenceApi.getComponentTypeList()
    } catch (error) {
      console.error('ComponentType 목록 로드 실패:', error)
    }
  }

  const addComponentType = async () => {
    if (isCreatingType.value) return
    const name = newComponentTypeName.value.trim()
    if (!name) return

    isCreatingType.value = true
    try {
      await referenceApi.createComponentType(name)
      newComponentTypeName.value = ''
      await loadComponentTypes()
    } catch (error: unknown) {
      console.error('ComponentType 추가 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreatingType.value = false
    }
  }

  const deleteComponentType = async (id: number) => {
    if (isDeletingType.value) return
    isDeletingType.value = true
    try {
      await referenceApi.deleteComponentType(id)
      if (selectedComponentTypeId.value === id) {
        selectedComponentTypeId.value = null
        componentCodes.value = []
        selectedComponentCodeIds.value = []
      }
      await loadComponentTypes()
    } catch (error: unknown) {
      console.error('ComponentType 삭제 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeletingType.value = false
    }
  }

  // ========== 부재 코드 관련 ==========

  const loadComponentCodes = async (componentTypeId: number) => {
    try {
      componentCodes.value = await referenceApi.getComponentCodeList(componentTypeId)
    } catch (error) {
      console.error('ComponentCode 목록 로드 실패:', error)
      componentCodes.value = []
    }
  }

  const addComponentCode = async () => {
    if (isCreatingCode.value) return
    if (selectedComponentTypeId.value == null) return
    const code = newComponentCode.value.trim()
    if (!code) return

    isCreatingCode.value = true
    try {
      await referenceApi.createComponentCode(selectedComponentTypeId.value, code)
      newComponentCode.value = ''
      await loadComponentCodes(selectedComponentTypeId.value)
    } catch (error: unknown) {
      console.error('ComponentCode 추가 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreatingCode.value = false
    }
  }

  const deleteComponentCode = async (id: number) => {
    if (isDeletingCode.value) return
    isDeletingCode.value = true
    try {
      await referenceApi.deleteComponentCode(id)
      const idx = selectedComponentCodeIds.value.indexOf(id)
      if (idx !== -1) selectedComponentCodeIds.value.splice(idx, 1)
      if (selectedComponentTypeId.value != null) await loadComponentCodes(selectedComponentTypeId.value)
    } catch (error: unknown) {
      console.error('ComponentCode 삭제 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeletingCode.value = false
    }
  }

  // ========== 부재코드 다중선택 헬퍼 ==========

  const isAllComponentCodesSelected = computed(() => {
    if (componentCodes.value.length === 0) return false
    return componentCodes.value.every((cc) => selectedComponentCodeIds.value.includes(cc.id))
  })

  const toggleComponentCode = (id: number) => {
    const idx = selectedComponentCodeIds.value.indexOf(id)
    if (idx === -1) {
      selectedComponentCodeIds.value.push(id)
    } else {
      selectedComponentCodeIds.value.splice(idx, 1)
    }
  }

  const toggleAllComponentCodes = () => {
    if (isAllComponentCodesSelected.value) {
      selectedComponentCodeIds.value = []
    } else {
      selectedComponentCodeIds.value = componentCodes.value.map((cc) => cc.id)
    }
  }

  // ========== 작업절차 다중선택 헬퍼 ==========

  const isAllWorkStepsSelected = computed(() => {
    if (workSteps.value.length === 0) return false
    return workSteps.value.every((ws) => selectedWorkStepIds.value.includes(ws.id))
  })

  const toggleWorkStep = (id: number) => {
    const idx = selectedWorkStepIds.value.indexOf(id)
    if (idx === -1) {
      selectedWorkStepIds.value.push(id)
    } else {
      selectedWorkStepIds.value.splice(idx, 1)
    }
  }

  const toggleAllWorkSteps = () => {
    if (isAllWorkStepsSelected.value) {
      selectedWorkStepIds.value = []
    } else {
      selectedWorkStepIds.value = workSteps.value.map((ws) => ws.id)
    }
  }

  // ========== 매핑 관련 ==========

  const loadAllMappings = async () => {
    try {
      allMappings.value = await referenceApi.getComponentCodeMappingList()
      // 매핑 목록이 갱신되면 선택 초기화
      selectedMappingIds.value = []
    } catch (error) {
      console.error('전체 매핑 로드 실패:', error)
      allMappings.value = []
    }
  }

  const filteredMappings = computed(() => {
    let result = allMappings.value

    // 부재타입으로 필터링
    if (selectedComponentTypeId.value != null && componentCodes.value.length > 0) {
      const codeIds = componentCodes.value.map((c) => c.id)
      result = result.filter((m) => codeIds.includes(m.componentCodeId))
    }

    // 부재코드로 필터링 (선택된 코드들만)
    if (selectedComponentCodeIds.value.length > 0) {
      result = result.filter((m) => selectedComponentCodeIds.value.includes(m.componentCodeId))
    }

    // 작업절차로 필터링 (선택된 절차들만)
    if (selectedWorkStepIds.value.length > 0) {
      result = result.filter((m) => selectedWorkStepIds.value.includes(m.workStepId))
    }

    return result
  })

  // ========== 매핑 row 선택 헬퍼 (매핑 ID 기반) ==========

  const isAllMappingsSelected = computed(() => {
    if (filteredMappings.value.length === 0) return false
    return filteredMappings.value.every((m) => selectedMappingIds.value.includes(m.id))
  })

  const toggleMapping = (id: number) => {
    const idx = selectedMappingIds.value.indexOf(id)
    if (idx === -1) {
      selectedMappingIds.value.push(id)
    } else {
      selectedMappingIds.value.splice(idx, 1)
    }
  }

  const toggleAllMappings = () => {
    if (isAllMappingsSelected.value) {
      selectedMappingIds.value = []
    } else {
      selectedMappingIds.value = filteredMappings.value.map((m) => m.id)
    }
  }

  const loadDivisions = async () => {
    try {
      divisions.value = await referenceApi.getDivisionList()
    } catch (error) {
      console.error('Division 목록 로드 실패:', error)
    }
  }

  const loadMaterialTypes = async () => {
    try {
      materialTypes.value = await referenceApi.getMaterialTypeList()
    } catch (error) {
      console.error('MaterialType 목록 로드 실패:', error)
    }
  }

  const addMapping = async () => {
    if (isCreatingMapping.value) return
    if (selectedComponentCodeIds.value.length === 0) return
    if (selectedWorkStepIds.value.length === 0) return

    isCreatingMapping.value = true
    try {
      let totalMapped = 0
      let totalSkipped = 0

      // 선택된 모든 부재코드 × 작업절차 조합에 대해 매핑 생성 (자재 정보 없이)
      for (const componentCodeId of selectedComponentCodeIds.value) {
        for (const workStepId of selectedWorkStepIds.value) {
          try {
            const result = await referenceApi.createComponentCodeMapping({
              componentCodeId,
              workStepId,
            })
            totalMapped += result.mappedCount
            totalSkipped += result.skippedCount
          } catch {
            // 개별 매핑 실패는 무시하고 계속 진행
            totalSkipped += 1
          }
        }
      }

      const messages: string[] = []
      if (totalMapped > 0) {
        messages.push(`${totalMapped}개 매핑 생성`)
      }
      if (totalSkipped > 0) {
        messages.push(`${totalSkipped}개 스킵(중복)`)
      }
      alert(messages.join(', ') || '매핑 완료')

      await loadAllMappings()
    } catch (error: unknown) {
      console.error('매핑 추가 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreatingMapping.value = false
    }
  }

  // ========== 자재 일괄 적용 ==========

  const applyMaterialToSelectedMappings = async () => {
    if (selectedMappingIds.value.length === 0) return
    if (!materialApplyForm.value.materialSpecId) return

    isApplyingMaterial.value = true
    try {
      const result = await referenceApi.updateComponentCodeMapping({
        ids: selectedMappingIds.value,
        materialSpecId: Number(materialApplyForm.value.materialSpecId),
      })

      alert(`${result.updatedCount}개 매핑에 자재규격 적용됨`)
      await loadAllMappings()
      // 자재 적용 폼 초기화
      materialApplyForm.value.materialTypeId = ''
      materialApplyForm.value.materialSpecId = ''
    } catch (error: unknown) {
      console.error('자재 적용 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isApplyingMaterial.value = false
    }
  }

  // ========== 세부작업 생성 ==========

  const createTasks = async () => {
    if (isCreatingTasks.value) return

    isCreatingTasks.value = true
    try {
      const result = await referenceApi.createTasks()
      createTasksResult.value = result
      showCreateTasksResult.value = true
    } catch (error: unknown) {
      console.error('세부작업 생성 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreatingTasks.value = false
    }
  }

  // ========== Watch: 캐스케이딩 셀렉트 ==========

  watch(selectedComponentTypeId, (typeId) => {
    if (typeId != null) {
      loadComponentCodes(typeId)
    } else {
      componentCodes.value = []
    }
    selectedComponentCodeIds.value = []
  })

  // Division 선택 시 → WorkTypes 로드
  watch(
    () => mappingForm.value.divisionId,
    async (divisionId) => {
      workTypes.value = []
      subWorkTypes.value = []
      workSteps.value = []
      mappingForm.value.workTypeId = ''
      mappingForm.value.subWorkTypeId = ''
      selectedWorkStepIds.value = []
      if (!divisionId) return

      isLoadingWorkTypes.value = true
      try {
        workTypes.value = await referenceApi.getWorkTypeList(Number(divisionId))
      } catch (error) {
        console.error('WorkType 목록 로드 실패:', error)
      } finally {
        isLoadingWorkTypes.value = false
      }
    },
  )

  // WorkType 선택 시 → SubWorkTypes 로드
  watch(
    () => mappingForm.value.workTypeId,
    async (workTypeId) => {
      subWorkTypes.value = []
      workSteps.value = []
      mappingForm.value.subWorkTypeId = ''
      selectedWorkStepIds.value = []
      if (!workTypeId) return

      isLoadingSubWorkTypes.value = true
      try {
        subWorkTypes.value = await referenceApi.getSubWorkTypeList(Number(workTypeId))
      } catch (error) {
        console.error('SubWorkType 목록 로드 실패:', error)
      } finally {
        isLoadingSubWorkTypes.value = false
      }
    },
  )

  // SubWorkType 선택 시 → WorkSteps 로드
  watch(
    () => mappingForm.value.subWorkTypeId,
    async (subWorkTypeId) => {
      workSteps.value = []
      selectedWorkStepIds.value = []
      if (!subWorkTypeId) return

      isLoadingWorkSteps.value = true
      try {
        workSteps.value = await referenceApi.getWorkStepList(Number(subWorkTypeId))
      } catch (error) {
        console.error('WorkStep 목록 로드 실패:', error)
      } finally {
        isLoadingWorkSteps.value = false
      }
    },
  )

  // MaterialType 선택 시 → MaterialSpecs 로드 (materialApplyForm 기준)
  watch(
    () => materialApplyForm.value.materialTypeId,
    async (materialTypeId) => {
      materialSpecs.value = []
      materialApplyForm.value.materialSpecId = ''
      if (!materialTypeId) return

      isLoadingMaterialSpecs.value = true
      try {
        materialSpecs.value = await referenceApi.getMaterialSpecList(Number(materialTypeId))
      } catch (error) {
        console.error('MaterialSpec 목록 로드 실패:', error)
      } finally {
        isLoadingMaterialSpecs.value = false
      }
    },
  )

  return {
    // 부재 타입
    componentTypes,
    newComponentTypeName,
    isCreatingType,
    isDeletingType,
    loadComponentTypes,
    addComponentType,
    deleteComponentType,

    // 부재 코드
    componentCodes,
    selectedComponentTypeId,
    newComponentCode,
    isCreatingCode,
    isDeletingCode,
    addComponentCode,
    deleteComponentCode,

    // 부재코드 다중선택
    selectedComponentCodeIds,
    isAllComponentCodesSelected,
    toggleComponentCode,
    toggleAllComponentCodes,

    // 매핑
    allMappings,
    filteredMappings,
    isCreatingMapping,
    divisions,
    workTypes,
    subWorkTypes,
    workSteps,
    materialTypes,
    materialSpecs,
    mappingForm,
    isLoadingWorkTypes,
    isLoadingSubWorkTypes,
    isLoadingWorkSteps,
    isLoadingMaterialSpecs,
    loadDivisions,
    loadMaterialTypes,
    loadAllMappings,
    addMapping,

    // 작업절차 다중선택
    selectedWorkStepIds,
    isAllWorkStepsSelected,
    toggleWorkStep,
    toggleAllWorkSteps,

    // 매핑 row 선택 (자재 일괄 적용용)
    selectedMappingIds,
    isAllMappingsSelected,
    toggleMapping,
    toggleAllMappings,

    // 자재 일괄 적용
    materialApplyForm,
    isApplyingMaterial,
    applyMaterialToSelectedMappings,

    // 세부작업 생성
    isCreatingTasks,
    createTasksResult,
    showCreateTasksResult,
    createTasks,
  }
}
