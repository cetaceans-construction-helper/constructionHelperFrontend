import apiClient from './apiClient'
import type { PathResponse } from './workPath'

// 작업 생성 페이로드
export interface CreateWorkPayload {
  subWorkTypeId: number
  componentTypeIds?: number[]
  zoneIds?: number[]
  floorIds?: number[]
  sectionIds?: number[]
  usageIds?: number[]
  startDate: string
  workLeadTime: number
  isWorkingOnHoliday?: boolean
  annotation?: string
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
  subWorkTypeId: number
  zoneNames?: string[]
  zoneIds?: number[]
  floorNames?: string[]
  floorIds?: number[]
  sectionNames?: string[]
  sectionIds?: number[]
  usageNames?: string[]
  usageIds?: number[]
  positionY: number
  componentTypeIds?: number[]
  annotation?: string
}

// Mutation 응답 (Work/WorkPath 변경 시 공통 반환)
export interface MutationResponse {
  updatedWorks: WorkResponse[]
  updatedWorkPaths: PathResponse[]
}

// 작업 수정 페이로드
export interface UpdateWorkPayload {
  startDate?: string
  workLeadTime?: number
  isWorkingOnHoliday?: boolean
  positionY?: number
  subWorkTypeId?: number
  zoneIds?: number[]
  floorIds?: number[]
  sectionIds?: number[]
  usageIds?: number[]
  componentTypeIds?: number[]
  annotation?: string
}

export const workApi = {
  // 작업 생성
  async createWork(payload: CreateWorkPayload): Promise<MutationResponse> {
    const { data } = await apiClient.post<MutationResponse>('/work/createWork', payload)
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
  async updateWork(workId: number, payload: UpdateWorkPayload): Promise<MutationResponse> {
    const { data } = await apiClient.put<MutationResponse>(`/work/updateWork/${workId}`, payload)
    return data
  },

  // 작업 삭제
  async deleteWork(workId: number): Promise<MutationResponse> {
    const { data } = await apiClient.delete<MutationResponse>(`/work/deleteWork/${workId}`)
    return data
  },

  // 특정 날짜의 작업 ID 목록 조회
  async getWorkListByDate(date: string): Promise<number[]> {
    const { data } = await apiClient.get<number[]>('/work/getWorkListByDate', { params: { date } })
    return data
  },
}
