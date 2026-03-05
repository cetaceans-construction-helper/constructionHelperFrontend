import apiClient from '@/shared/network-core/apiClient'
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

// 작업 사진 응답 타입
export interface WorkPhotoResponse {
  photoId: number
  url: string
  description: string
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
  photos?: WorkPhotoResponse[]
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

  // 특정 날짜의 작업 목록 조회
  async getWorkListByDate(date: string): Promise<WorkResponse[]> {
    const { data } = await apiClient.get<WorkResponse[]>('/work/getWorkListByDate', {
      params: { date },
    })
    return data
  },

  // 작업 사진 업로드
  async createWorkPhoto(
    workId: number,
    photoDate: string,
    photos: File[],
    descriptions?: string[],
  ): Promise<void> {
    const formData = new FormData()
    formData.append('workId', String(workId))
    formData.append('photoDate', photoDate)
    photos.forEach((file) => formData.append('photos', file))
    if (descriptions) {
      descriptions.forEach((desc) => formData.append('descriptions', desc))
    }
    await apiClient.post('/work/createWorkPhoto', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    })
  },

  // 작업 사진 설명 수정
  async updateWorkPhoto(photoId: number, description: string): Promise<void> {
    await apiClient.put(`/work/updateWorkPhoto/${photoId}`, { description })
  },

  // 작업 사진 삭제
  async deleteWorkPhoto(photoId: number): Promise<void> {
    await apiClient.delete(`/work/deleteWorkPhoto/${photoId}`)
  },

  // 작업 사진 다운로드 (ObjectURL 반환)
  async downloadWorkPhoto(url: string): Promise<string> {
    const { data } = await apiClient.get<Blob>('/materialDelivery/downloadFile', {
      params: { url },
      responseType: 'blob',
    })
    return URL.createObjectURL(data)
  },
}
