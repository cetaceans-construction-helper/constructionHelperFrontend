import apiClient from './apiClient'

// 작업 생성 페이로드
export interface CreateWorkPayload {
  subWorkTypeId: number
  componentTypeIds?: number[]
  zoneId?: number
  floorId?: number
  sectionId?: number
  usageId?: number
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
  division: string
  workType: string
  subWorkType: string
  zone?: string
  floor?: string
  section?: string
  usage?: string
  positionY: number
  componentTypeIds?: number[]
}

// 작업 수정 페이로드
export interface UpdateWorkPayload {
  startDate?: string
  workLeadTime?: number
  isWorkingOnHoliday?: boolean
  positionY?: number
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

  // 작업 수정
  async updateWork(workId: number, payload: UpdateWorkPayload): Promise<void> {
    await apiClient.put(`/work/updateWork/${workId}`, payload)
  },

  // 작업 삭제
  async deleteWork(workId: number): Promise<void> {
    await apiClient.delete(`/work/deleteWork/${workId}`)
  },

  // 특정 날짜의 작업 ID 목록 조회
  async getWorkListByDate(date: string): Promise<number[]> {
    const { data } = await apiClient.get<number[]>('/work/getWorkListByDate', { params: { date } })
    return data
  },
}
