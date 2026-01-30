import apiClient from './apiClient'
import type { Task } from '@/types/object3d'

export const taskApi = {
  /**
   * 특정 Object3d에 연결된 Task 목록 조회
   */
  async getTaskList(object3dId: number): Promise<Task[]> {
    const { data } = await apiClient.get<Task[]>('/task/getTaskList', {
      params: { object3dId },
    })
    return data
  },
}
