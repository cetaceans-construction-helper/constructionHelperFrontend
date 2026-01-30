import { ref, watch } from 'vue'
import {
  referenceApi,
  type IdNameResponse,
  type ComponentCodeResponse,
  type ComponentCodeMappingResponse,
  type BulkMappingResponse,
  type WorkTypeResponse,
  type SubWorkTypeResponse,
} from '@/api/reference'

export function useComponentCode() {
  // 부재 타입 관리
  const componentTypes = ref<IdNameResponse[]>([])
  const newComponentTypeName = ref('')
  const isCreatingType = ref(false)

  // 부재 코드 관리
  const componentCodes = ref<ComponentCodeResponse[]>([])
  const selectedComponentTypeId = ref<number | null>(null)
  const newComponentCode = ref('')
  const isCreatingCode = ref(false)

  // 매핑 관리
  const mappings = ref<ComponentCodeMappingResponse[]>([])
  const selectedComponentCodeId = ref<number | null>(null) // 0 = 모든코드
  const isCreatingMapping = ref(false)

  // 매핑 폼: 캐스케이딩 셀렉트
  const divisions = ref<IdNameResponse[]>([])
  const workTypes = ref<WorkTypeResponse[]>([])
  const subWorkTypes = ref<SubWorkTypeResponse[]>([])

  const mappingForm = ref({
    divisionId: '',
    workTypeId: '',
    subWorkTypeId: '',
  })

  const isLoadingWorkTypes = ref(false)
  const isLoadingSubWorkTypes = ref(false)

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

  // ========== 매핑 관련 ==========

  const loadMappings = async (componentCodeId: number) => {
    try {
      mappings.value = await referenceApi.getComponentCodeMappingList(componentCodeId)
    } catch (error) {
      console.error('매핑 목록 로드 실패:', error)
      mappings.value = []
    }
  }

  const loadDivisions = async () => {
    try {
      divisions.value = await referenceApi.getDivisionList()
    } catch (error) {
      console.error('Division 목록 로드 실패:', error)
    }
  }

  const addMapping = async () => {
    if (isCreatingMapping.value) return
    if (selectedComponentCodeId.value == null || !mappingForm.value.subWorkTypeId) return

    const isAllCodes = selectedComponentCodeId.value === 0
    if (isAllCodes && selectedComponentTypeId.value == null) return

    isCreatingMapping.value = true
    try {
      const result = await referenceApi.createComponentCodeMapping(
        selectedComponentCodeId.value,
        Number(mappingForm.value.subWorkTypeId),
        isAllCodes ? selectedComponentTypeId.value! : undefined,
      )
      mappingForm.value = { divisionId: '', workTypeId: '', subWorkTypeId: '' }

      if (isAllCodes) {
        const bulkResult = result as BulkMappingResponse
        alert(`${bulkResult.mappedCount}개 부재코드에 매핑되었습니다.`)
      } else {
        await loadMappings(selectedComponentCodeId.value)
      }
    } catch (error: unknown) {
      console.error('매핑 추가 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreatingMapping.value = false
    }
  }

  // ========== Watch: 캐스케이딩 셀렉트 ==========

  // 부재 타입 선택 시 → 부재 코드 목록 로드
  watch(selectedComponentTypeId, (typeId) => {
    if (typeId != null) {
      loadComponentCodes(typeId)
    } else {
      componentCodes.value = []
    }
    // 부재 코드 선택 초기화
    selectedComponentCodeId.value = null
    mappings.value = []
  })

  // 부재 코드 선택 시 → 매핑 목록 로드 (0 = 모든코드는 제외)
  watch(selectedComponentCodeId, (codeId) => {
    if (codeId != null && codeId > 0) {
      loadMappings(codeId)
    } else {
      mappings.value = []
    }
  })

  // Division 선택 시 → WorkTypes 로드
  watch(
    () => mappingForm.value.divisionId,
    async (divisionId) => {
      workTypes.value = []
      subWorkTypes.value = []
      mappingForm.value.workTypeId = ''
      mappingForm.value.subWorkTypeId = ''
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
      mappingForm.value.subWorkTypeId = ''
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

  return {
    // 부재 타입
    componentTypes,
    newComponentTypeName,
    isCreatingType,
    loadComponentTypes,
    addComponentType,

    // 부재 코드
    componentCodes,
    selectedComponentTypeId,
    newComponentCode,
    isCreatingCode,
    addComponentCode,

    // 매핑
    mappings,
    selectedComponentCodeId,
    isCreatingMapping,
    divisions,
    workTypes,
    subWorkTypes,
    mappingForm,
    isLoadingWorkTypes,
    isLoadingSubWorkTypes,
    loadDivisions,
    loadMappings,
    addMapping,
  }
}
