import { ref } from 'vue'
import {
  referenceApi,
  type IdNameResponse,
  type WorkTypeResponse,
  type SubWorkTypeResponse,
} from '@/api/reference'
import { workApi, type WorkResponse, type UpdateWorkPayload, type CreateWorkPayload, type MutationResponse } from '@/api/work'
import { appConfig } from '@/config'

export function useWorkTooltipData() {
  // 참조 데이터 (한 번 로드)
  const divisions = ref<IdNameResponse[]>([])
  const tooltipWorkTypes = ref<WorkTypeResponse[]>([])
  const tooltipSubWorkTypes = ref<SubWorkTypeResponse[]>([])
  const zones = ref<IdNameResponse[]>([])
  const floors = ref<IdNameResponse[]>([])
  const sections = ref<IdNameResponse[]>([])
  const usages = ref<IdNameResponse[]>([])
  const componentTypes = ref<IdNameResponse[]>([])

  // 다이얼로그 상태
  const showDialog = ref(false)
  const editingWorkId = ref<number | null>(null)
  const isCreateMode = ref(false)
  const createStartDate = ref('')
  const createPositionY = ref(0)

  // 편집 상태 (Select 호환을 위해 string)
  const editDivisionId = ref('')
  const editWorkTypeId = ref('')
  const editSubWorkTypeId = ref('')
  const editZoneIds = ref<number[]>([])
  const editFloorIds = ref<number[]>([])
  const editSectionIds = ref<number[]>([])
  const editUsageIds = ref<number[]>([])
  const editComponentTypeIds = ref<number[]>([])
  const editAnnotation = ref('')
  const editStartDate = ref('')
  const editWorkLeadTime = ref(1)

  // 로딩 상태
  const isLoadingTooltipWorkTypes = ref(false)
  const isLoadingTooltipSubWorkTypes = ref(false)
  const isSavingDetails = ref(false)

  // 참조 데이터 전체 로드
  const loadReferenceData = async () => {
    try {
      const [divList, zoneList, floorList, sectionList, usageList, ctList] = await Promise.all([
        referenceApi.getDivisionList(),
        referenceApi.getZoneList(),
        referenceApi.getFloorList(),
        referenceApi.getSectionList(),
        referenceApi.getUsageList(),
        referenceApi.getComponentTypeList(),
      ])
      divisions.value = divList
      zones.value = zoneList
      floors.value = floorList
      sections.value = sectionList
      usages.value = usageList
      componentTypes.value = ctList
    } catch (error) {
      console.error('참조 데이터 로드 실패:', error)
    }
  }

  // 다이얼로그 열기
  const openDialog = async (work: WorkResponse) => {
    editingWorkId.value = work.workId
    await initFromWork(work)
    showDialog.value = true
  }

  // 다이얼로그 닫기
  const closeDialog = () => {
    showDialog.value = false
    editingWorkId.value = null
    isCreateMode.value = false
  }

  // 생성 모드로 다이얼로그 열기 (빈 폼)
  const openCreateDialog = (startDate: string, positionY: number) => {
    isCreateMode.value = true
    editingWorkId.value = null
    createStartDate.value = startDate
    createPositionY.value = positionY

    // 폼 초기화
    editDivisionId.value = ''
    editWorkTypeId.value = ''
    editSubWorkTypeId.value = ''
    editZoneIds.value = []
    editFloorIds.value = []
    editSectionIds.value = []
    editUsageIds.value = []
    editComponentTypeIds.value = []
    editAnnotation.value = ''
    tooltipWorkTypes.value = []
    tooltipSubWorkTypes.value = []

    showDialog.value = true
  }

  // WorkResponse로부터 편집 상태 초기화 (ID 필드 직접 사용)
  const initFromWork = async (work: WorkResponse) => {
    // Division 이름으로 ID 찾기 (division은 ID가 응답에 없으므로 이름 매칭)
    const div = divisions.value.find((d) => d.name === work.division)
    editDivisionId.value = div ? String(div.id) : ''

    tooltipWorkTypes.value = []
    tooltipSubWorkTypes.value = []
    editWorkTypeId.value = ''
    editSubWorkTypeId.value = work.subWorkTypeId ? String(work.subWorkTypeId) : ''

    if (div) {
      isLoadingTooltipWorkTypes.value = true
      try {
        tooltipWorkTypes.value = await referenceApi.getWorkTypeList(div.id)
        const wt = tooltipWorkTypes.value.find((w) => w.name === work.workType)
        editWorkTypeId.value = wt ? String(wt.id) : ''

        if (wt) {
          isLoadingTooltipSubWorkTypes.value = true
          try {
            tooltipSubWorkTypes.value = await referenceApi.getSubWorkTypeList(wt.id)
          } finally {
            isLoadingTooltipSubWorkTypes.value = false
          }
        }
      } finally {
        isLoadingTooltipWorkTypes.value = false
      }
    }

    // 시작일, 작업기간
    editStartDate.value = work.startDate
    editWorkLeadTime.value = work.workLeadTime

    // 위치 ID 배열 사용
    editZoneIds.value = work.zoneIds ?? []
    editFloorIds.value = work.floorIds ?? []
    editSectionIds.value = work.sectionIds ?? []
    editUsageIds.value = work.usageIds ?? []

    // 부재 타입 & 비고
    editComponentTypeIds.value = work.componentTypeIds ? [...work.componentTypeIds] : []
    editAnnotation.value = work.annotation || ''
  }

  // 계층 선택 핸들러
  const handleTooltipDivisionChange = async (val: unknown) => {
    const id = String(val ?? '')
    editDivisionId.value = id
    editWorkTypeId.value = ''
    editSubWorkTypeId.value = ''
    tooltipWorkTypes.value = []
    tooltipSubWorkTypes.value = []

    if (!id) return
    isLoadingTooltipWorkTypes.value = true
    try {
      tooltipWorkTypes.value = await referenceApi.getWorkTypeList(Number(id))
    } finally {
      isLoadingTooltipWorkTypes.value = false
    }
  }

  const handleTooltipWorkTypeChange = async (val: unknown) => {
    const id = String(val ?? '')
    editWorkTypeId.value = id
    editSubWorkTypeId.value = ''
    tooltipSubWorkTypes.value = []

    if (!id) return
    isLoadingTooltipSubWorkTypes.value = true
    try {
      tooltipSubWorkTypes.value = await referenceApi.getSubWorkTypeList(Number(id))
    } finally {
      isLoadingTooltipSubWorkTypes.value = false
    }
  }

  const handleTooltipSubWorkTypeChange = (val: unknown) => {
    editSubWorkTypeId.value = String(val ?? '')
  }

  // 위치 토글 (배열 다중 선택)
  const toggleZone = (id: number) => {
    editZoneIds.value = editZoneIds.value.includes(id)
      ? editZoneIds.value.filter((v) => v !== id)
      : [...editZoneIds.value, id]
  }

  const toggleFloor = (id: number) => {
    editFloorIds.value = editFloorIds.value.includes(id)
      ? editFloorIds.value.filter((v) => v !== id)
      : [...editFloorIds.value, id]
  }

  const toggleSection = (id: number) => {
    editSectionIds.value = editSectionIds.value.includes(id)
      ? editSectionIds.value.filter((v) => v !== id)
      : [...editSectionIds.value, id]
  }

  const toggleUsage = (id: number) => {
    editUsageIds.value = editUsageIds.value.includes(id)
      ? editUsageIds.value.filter((v) => v !== id)
      : [...editUsageIds.value, id]
  }

  // 부재 타입 토글
  const toggleComponentType = (id: number) => {
    editComponentTypeIds.value = editComponentTypeIds.value.includes(id)
      ? editComponentTypeIds.value.filter((v) => v !== id)
      : [...editComponentTypeIds.value, id]
  }

  // 생성 모드 제출 → MutationResponse 반환
  const submitCreate = async (): Promise<MutationResponse | null> => {
    isSavingDetails.value = true
    try {
      const payload: CreateWorkPayload = {
        subWorkTypeId: Number(editSubWorkTypeId.value),
        startDate: createStartDate.value,
        workLeadTime: appConfig.work.defaultLeadTime,
        isWorkingOnHoliday: true,
        zoneIds: editZoneIds.value,
        floorIds: editFloorIds.value,
        sectionIds: editSectionIds.value,
        usageIds: editUsageIds.value,
      }

      if (editComponentTypeIds.value.length > 0) payload.componentTypeIds = editComponentTypeIds.value
      if (editAnnotation.value) payload.annotation = editAnnotation.value

      const response = await workApi.createWork(payload)
      closeDialog()
      return response
    } catch (error: any) {
      console.error('작업 생성 실패:', error)
      const errorMessage = error.response?.data?.message || error.message
      alert(errorMessage)
      return null
    } finally {
      isSavingDetails.value = false
    }
  }

  // 상세 정보 저장 → MutationResponse 반환
  const submitEdit = async (): Promise<MutationResponse | null> => {
    if (!editingWorkId.value) return null
    isSavingDetails.value = true
    try {
      const payload: UpdateWorkPayload = {
        startDate: editStartDate.value,
        workLeadTime: editWorkLeadTime.value,
        zoneIds: editZoneIds.value,
        floorIds: editFloorIds.value,
        sectionIds: editSectionIds.value,
        usageIds: editUsageIds.value,
        componentTypeIds: editComponentTypeIds.value,
        annotation: editAnnotation.value,
      }

      if (editSubWorkTypeId.value) {
        payload.subWorkTypeId = Number(editSubWorkTypeId.value)
      }

      const response = await workApi.updateWork(editingWorkId.value, payload)
      closeDialog()
      return response
    } catch (error: any) {
      console.error('작업 수정 실패:', error)
      const errorMessage = error.response?.data?.message || error.message
      alert(errorMessage)
      return null
    } finally {
      isSavingDetails.value = false
    }
  }

  return {
    divisions,
    tooltipWorkTypes,
    tooltipSubWorkTypes,
    zones,
    floors,
    sections,
    usages,
    componentTypes,
    showDialog,
    editingWorkId,
    isCreateMode,
    createPositionY,
    editDivisionId,
    editWorkTypeId,
    editSubWorkTypeId,
    editZoneIds,
    editFloorIds,
    editSectionIds,
    editUsageIds,
    editComponentTypeIds,
    editAnnotation,
    editStartDate,
    editWorkLeadTime,
    isLoadingTooltipWorkTypes,
    isLoadingTooltipSubWorkTypes,
    isSavingDetails,
    loadReferenceData,
    openDialog,
    openCreateDialog,
    closeDialog,
    initFromWork,
    handleTooltipDivisionChange,
    handleTooltipWorkTypeChange,
    handleTooltipSubWorkTypeChange,
    toggleZone,
    toggleFloor,
    toggleSection,
    toggleUsage,
    toggleComponentType,
    submitCreate,
    submitEdit,
  }
}
