import apiClient from '@/shared/network-core/apiClient'
import type { Object3d } from '@/shared/network-core/contracts/object3d'

export const object3dApi = {
  /**
   * 전체 Object3d 목록 조회
   */
  async getObject3dList(): Promise<Object3d[]> {
    const { data } = await apiClient.get<Object3d[]>('/object3d/getObject3dList')
    return data
  },

  /**
   * 특정 Work에 연결된 Object3d ID 목록 조회
   */
  async getObject3dListByWork(workId: number): Promise<number[]> {
    const { data } = await apiClient.get<number[]>('/object3d/getObject3dListByWork', {
      params: { workId },
    })
    return data
  },

  /**
   * 특정 날짜에 작업이 있는 Object3d ID 목록 조회
   */
  async getObject3dListByDate(date: string): Promise<number[]> {
    const { data } = await apiClient.get<number[]>('/object3d/getObject3dListByDate', {
      params: { date },
    })
    return data
  },

  /**
   * 3D 객체 일괄 수정 (zone/floor/componentCode/layerColor)
   */
  async updateObject3dList(items: {
    id: number
    zoneId?: number | null
    floorId?: number | null
    componentCodeId?: number | null
    layerColor?: Record<string, unknown> | null
  }[]): Promise<Object3d[]> {
    const { data } = await apiClient.put<Object3d[]>('/object3d/updateObject3dList', items)
    return data
  },
}
