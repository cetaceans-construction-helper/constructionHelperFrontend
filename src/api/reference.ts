import apiClient from './apiClient'

// 공통 타입
export interface IdNameResponse {
  id: number
  name: string
}

// 공종 분류 타입
export interface WorkTypeResponse {
  id: number
  name: string
  divisionId: number
}

export interface SubWorkTypeResponse {
  id: number
  name: string
  workTypeId: number
}

// 부재 코드 타입
export interface ComponentCodeResponse {
  id: number
  componentTypeId: number
  code: string
}

export interface ComponentCodeMappingResponse {
  componentCodeId: number
  componentCode: string
  subWorkTypeId: number
  subWorkTypeName: string
  workTypeName: string
  divisionName: string
}

export interface BulkMappingResponse {
  mappedCount: number
}

export const referenceApi = {
  // ========== 공종 분류 (Division → WorkType → SubWorkType) ==========

  async getDivisionList(): Promise<IdNameResponse[]> {
    const { data } = await apiClient.get<IdNameResponse[]>('/reference/getDivisionList')
    return data
  },

  async createDivision(name: string): Promise<IdNameResponse> {
    const { data } = await apiClient.post<IdNameResponse>('/reference/createDivision', { name })
    return data
  },

  async getWorkTypeList(divisionId: number): Promise<WorkTypeResponse[]> {
    const { data } = await apiClient.get<WorkTypeResponse[]>('/reference/getWorkTypeList', {
      params: { divisionId },
    })
    return data
  },

  async createWorkType(divisionId: number, name: string): Promise<WorkTypeResponse> {
    const { data } = await apiClient.post<WorkTypeResponse>('/reference/createWorkType', {
      divisionId,
      name,
    })
    return data
  },

  async getSubWorkTypeList(workTypeId: number): Promise<SubWorkTypeResponse[]> {
    const { data } = await apiClient.get<SubWorkTypeResponse[]>('/reference/getSubWorkTypeList', {
      params: { workTypeId },
    })
    return data
  },

  async createSubWorkType(workTypeId: number, name: string): Promise<SubWorkTypeResponse> {
    const { data } = await apiClient.post<SubWorkTypeResponse>('/reference/createSubWorkType', {
      workTypeId,
      name,
    })
    return data
  },

  // ========== 작업 위치 (Zone / Floor / Section / Usage) ==========

  async getZoneList(): Promise<IdNameResponse[]> {
    const { data } = await apiClient.get<IdNameResponse[]>('/reference/getZoneList')
    return data
  },

  async createZone(name: string): Promise<IdNameResponse> {
    const { data } = await apiClient.post<IdNameResponse>('/reference/createZone', { name })
    return data
  },

  async getFloorList(): Promise<IdNameResponse[]> {
    const { data } = await apiClient.get<IdNameResponse[]>('/reference/getFloorList')
    return data
  },

  async createFloor(name: string): Promise<IdNameResponse> {
    const { data } = await apiClient.post<IdNameResponse>('/reference/createFloor', { name })
    return data
  },

  async getSectionList(): Promise<IdNameResponse[]> {
    const { data } = await apiClient.get<IdNameResponse[]>('/reference/getSectionList')
    return data
  },

  async createSection(name: string): Promise<IdNameResponse> {
    const { data } = await apiClient.post<IdNameResponse>('/reference/createSection', { name })
    return data
  },

  async getUsageList(): Promise<IdNameResponse[]> {
    const { data } = await apiClient.get<IdNameResponse[]>('/reference/getUsageList')
    return data
  },

  async createUsage(name: string): Promise<IdNameResponse> {
    const { data } = await apiClient.post<IdNameResponse>('/reference/createUsage', { name })
    return data
  },

  // ========== 부재 코드 (ComponentType → ComponentCode) ==========

  async getComponentTypeList(): Promise<IdNameResponse[]> {
    const { data } = await apiClient.get<IdNameResponse[]>('/reference/getComponentTypeList')
    return data
  },

  async createComponentType(name: string): Promise<IdNameResponse> {
    const { data } = await apiClient.post<IdNameResponse>('/reference/createComponentType', {
      name,
    })
    return data
  },

  async getComponentCodeList(componentTypeId?: number): Promise<ComponentCodeResponse[]> {
    const { data } = await apiClient.get<ComponentCodeResponse[]>('/reference/getComponentCodeList', {
      params: componentTypeId != null ? { componentTypeId } : undefined,
    })
    return data
  },

  async createComponentCode(componentTypeId: number, code: string): Promise<ComponentCodeResponse> {
    const { data } = await apiClient.post<ComponentCodeResponse>('/reference/createComponentCode', {
      componentTypeId,
      code,
    })
    return data
  },

  async getComponentCodeMappingList(componentCodeId?: number): Promise<ComponentCodeMappingResponse[]> {
    const { data } = await apiClient.get<ComponentCodeMappingResponse[]>(
      '/reference/getComponentCodeMappingList',
      { params: componentCodeId != null ? { componentCodeId } : undefined },
    )
    return data
  },

  async createComponentCodeMapping(
    componentCodeId: number,
    subWorkTypeId: number,
    componentTypeId?: number,
  ): Promise<ComponentCodeMappingResponse | BulkMappingResponse> {
    const { data } = await apiClient.post<ComponentCodeMappingResponse | BulkMappingResponse>(
      '/reference/createComponentCodeMapping',
      {
        componentCodeId: componentCodeId || 0,
        subWorkTypeId,
        ...(componentTypeId != null && { componentTypeId }),
      },
    )
    return data
  },
}
