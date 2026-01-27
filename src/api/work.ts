import apiClient from './apiClient'

// 작업 생성 페이로드
export interface CreateWorkPayload {
  subWorkTypeId: number
  zone?: string
  floor?: string
  section?: string
  usage?: string
  startDate: string
  workLeadTime: number
  isWorkingOnHoliday?: boolean
}

// 작업 응답 타입
export interface WorkResponse {
  workId: number
  projectId: string
  workName: string
  startDate: string
  workLeadTime: number
  completionDate: string
  isWorkingOnHoliday: boolean
  divisionName: string
  workTypeName: string
  subWorkTypeName: string
  zone?: string
  floor?: string
  section?: string
  usage?: string
  componentIds: number[]
  positionX: number
  positionY: number
  width: number
  height: number
}

// 작업 수정 페이로드
export interface UpdateWorkPayload {
  startDate: string
  workLeadTime: number
  isWorkingOnHoliday?: boolean
}

export const workApi = {
  // 작업 생성
  async createWork(payload: CreateWorkPayload) {
    const { data } = await apiClient.post('/work/createWork', payload)
    return data
  },

  // 작업 목록 조회
  async getWorkList(): Promise<WorkResponse[]> {
    const { data } = await apiClient.get<WorkResponse[]>('/work/getWorkList')
    return data
  },

  // 단일 작업 조회
  async getWork(workId: number): Promise<WorkResponse> {
    const { data } = await apiClient.get<WorkResponse>(`/work/getWork/${workId}`)
    return data
  },

  // Y 위치 업데이트
  async updateWorkPositionY(workId: number, positionY: number): Promise<void> {
    await apiClient.put(`/work/updateWorkPositionY/${workId}`, { positionY })
  },

  // 작업 수정 (startDate, workLeadTime)
  async updateWork(workId: number, payload: UpdateWorkPayload): Promise<void> {
    await apiClient.put(`/work/updateWork/${workId}`, payload)
  },

  // 작업 삭제
  async deleteWork(workId: number): Promise<void> {
    await apiClient.delete(`/work/deleteWork/${workId}`)
  },
}
