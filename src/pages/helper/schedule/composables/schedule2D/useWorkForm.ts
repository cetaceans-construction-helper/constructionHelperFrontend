import { ref, watch } from 'vue'
import {
  referenceApi,
  type IdNameResponse,
  type WorkTypeResponse,
  type SubWorkTypeResponse,
} from '@/api/reference'
import { workApi } from '@/api/work'
import { projectApi } from '@/api/project'
import type { Project } from '@/types/project'


export function useWorkForm(onWorkCreated: () => Promise<void>) {
  // 오늘 날짜 (YYYY-MM-DD 형식, 로컬 시간 기준)
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  // 작업 생성 폼 상태
  const workFormState = ref({
    division_id: '',
    work_type_id: '',
    sub_work_type_id: '',
    component_type_ids: [] as string[],
    zone_id: '',
    floor_id: '',
    section_id: '',
    usage_id: '',
    start_date: today,
    work_days: 7,
    isWorkingOnHoliday: true,
  })

  // 공종 분류 옵션 (id 기반)
  const divisions = ref<IdNameResponse[]>([])
  const workTypes = ref<WorkTypeResponse[]>([])
  const subWorkTypes = ref<SubWorkTypeResponse[]>([])

  // 부재 타입 옵션
  const componentTypes = ref<IdNameResponse[]>([])

  // 위치 분류 옵션 (IdNameResponse 사용)
  const locationOptions = ref<{
    zone: IdNameResponse[]
    floor: IdNameResponse[]
    section: IdNameResponse[]
    usage: IdNameResponse[]
  }>({
    zone: [],
    floor: [],
    section: [],
    usage: [],
  })

  // 프로젝트 목록
  const projects = ref<Project[]>([])

  const isCreatingWork = ref(false)
  const isLoadingWorkTypes = ref(false)
  const isLoadingSubWorkTypes = ref(false)

  // 작업 생성 함수 (성공 시 true 반환)
  const createWork = async (): Promise<boolean> => {
    const {
      start_date,
      work_days,
      sub_work_type_id,
      component_type_ids,
      zone_id,
      floor_id,
      section_id,
      usage_id,
      isWorkingOnHoliday,
    } = workFormState.value

    // 필수 값 검증
    if (!sub_work_type_id) {
      alert('공종을 선택해주세요.')
      return false
    }
    if (component_type_ids.length === 0) {
      alert('부재타입을 선택해주세요.')
      return false
    }
    if (!start_date) {
      alert('시작일을 입력해주세요.')
      return false
    }

    isCreatingWork.value = true
    try {
      const payload = {
        subWorkTypeId: Number(sub_work_type_id),
        componentTypeIds: component_type_ids.map(Number),
        startDate: start_date,
        workLeadTime: work_days,
        isWorkingOnHoliday,
        ...(zone_id && zone_id !== 'none' && { zoneId: Number(zone_id) }),
        ...(floor_id && floor_id !== 'none' && { floorId: Number(floor_id) }),
        ...(section_id && section_id !== 'none' && { sectionId: Number(section_id) }),
        ...(usage_id && usage_id !== 'none' && { usageId: Number(usage_id) }),
      }

      await workApi.createWork(payload)
      await onWorkCreated()
      return true
    } catch (error: any) {
      console.error('작업 생성 실패:', error)
      const errorMessage = error.response?.data?.message || error.message
      alert(errorMessage)
      return false
    } finally {
      isCreatingWork.value = false
    }
  }

  // 초기 데이터 로드
  const loadInitialData = async () => {
    try {
      const [divisionList, zones, floors, sections, usages, projectList, componentTypeList] = await Promise.all([
        referenceApi.getDivisionList(),
        referenceApi.getZoneList(),
        referenceApi.getFloorList(),
        referenceApi.getSectionList(),
        referenceApi.getUsageList(),
        projectApi.getProjects(),
        referenceApi.getComponentTypeList(),
      ])

      divisions.value = divisionList
      projects.value = projectList
      componentTypes.value = componentTypeList
      locationOptions.value = {
        zone: zones,
        floor: floors,
        section: sections,
        usage: usages,
      }
    } catch (error) {
      console.error('초기 데이터 로드 실패:', error)
    }
  }

  // Division 선택 시 WorkTypes 로드
  const loadWorkTypes = async (divisionId: number) => {
    isLoadingWorkTypes.value = true
    workTypes.value = []
    subWorkTypes.value = []
    workFormState.value.work_type_id = ''
    workFormState.value.sub_work_type_id = ''

    try {
      workTypes.value = await referenceApi.getWorkTypeList(divisionId)
    } catch (error) {
      console.error('WorkTypes 로드 실패:', error)
    } finally {
      isLoadingWorkTypes.value = false
    }
  }

  // WorkType 선택 시 SubWorkTypes 로드
  const loadSubWorkTypes = async (workTypeId: number) => {
    isLoadingSubWorkTypes.value = true
    subWorkTypes.value = []
    workFormState.value.sub_work_type_id = ''

    try {
      subWorkTypes.value = await referenceApi.getSubWorkTypeList(workTypeId)
    } catch (error) {
      console.error('SubWorkTypes 로드 실패:', error)
    } finally {
      isLoadingSubWorkTypes.value = false
    }
  }

  // 연쇄 셀렉트 watch
  watch(
    () => workFormState.value.division_id,
    (newVal) => {
      if (newVal) {
        loadWorkTypes(Number(newVal))
      } else {
        workTypes.value = []
        subWorkTypes.value = []
        workFormState.value.work_type_id = ''
        workFormState.value.sub_work_type_id = ''
      }
    },
  )

  watch(
    () => workFormState.value.work_type_id,
    (newVal) => {
      if (newVal) {
        loadSubWorkTypes(Number(newVal))
      } else {
        subWorkTypes.value = []
        workFormState.value.sub_work_type_id = ''
      }
    },
  )

  return {
    // State
    workFormState,
    divisions,
    workTypes,
    subWorkTypes,
    componentTypes,
    locationOptions,
    projects,
    isCreatingWork,
    isLoadingWorkTypes,
    isLoadingSubWorkTypes,

    // Methods
    createWork,
    loadInitialData,
  }
}
