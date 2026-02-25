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

export interface WorkStepResponse {
  id: number
  name: string
  subWorkTypeId: number
}

// 직종(LaborType) 타입
export interface LaborTypeResponse {
  id: number
  name: string
  workTypeId: number
  workTypeName: string
  subWorkTypeId: number | null
  subWorkTypeName: string | null
}

// 장비 마스터 타입
export interface EquipmentTypeResponse {
  id: number
  name: string
}

export interface EquipmentSpecResponse {
  id: number
  name: string
  equipmentTypeId: number
  equipmentTypeName: string
}

// 자재 마스터 타입
export interface MaterialTypeResponse {
  id: number
  name: string
  unit: string
}

export interface MaterialSpecResponse {
  id: number
  name: string
  materialTypeId: number
}

// 부재 코드 타입
export interface ComponentCodeResponse {
  id: number
  componentTypeId: number
  code: string
}

export interface ComponentCodeMappingResponse {
  id: number
  componentCodeId: number
  componentCodeName: string
  componentTypeName: string
  workStepId: number
  workStepName: string
  subWorkTypeName: string
  workTypeName: string
  divisionName: string
  materialSpecId: number | null
  materialSpecName: string | null
  materialTypeName: string | null
  unitName: string | null
}

export interface MappingResultResponse {
  mappedCount: number
  skippedCount: number
  componentCodeCount: number
  workStepCount: number
}

export interface UpdateMappingResultResponse {
  updatedCount: number
  materialSpecId: number
}

export interface CreateTasksResponse {
  createdCount: number
  skippedDuplicateCount: number
  skippedNoCcodeCount: number
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

  async getWorkStepList(subWorkTypeId: number): Promise<WorkStepResponse[]> {
    const { data } = await apiClient.get<WorkStepResponse[]>('/reference/getWorkStepList', {
      params: { subWorkTypeId },
    })
    return data
  },

  async createWorkStep(subWorkTypeId: number, name: string): Promise<WorkStepResponse> {
    const { data } = await apiClient.post<WorkStepResponse>('/reference/createWorkStep', {
      subWorkTypeId,
      name,
    })
    return data
  },

  // ========== 자재 마스터 (MaterialType → MaterialSpec) ==========

  async getMaterialTypeList(): Promise<MaterialTypeResponse[]> {
    const { data } = await apiClient.get<MaterialTypeResponse[]>('/reference/getMaterialTypeList')
    return data
  },

  async createMaterialType(name: string, unit?: string): Promise<MaterialTypeResponse> {
    const { data } = await apiClient.post<MaterialTypeResponse>('/reference/createMaterialType', {
      name,
      unit,
    })
    return data
  },

  async getMaterialSpecList(materialTypeId: number): Promise<MaterialSpecResponse[]> {
    const { data } = await apiClient.get<MaterialSpecResponse[]>('/reference/getMaterialSpecList', {
      params: { materialTypeId },
    })
    return data
  },

  async createMaterialSpec(materialTypeId: number, name: string): Promise<MaterialSpecResponse> {
    const { data } = await apiClient.post<MaterialSpecResponse>('/reference/createMaterialSpec', {
      materialTypeId,
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

  async createComponentCodeMapping(params: {
    componentCodeId?: number
    componentTypeId?: number
    workStepId?: number
    subWorkTypeId?: number
    workTypeId?: number
  }): Promise<MappingResultResponse> {
    const { data } = await apiClient.post<MappingResultResponse>(
      '/reference/createComponentCodeMapping',
      params,
    )
    return data
  },

  async updateComponentCodeMapping(params: {
    ids: number[]
    materialSpecId: number
  }): Promise<UpdateMappingResultResponse> {
    const { data } = await apiClient.post<UpdateMappingResultResponse>(
      '/reference/updateComponentCodeMapping',
      params,
    )
    return data
  },

  // ========== 장비 마스터 (EquipmentType → EquipmentSpec) ==========

  async getEquipmentTypeList(): Promise<EquipmentTypeResponse[]> {
    const { data } = await apiClient.get<EquipmentTypeResponse[]>('/reference/getEquipmentTypeList')
    return data
  },

  async createEquipmentType(name: string): Promise<EquipmentTypeResponse> {
    const { data } = await apiClient.post<EquipmentTypeResponse>('/reference/createEquipmentType', {
      name,
    })
    return data
  },

  async getEquipmentSpecList(equipmentTypeId?: number): Promise<EquipmentSpecResponse[]> {
    const { data } = await apiClient.get<EquipmentSpecResponse[]>('/reference/getEquipmentSpecList', {
      params: equipmentTypeId != null ? { equipmentTypeId } : undefined,
    })
    return data
  },

  async createEquipmentSpec(equipmentTypeId: number, name: string): Promise<EquipmentSpecResponse> {
    const { data } = await apiClient.post<EquipmentSpecResponse>('/reference/createEquipmentSpec', {
      equipmentTypeId,
      name,
    })
    return data
  },

  // ========== 직종 (LaborType) ==========

  async getLaborTypeList(): Promise<LaborTypeResponse[]> {
    const { data } = await apiClient.get<LaborTypeResponse[]>(
      '/reference/getLaborTypeList',
    )
    return data
  },

  async getLaborTypeListByWorkType(workTypeId: number): Promise<LaborTypeResponse[]> {
    const { data } = await apiClient.get<LaborTypeResponse[]>(
      '/reference/getLaborTypeListByWorkType',
      { params: { workTypeId } },
    )
    return data
  },

  async createLaborType(params: {
    name: string
    workTypeId: number
    subWorkTypeId?: number | null
  }): Promise<LaborTypeResponse> {
    const { data } = await apiClient.post<LaborTypeResponse>(
      '/reference/createLaborType',
      params,
    )
    return data
  },

  // ========== 삭제 ==========

  async deleteDivision(id: number): Promise<void> {
    await apiClient.delete(`/reference/deleteDivision/${id}`)
  },

  async deleteWorkType(id: number): Promise<void> {
    await apiClient.delete(`/reference/deleteWorkType/${id}`)
  },

  async deleteSubWorkType(id: number): Promise<void> {
    await apiClient.delete(`/reference/deleteSubWorkType/${id}`)
  },

  async deleteWorkStep(id: number): Promise<void> {
    await apiClient.delete(`/reference/deleteWorkStep/${id}`)
  },

  async deleteMaterialType(id: number): Promise<void> {
    await apiClient.delete(`/reference/deleteMaterialType/${id}`)
  },

  async deleteMaterialSpec(id: number): Promise<void> {
    await apiClient.delete(`/reference/deleteMaterialSpec/${id}`)
  },

  async deleteEquipmentType(id: number): Promise<void> {
    await apiClient.delete(`/reference/deleteEquipmentType/${id}`)
  },

  async deleteEquipmentSpec(id: number): Promise<void> {
    await apiClient.delete(`/reference/deleteEquipmentSpec/${id}`)
  },

  async deleteComponentType(id: number): Promise<void> {
    await apiClient.delete(`/reference/deleteComponentType/${id}`)
  },

  async deleteComponentCode(id: number): Promise<void> {
    await apiClient.delete(`/reference/deleteComponentCode/${id}`)
  },

  async deleteLaborType(id: number): Promise<void> {
    await apiClient.delete(`/reference/deleteLaborType/${id}`)
  },

  async deleteZone(id: number): Promise<void> {
    await apiClient.delete(`/reference/deleteZone/${id}`)
  },

  async deleteFloor(id: number): Promise<void> {
    await apiClient.delete(`/reference/deleteFloor/${id}`)
  },

  async deleteSection(id: number): Promise<void> {
    await apiClient.delete(`/reference/deleteSection/${id}`)
  },

  async deleteUsage(id: number): Promise<void> {
    await apiClient.delete(`/reference/deleteUsage/${id}`)
  },

  // ========== 세부작업 생성 ==========

  async createTasks(): Promise<CreateTasksResponse> {
    const { data } = await apiClient.post<CreateTasksResponse>('/task/createTasks')
    return data
  },
}
