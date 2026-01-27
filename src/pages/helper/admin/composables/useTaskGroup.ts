import { ref, watch } from 'vue'
import { taskGroupApi, type TaskGroupMappingResponse } from '@/api/taskGroup'
import {
  subWorkTypeApi,
  type Division,
  type WorkType,
  type SubWorkType,
  type IdNameResponse,
} from '@/api/subWorkType'

export function useTaskGroup() {
  // TaskGroup 관리
  const taskGroups = ref<IdNameResponse[]>([])
  const newTaskGroupName = ref('')
  const isCreatingGroup = ref(false)

  // 매핑 관리
  const mappings = ref<TaskGroupMappingResponse[]>([])
  const selectedTaskGroupName = ref('')
  const isCreatingMapping = ref(false)

  // 매핑 폼: 캐스케이딩 셀렉트
  const divisions = ref<Division[]>([])
  const workTypes = ref<WorkType[]>([])
  const subWorkTypes = ref<SubWorkType[]>([])

  const mappingForm = ref({
    divisionId: '',
    workTypeId: '',
    subWorkTypeId: '',
  })

  const isLoadingWorkTypes = ref(false)
  const isLoadingSubWorkTypes = ref(false)

  // TaskGroup 목록 로드
  const loadTaskGroups = async () => {
    try {
      taskGroups.value = await taskGroupApi.getTaskGroupList()
    } catch (error) {
      console.error('TaskGroup 목록 로드 실패:', error)
    }
  }

  // 매핑 목록 로드
  const loadMappings = async (taskGroupName: string) => {
    if (!taskGroupName) {
      mappings.value = []
      return
    }
    try {
      mappings.value = await taskGroupApi.getTaskGroupMappingList(taskGroupName)
    } catch (error) {
      console.error('매핑 목록 로드 실패:', error)
    }
  }

  // Division 목록 로드 (캐스케이딩용)
  const loadDivisions = async () => {
    try {
      divisions.value = await subWorkTypeApi.getDivisionList()
    } catch (error) {
      console.error('Division 목록 로드 실패:', error)
    }
  }

  // TaskGroup 추가
  const addTaskGroup = async () => {
    const name = newTaskGroupName.value.trim()
    if (!name) return

    isCreatingGroup.value = true
    try {
      await taskGroupApi.createTaskGroup(name)
      newTaskGroupName.value = ''
      await loadTaskGroups()
    } catch (error: unknown) {
      console.error('TaskGroup 추가 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreatingGroup.value = false
    }
  }

  // 매핑 추가
  const addMapping = async () => {
    if (!selectedTaskGroupName.value || !mappingForm.value.subWorkTypeId) return

    isCreatingMapping.value = true
    try {
      await taskGroupApi.createTaskGroupMapping(
        selectedTaskGroupName.value,
        Number(mappingForm.value.subWorkTypeId),
      )
      mappingForm.value = { divisionId: '', workTypeId: '', subWorkTypeId: '' }
      await loadMappings(selectedTaskGroupName.value)
    } catch (error: unknown) {
      console.error('매핑 추가 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreatingMapping.value = false
    }
  }

  // 캐스케이딩 셀렉트 watch
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
        workTypes.value = await subWorkTypeApi.getWorkTypeList(Number(divisionId))
      } catch (error) {
        console.error('WorkType 목록 로드 실패:', error)
      } finally {
        isLoadingWorkTypes.value = false
      }
    },
  )

  watch(
    () => mappingForm.value.workTypeId,
    async (workTypeId) => {
      subWorkTypes.value = []
      mappingForm.value.subWorkTypeId = ''
      if (!workTypeId) return

      isLoadingSubWorkTypes.value = true
      try {
        subWorkTypes.value = await subWorkTypeApi.getSubWorkTypeList(Number(workTypeId))
      } catch (error) {
        console.error('SubWorkType 목록 로드 실패:', error)
      } finally {
        isLoadingSubWorkTypes.value = false
      }
    },
  )

  // TaskGroup 선택 시 매핑 로드
  watch(selectedTaskGroupName, (name) => {
    loadMappings(name)
  })

  return {
    taskGroups,
    newTaskGroupName,
    isCreatingGroup,
    mappings,
    selectedTaskGroupName,
    isCreatingMapping,
    divisions,
    workTypes,
    subWorkTypes,
    mappingForm,
    isLoadingWorkTypes,
    isLoadingSubWorkTypes,
    loadTaskGroups,
    loadDivisions,
    addTaskGroup,
    addMapping,
  }
}
