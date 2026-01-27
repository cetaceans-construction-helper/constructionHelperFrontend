import apiClient from './apiClient'
import type { IdNameResponse } from './subWorkType'

export interface TaskGroupMappingResponse {
  subWorkTypeId: number
  subWorkTypeName: string
  workTypeId: number
  workTypeName: string
  divisionId: number
  divisionName: string
}

export const taskGroupApi = {
  // GET - 목록 조회
  async getTaskGroupList(): Promise<IdNameResponse[]> {
    const { data } = await apiClient.get<IdNameResponse[]>('/taskGroup/getTaskGroupList')
    return data
  },

  async getTaskGroupMappingList(taskGroupName: string): Promise<TaskGroupMappingResponse[]> {
    const { data } = await apiClient.get<TaskGroupMappingResponse[]>(
      '/taskGroup/getTaskGroupMappingList',
      { params: { taskGroupName } },
    )
    return data
  },

  // POST - 생성
  async createTaskGroup(name: string): Promise<IdNameResponse> {
    const { data } = await apiClient.post<IdNameResponse>('/taskGroup/createTaskGroup', { name })
    return data
  },

  async createTaskGroupMapping(taskGroupName: string, subWorkTypeId: number): Promise<void> {
    await apiClient.post('/taskGroup/createTaskGroupMapping', {
      taskGroupName,
      subWorkTypeId,
    })
  },
}
