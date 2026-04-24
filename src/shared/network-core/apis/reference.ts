import apiClient from '@/shared/network-core/apiClient'

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
  isStructure: boolean
}

// 부재 타입 응답 (isStructure 포함)
export interface ComponentTypeResponse {
  id: number
  name: string
  isStructure: boolean
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
  componentTypeId: number
}

// 직종(LaborType) 타입
export interface LaborTypeResponse {
  id: number
  name: string
  workTypeId: number
  workTypeName: string
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

export interface CcodeDetailResponse {
  id: number
  componentCodeId: number
  componentCodeName: string
  workStepId: number
  workStepName: string
  materialSpecId: number | null
  materialSpecName: string | null
  floorId: number | null
  floorName: string | null
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

export interface UpdateReferenceRequest {
  id?: number
  name?: string
  unit?: string
  ids?: number[]
}

export interface UpdateChildReferenceRequest extends UpdateReferenceRequest {
  parentId?: number
  componentTypeId?: number
  isStructure?: boolean
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

  // 이름 유사도 기반 WorkType 조회 (pgvector top-1)
  async getWorkTypeDetail(name: string): Promise<WorkTypeResponse> {
    const { data } = await apiClient.get<WorkTypeResponse>('/reference/getWorkTypeDetail', {
      params: { name },
    })
    return data
  },

  async createWorkType(divisionId: number, name: string, isStructure: boolean): Promise<WorkTypeResponse> {
    const { data } = await apiClient.post<WorkTypeResponse>('/reference/createWorkType', {
      divisionId,
      name,
      isStructure,
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

  async createWorkStep(
    subWorkTypeId: number,
    name: string,
    componentTypeId: number,
  ): Promise<WorkStepResponse> {
    const { data } = await apiClient.post<WorkStepResponse>('/super/reference/createWorkStep', {
      subWorkTypeId,
      name,
      componentTypeId,
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

  // ========== 작업 위치 (Zone / Floor) ==========

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

  // ========== 부재 타입 (ComponentType → ComponentCode) — isStructure 기반 ==========

  async getComponentTypeList(isStructure?: boolean): Promise<ComponentTypeResponse[]> {
    const { data } = await apiClient.get<ComponentTypeResponse[]>('/reference/getComponentTypeList', {
      params: isStructure != null ? { isStructure } : undefined,
    })
    return data
  },

  async createComponentType(name: string, isStructure: boolean): Promise<ComponentTypeResponse> {
    const { data } = await apiClient.post<ComponentTypeResponse>('/super/reference/createComponentType', {
      name,
      isStructure,
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

  async getCcodeDetailList(componentCodeId?: number): Promise<CcodeDetailResponse[]> {
    const { data } = await apiClient.get<CcodeDetailResponse[]>(
      '/reference/getCcodeDetailList',
      { params: componentCodeId != null ? { componentCodeId } : undefined },
    )
    return data
  },

  async createCcodeDetail(params: {
    componentCodeId: number
    workStepId: number
    floorId?: number
  }): Promise<MappingResultResponse> {
    const { data } = await apiClient.post<MappingResultResponse>(
      '/super/reference/createCcodeDetail',
      params,
    )
    return data
  },

  async updateCcodeDetail(params: {
    ids: number[]
    materialSpecId: number
  }): Promise<UpdateMappingResultResponse> {
    const { data } = await apiClient.post<UpdateMappingResultResponse>(
      '/super/reference/updateCcodeDetail',
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
    const { data } = await apiClient.post<EquipmentTypeResponse>('/super/reference/createEquipmentType', {
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
    const { data } = await apiClient.post<EquipmentSpecResponse>('/super/reference/createEquipmentSpec', {
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
  }): Promise<LaborTypeResponse> {
    const { data } = await apiClient.post<LaborTypeResponse>(
      '/super/reference/createLaborType',
      params,
    )
    return data
  },

  // ========== 수정 (이름 변경 + 정렬 변경) ==========
  // Division/WorkType/SubWorkType 는 project-scoped (/reference/**, X-Project-Id 필수)
  // 그 외 글로벌 RE 는 SUPER 전용 (/super/reference/**) 유지, Zone/Floor/ComponentCode 는 일반 사용자 (/reference/**)

  // Top-level (project-scoped - 일반 사용자)
  async updateDivision(params: UpdateReferenceRequest): Promise<void> {
    await apiClient.post('/reference/updateDivision', params)
  },

  async updateMaterialType(params: UpdateReferenceRequest): Promise<void> {
    await apiClient.post('/reference/updateMaterialType', params)
  },

  async updateEquipmentType(params: UpdateReferenceRequest): Promise<void> {
    await apiClient.post('/super/reference/updateEquipmentType', params)
  },

  async updateComponentType(params: UpdateChildReferenceRequest): Promise<void> {
    await apiClient.post('/super/reference/updateComponentType', params)
  },

  async updateLaborType(params: UpdateReferenceRequest): Promise<void> {
    await apiClient.post('/super/reference/updateLaborType', params)
  },

  // Top-level (project-scoped - 일반 사용자)
  async updateZone(params: UpdateReferenceRequest): Promise<void> {
    await apiClient.post('/reference/updateZone', params)
  },

  async updateFloor(params: UpdateReferenceRequest): Promise<void> {
    await apiClient.post('/reference/updateFloor', params)
  },

  // Child-level (project-scoped - 일반 사용자)
  async updateWorkType(params: UpdateChildReferenceRequest): Promise<void> {
    await apiClient.post('/reference/updateWorkType', params)
  },

  async updateSubWorkType(params: UpdateChildReferenceRequest): Promise<void> {
    await apiClient.post('/reference/updateSubWorkType', params)
  },

  // Child-level (글로벌 - SUPER)

  async updateWorkStep(params: UpdateChildReferenceRequest): Promise<void> {
    await apiClient.post('/super/reference/updateWorkStep', params)
  },

  async updateMaterialSpec(params: UpdateChildReferenceRequest): Promise<void> {
    await apiClient.post('/reference/updateMaterialSpec', params)
  },

  async updateEquipmentSpec(params: UpdateChildReferenceRequest): Promise<void> {
    await apiClient.post('/super/reference/updateEquipmentSpec', params)
  },

  // Child-level (project-scoped - 일반 사용자)
  async updateComponentCode(params: UpdateChildReferenceRequest): Promise<void> {
    await apiClient.post('/reference/updateComponentCode', params)
  },

  // ========== 삭제 ==========
  // Division/WorkType/SubWorkType 는 project-scoped (/reference/**, X-Project-Id 필수)
  // 그 외 글로벌 RE 는 SUPER 전용, Zone/Floor/ComponentCode 는 일반 사용자

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
    await apiClient.delete(`/super/reference/deleteWorkStep/${id}`)
  },

  async deleteMaterialType(id: number): Promise<void> {
    await apiClient.delete(`/reference/deleteMaterialType/${id}`)
  },

  async deleteMaterialSpec(id: number): Promise<void> {
    await apiClient.delete(`/reference/deleteMaterialSpec/${id}`)
  },

  async deleteEquipmentType(id: number): Promise<void> {
    await apiClient.delete(`/super/reference/deleteEquipmentType/${id}`)
  },

  async deleteEquipmentSpec(id: number): Promise<void> {
    await apiClient.delete(`/super/reference/deleteEquipmentSpec/${id}`)
  },

  async deleteComponentType(id: number): Promise<void> {
    await apiClient.delete(`/super/reference/deleteComponentType/${id}`)
  },

  async deleteLaborType(id: number): Promise<void> {
    await apiClient.delete(`/super/reference/deleteLaborType/${id}`)
  },

  async deleteCcodeDetail(id: number): Promise<void> {
    await apiClient.delete(`/super/reference/deleteCcodeDetail/${id}`)
  },

  // 삭제 (project-scoped - 일반 사용자)
  async deleteComponentCode(id: number): Promise<void> {
    await apiClient.delete(`/reference/deleteComponentCode/${id}`)
  },

  async deleteZone(id: number): Promise<void> {
    await apiClient.delete(`/reference/deleteZone/${id}`)
  },

  async deleteFloor(id: number): Promise<void> {
    await apiClient.delete(`/reference/deleteFloor/${id}`)
  },

  // ========== 세부작업 생성 ==========

  async createTasks(): Promise<CreateTasksResponse> {
    const { data } = await apiClient.post<CreateTasksResponse>('/task/createTasks')
    return data
  },
}
