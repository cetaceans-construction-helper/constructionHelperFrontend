import apiClient from './apiClient'
import type { Model3dm, ComponentInfo, Task } from '@/types/model3dm'

export const model3dmApi = {
  async getModel3dmList(): Promise<Model3dm[]> {
    const { data } = await apiClient.get<Model3dm[]>('/model3dm/getModel3dmList')
    return data
  },
}

export const componentApi = {
  async getComponentList(): Promise<ComponentInfo[]> {
    const { data } = await apiClient.get<ComponentInfo[]>('/component/getComponentList')
    return data
  },

  async getComponentListByDate(date: string): Promise<number[]> {
    const { data } = await apiClient.get<number[]>('/component/getComponentListByDate', {
      params: { date },
    })
    return data
  },

  async getComponentListByWork(workId: number): Promise<number[]> {
    const { data } = await apiClient.get<number[]>('/component/getComponentListByWork', {
      params: { workId },
    })
    return data
  },
}

export const taskApi = {
  async getTaskList(componentId: number): Promise<Task[]> {
    const { data } = await apiClient.get<Task[]>('/task/getTaskList', {
      params: { componentId },
    })
    return data
  },
}
