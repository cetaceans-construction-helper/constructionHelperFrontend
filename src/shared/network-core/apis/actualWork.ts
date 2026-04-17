import apiClient from '@/shared/network-core/apiClient'

export interface ActualWorkZoneResponse {
  id: number
  name: string
}

export interface ActualWorkFloorResponse {
  id: number
  name: string
}

export interface ActualWorkComponentTypeResponse {
  id: number
  name: string
}

export interface ActualWorkPhotoResponse {
  photoId: number
  url: string
  thumbnailUrl: string
  description: string
}

// 실제 작업 응답 (pgvector 자동 매칭 결과 + 사진 포함)
export interface ActualWorkResponse {
  id: number
  date: string
  workName: string
  workTypeId: number
  workTypeName: string
  subWorkTypeId: number
  subWorkTypeName: string
  zones: ActualWorkZoneResponse[]
  floors: ActualWorkFloorResponse[]
  componentTypes: ActualWorkComponentTypeResponse[]
  photos: ActualWorkPhotoResponse[]
}

export interface CreateActualWorkPayload {
  date: string
  workTypeId: number
  workName: string
}

export interface UpdateActualWorkPayload {
  date?: string
  workTypeId?: number
  workName?: string
}

export const actualWorkApi = {
  // 실제 작업 생성 (+ 자동 매칭)
  async createActualWork(payload: CreateActualWorkPayload): Promise<ActualWorkResponse> {
    const { data } = await apiClient.post<ActualWorkResponse>('/actualWork/createActualWork', payload)
    return data
  },

  // 날짜별 조회
  async getActualWorkListByDate(date: string): Promise<ActualWorkResponse[]> {
    const { data } = await apiClient.get<ActualWorkResponse[]>(
      '/actualWork/getActualWorkListByDate',
      { params: { date } },
    )
    return data
  },

  // 기간 조회
  async getActualWorkListBetween(startDate: string, endDate: string): Promise<ActualWorkResponse[]> {
    const { data } = await apiClient.get<ActualWorkResponse[]>(
      '/actualWork/getActualWorkListBetween',
      { params: { startDate, endDate } },
    )
    return data
  },

  // 수정 (workName/workTypeId 변경 시 재매칭)
  async updateActualWork(id: number, payload: UpdateActualWorkPayload): Promise<ActualWorkResponse> {
    const { data } = await apiClient.put<ActualWorkResponse>(
      `/actualWork/updateActualWork/${id}`,
      payload,
    )
    return data
  },

  // 삭제
  async deleteActualWork(id: number): Promise<void> {
    await apiClient.delete(`/actualWork/deleteActualWork/${id}`)
  },

  // 입력 날짜 이후(exclusive) 실적이 존재하는 가장 빠른 날짜. 없으면 date+1.
  async getNextDateWithActualWorkChecker(date: string): Promise<{ date: string }> {
    const { data } = await apiClient.get<{ date: string }>(
      '/actualWork/getNextDateWithActualWorkChecker',
      { params: { date } },
    )
    return data
  },
}
