import { ref, watch } from 'vue'
import {
  subWorkTypeApi,
  type Division,
  type WorkType,
  type SubWorkType,
} from '@/api/subWorkType'
import { workLocationApi } from '@/api/workLocation'
import { workApi } from '@/api/work'
import { projectApi } from '@/api/project'
import type { Project } from '@/types/project'

interface SelectOption {
  value: string
  label: string
}

export function useWorkForm(onWorkCreated: () => Promise<void>) {
  // 오늘 날짜 (YYYY-MM-DD 형식)
  const today = new Date().toISOString().split('T')[0]!

  // 작업 생성 폼 상태
  const workFormState = ref({
    division_id: '',
    work_type_id: '',
    sub_work_type_id: '',
    zone: 'none',
    floor: 'none',
    section: 'none',
    usage: 'none',
    start_date: today,
    work_days: 7,
    isWorkingOnHoliday: true,
  })

  // 공종 분류 옵션 (id 기반)
  const divisions = ref<Division[]>([])
  const workTypes = ref<WorkType[]>([])
  const subWorkTypes = ref<SubWorkType[]>([])

  // 위치 분류 옵션
  const locationOptions = ref<{
    zone: SelectOption[]
    floor: SelectOption[]
    section: SelectOption[]
    usage: SelectOption[]
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
      zone,
      floor,
      section,
      usage,
      isWorkingOnHoliday,
    } = workFormState.value

    // 필수 값 검증
    if (!sub_work_type_id) {
      alert('공종을 선택해주세요.')
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
        startDate: start_date,
        workLeadTime: work_days,
        isWorkingOnHoliday,
        ...(zone !== 'none' && { zone }),
        ...(floor !== 'none' && { floor }),
        ...(section !== 'none' && { section }),
        ...(usage !== 'none' && { usage }),
      }

      await workApi.createWork(payload)
      alert('작업이 생성되었습니다.')
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
      const [divisionList, zones, floors, sections, usages, projectList] = await Promise.all([
        subWorkTypeApi.getDivisionList(),
        workLocationApi.getZoneList(),
        workLocationApi.getFloorList(),
        workLocationApi.getSectionList(),
        workLocationApi.getUsageList(),
        projectApi.getProjects(),
      ])

      divisions.value = divisionList
      projects.value = projectList
      locationOptions.value = {
        zone: zones.map((item) => ({ value: item.name, label: item.name })),
        floor: floors.map((item) => ({ value: item.name, label: item.name })),
        section: sections.map((item) => ({ value: item.name, label: item.name })),
        usage: usages.map((item) => ({ value: item.name, label: item.name })),
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
      workTypes.value = await subWorkTypeApi.getWorkTypeList(divisionId)
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
      subWorkTypes.value = await subWorkTypeApi.getSubWorkTypeList(workTypeId)
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
