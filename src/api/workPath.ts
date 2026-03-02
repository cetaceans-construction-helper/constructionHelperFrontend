import apiClient from './apiClient'
import type { MutationResponse } from './work'

export interface PathEdge {
  sourceWorkId: number
  targetWorkId: number
  lagDays?: number | null
}

export interface PathResponse {
  workPathId: number
  workPathName: string | null
  critical: boolean
  workPathColor: string
  edges: PathEdge[]
}

export interface CreatePathRequest {
  sourceWorkId: number
  targetWorkId: number
}

export interface UpdateWorkPathPayload {
  edges?: PathEdge[]
  workPathName?: string
  workPathColor?: string
  critical?: boolean
}

export const workPathApi = {
  async getPathList(): Promise<PathResponse[]> {
    const { data } = await apiClient.get<PathResponse[]>('/workPath/getWorkPathList')
    return data
  },

  async createPath(request: CreatePathRequest): Promise<MutationResponse> {
    const { data } = await apiClient.post<MutationResponse>('/workPath/createWorkPath', request)
    return data
  },

  // 패스 수정
  async updateWorkPath(pathId: number, payload: UpdateWorkPathPayload): Promise<MutationResponse> {
    const { data } = await apiClient.put<MutationResponse>(`/workPath/updateWorkPath/${pathId}`, payload)
    return data
  },

  // 패스 삭제
  async deleteWorkPath(pathId: number): Promise<MutationResponse> {
    const { data } = await apiClient.delete<MutationResponse>(`/workPath/deleteWorkPath/${pathId}`)
    return data
  },

  // 전체 경로 최적화 (당기기)
  async optimizePaths(): Promise<MutationResponse> {
    const { data } = await apiClient.post<MutationResponse>('/workPath/optimizePaths')
    return data
  },

  // 단일 경로 최적화 (당기기)
  async optimizePath(pathId: number): Promise<MutationResponse> {
    const { data } = await apiClient.post<MutationResponse>(`/workPath/optimizePath/${pathId}`)
    return data
  }
}
