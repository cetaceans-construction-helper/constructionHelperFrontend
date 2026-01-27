import apiClient from './apiClient'

// 공종 분류 타입
export interface Division {
  id: number
  name: string
}

export interface WorkType {
  id: number
  name: string
  divisionId: number
}

export interface SubWorkType {
  id: number
  name: string
  workTypeId: number
}

export interface IdNameResponse {
  id: number
  name: string
}

export const subWorkTypeApi = {
  // GET - 목록 조회
  async getDivisionList(): Promise<Division[]> {
    const { data } = await apiClient.get<Division[]>('/subWorkType/getDivisionList')
    return data
  },

  async getWorkTypeList(divisionId: number): Promise<WorkType[]> {
    const { data } = await apiClient.get<WorkType[]>('/subWorkType/getWorkTypeList', {
      params: { divisionId },
    })
    return data
  },

  async getSubWorkTypeList(workTypeId: number): Promise<SubWorkType[]> {
    const { data } = await apiClient.get<SubWorkType[]>('/subWorkType/getSubWorkTypeList', {
      params: { workTypeId },
    })
    return data
  },

  // POST - 생성
  async createDivision(name: string): Promise<IdNameResponse> {
    const { data } = await apiClient.post<IdNameResponse>('/subWorkType/createDivision', { name })
    return data
  },

  async createWorkType(name: string, divisionId: number): Promise<IdNameResponse> {
    const { data } = await apiClient.post<IdNameResponse>('/subWorkType/createWorkType', {
      name,
      divisionId,
    })
    return data
  },

  async createSubWorkType(name: string, workTypeId: number): Promise<IdNameResponse> {
    const { data } = await apiClient.post<IdNameResponse>('/subWorkType/createSubWorkType', {
      name,
      workTypeId,
    })
    return data
  },
}
