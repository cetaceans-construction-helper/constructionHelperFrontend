import { ref } from 'vue'
import {
  referenceApi,
  type IdNameResponse,
  type WorkTypeResponse,
  type SubWorkTypeResponse,
} from '@/shared/network-core/apis/reference'
import { workApi, type WorkResponse, type UpdateWorkPayload, type CreateWorkPayload, type MutationResponse } from '@/shared/network-core/apis/work'
import { appConfig } from '@/app/bootstrap/config'
import { analyticsClient } from '@/shared/analytics/analyticsClient'

function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((v, i) => v === sb[i])
}

export function useWorkTooltipData(getScheduleVersion?: () => number) {
  // 참조 데이터 (한 번 로드)
  const divisions = ref<IdNameResponse[]>([])
  const tooltipWorkTypes = ref<WorkTypeResponse[]>([])
  const tooltipSubWorkTypes = ref<SubWorkTypeResponse[]>([])
  const zones = ref<IdNameResponse[]>([])
  const floors = ref<IdNameResponse[]>([])
  // TODO: section/usage 임시 비활성화
  // const sections = ref<IdNameResponse[]>([])
  // const usages = ref<IdNameResponse[]>([])
  const componentTypes = ref<IdNameResponse[]>([])

  // 원본 데이터 (변경 비교용)
  const originalWork = ref<WorkResponse | null>(null)

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
  // TODO: section/usage 임시 비활성화
  // const editSectionIds = ref<number[]>([])
  // const editUsageIds = ref<number[]>([])
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
      // TODO: section/usage 임시 비활성화
      const [divList, zoneList, floorList, /* sectionList, usageList, */ ctList] = await Promise.all([
        referenceApi.getDivisionList(),
        referenceApi.getZoneList(),
        referenceApi.getFloorList(),
        // referenceApi.getSectionList(),
        // referenceApi.getUsageList(),
        referenceApi.getComponentTypeList(),
      ])
      divisions.value = divList
      zones.value = zoneList
      floors.value = floorList
      // sections.value = sectionList
      // usages.value = usageList
      componentTypes.value = ctList
    } catch (error) {
      console.error('참조 데이터 로드 실패:', error)
    }
  }

  // 다이얼로그 열기
  const openDialog = async (work: WorkResponse) => {
    editingWorkId.value = work.workId
    isCreateMode.value = false
    await initFromWork(work)
    showDialog.value = true
  }

  // 다이얼로그 닫기
  const closeDialog = () => {
    showDialog.value = false
    editingWorkId.value = null
    isCreateMode.value = false
    originalWork.value = null
  }

  // 생성용 세부공종 표시 이름
  const createSubWorkTypeName = ref('')

  // 생성 모드로 다이얼로그 열기 (더블클릭 위치에서 subWorkTypeId 결정)
  const openCreateDialog = (startDate: string, positionY: number, subWorkTypeId: number, subWorkTypeName: string) => {
    isCreateMode.value = true
    editingWorkId.value = null
    createStartDate.value = startDate
    createPositionY.value = positionY

    // subWorkTypeId는 좌표에서 결정됨
    editSubWorkTypeId.value = String(subWorkTypeId)
    createSubWorkTypeName.value = subWorkTypeName

    // 폼 초기화
    editDivisionId.value = ''
    editWorkTypeId.value = ''
    editZoneIds.value = []
    editFloorIds.value = []
    // TODO: section/usage 임시 비활성화
    // editSectionIds.value = []
    // editUsageIds.value = []
    editComponentTypeIds.value = []
    editAnnotation.value = ''
    tooltipWorkTypes.value = []
    tooltipSubWorkTypes.value = []

    showDialog.value = true
  }

  // WorkResponse로부터 편집 상태 초기화 (ID 필드 직접 사용)
  const initFromWork = async (work: WorkResponse) => {
    originalWork.value = work
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
    // TODO: section/usage 임시 비활성화
    // editSectionIds.value = work.sectionIds ?? []
    // editUsageIds.value = work.usageIds ?? []

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

  // TODO: section/usage 임시 비활성화
  // const toggleSection = (id: number) => {
  //   editSectionIds.value = editSectionIds.value.includes(id)
  //     ? editSectionIds.value.filter((v) => v !== id)
  //     : [...editSectionIds.value, id]
  // }

  // const toggleUsage = (id: number) => {
  //   editUsageIds.value = editUsageIds.value.includes(id)
  //     ? editUsageIds.value.filter((v) => v !== id)
  //     : [...editUsageIds.value, id]
  // }

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
        // TODO: section/usage 임시 비활성화
        // sectionIds: editSectionIds.value,
        // usageIds: editUsageIds.value,
        scheduleVersionId: getScheduleVersion?.() ?? 0,
      }

      if (editComponentTypeIds.value.length > 0) payload.componentTypeIds = editComponentTypeIds.value
      if (editAnnotation.value) payload.annotation = editAnnotation.value

      const response = await workApi.createWork(payload)
      analyticsClient.trackAction('schedule_2d', 'create_work', 'success')
      closeDialog()
      return response
    } catch (error: unknown) {
      console.error('작업 생성 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      analyticsClient.trackAction('schedule_2d', 'create_work', 'fail')
      return null
    } finally {
      isSavingDetails.value = false
    }
  }

  // 상세 정보 저장 → MutationResponse 반환
  const submitEdit = async (): Promise<MutationResponse | null> => {
    if (!editingWorkId.value || !originalWork.value) return null

    const orig = originalWork.value
    const payload: UpdateWorkPayload = {}

    if (editStartDate.value !== orig.startDate) payload.startDate = editStartDate.value
    if (editWorkLeadTime.value !== orig.workLeadTime) payload.workLeadTime = editWorkLeadTime.value
    if (!arraysEqual(editZoneIds.value, orig.zoneIds ?? [])) payload.zoneIds = editZoneIds.value
    if (!arraysEqual(editFloorIds.value, orig.floorIds ?? [])) payload.floorIds = editFloorIds.value
    // TODO: section/usage 임시 비활성화
    // if (!arraysEqual(editSectionIds.value, orig.sectionIds ?? [])) payload.sectionIds = editSectionIds.value
    // if (!arraysEqual(editUsageIds.value, orig.usageIds ?? [])) payload.usageIds = editUsageIds.value
    if (!arraysEqual(editComponentTypeIds.value, orig.componentTypeIds ?? [])) payload.componentTypeIds = editComponentTypeIds.value
    if (editAnnotation.value !== (orig.annotation || '')) payload.annotation = editAnnotation.value
    if (editSubWorkTypeId.value && Number(editSubWorkTypeId.value) !== orig.subWorkTypeId) payload.subWorkTypeId = Number(editSubWorkTypeId.value)

    if (Object.keys(payload).length === 0) {
      closeDialog()
      return null
    }

    isSavingDetails.value = true
    try {
      const response = await workApi.updateWork(editingWorkId.value, payload)
      analyticsClient.trackAction('schedule_2d', 'update_work', 'success')
      closeDialog()
      return response
    } catch (error: unknown) {
      console.error('작업 수정 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      analyticsClient.trackAction('schedule_2d', 'update_work', 'fail')
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
    // TODO: section/usage 임시 비활성화
    // sections,
    // usages,
    componentTypes,
    showDialog,
    editingWorkId,
    isCreateMode,
    createPositionY,
    createSubWorkTypeName,
    editDivisionId,
    editWorkTypeId,
    editSubWorkTypeId,
    editZoneIds,
    editFloorIds,
    // TODO: section/usage 임시 비활성화
    // editSectionIds,
    // editUsageIds,
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
    // TODO: section/usage 임시 비활성화
    // toggleSection,
    // toggleUsage,
    toggleComponentType,
    submitCreate,
    submitEdit,
  }
}
