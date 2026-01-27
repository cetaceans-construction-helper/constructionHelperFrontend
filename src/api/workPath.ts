import apiClient from './apiClient'

export interface PathEdge {
  sourceWorkId: number
  targetWorkId: number
}

export interface PathResponse {
  workPathId: number
  workPathName: string
  critical: boolean
  workPathColor: string
  edges: PathEdge[]
}

export interface CreatePathRequest {
  workPathName: string
  workPathColor: string
}

export const workPathApi = {
  async getPathList(): Promise<PathResponse[]> {
    const { data } = await apiClient.get<PathResponse[]>('/workPath/getWorkPathList')
    return data
  },

  async createPath(request: CreatePathRequest): Promise<PathResponse> {
    const { data } = await apiClient.post<PathResponse>('/workPath/createWorkPath', request)
    return data
  },

  // 패스 수정
  async updateWorkPath(pathId: number, edges: PathEdge[]): Promise<void> {
    await apiClient.put(`/workPath/updateWorkPath/${pathId}`, { edges })
  },

  // 패스 최적화
  async optimizeWorkPath(pathId: number | 'all'): Promise<void> {
    await apiClient.put(`/workPath/optimizeWorkPath/${pathId}`)
  },

  // 패스 삭제
  async deleteWorkPath(pathId: number): Promise<void> {
    await apiClient.delete(`/workPath/deleteWorkPath/${pathId}`)
  }
}
