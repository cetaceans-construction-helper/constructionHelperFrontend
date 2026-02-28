import apiClient from './apiClient'

// === 문서번호 슬롯 타입 ===
export type DocumentSlot =
  | 'TEXT'
  | 'DATE'
  | 'DIVISION'
  | 'WORK_TYPE'
  | 'MATERIAL_TYPE'
  | 'SEQ'

export interface MirSlotValue {
  type: DocumentSlot
  value?: string
  format?: string
  padding?: number
  groupBy?: string[]
}

export interface MirDocumentNumberCode {
  separator: string
  A: MirSlotValue | null
  B: MirSlotValue | null
  C: MirSlotValue | null
  D: MirSlotValue | null
  E: MirSlotValue | null
}

// === 셀 매핑 (모든 섹션·필드 nullable) ===
export interface MirCellReference {
  delivery?: {
    supplier?: string
    deliveryDate?: string
    location?: string
    documentNumber?: string
    materialTypeName?: string
    divisionName?: string
  }
  lines?: {
    startCell: string
    maxRows?: number
    columns?: {
      no?: number
      specName?: number
      manufacturer?: number
      quantity?: number
      unit?: number
    }
  }
  lineConcat?: {
    cell: string
    field: string
    separator: string
  }[]
  photos?: Record<string, {
    cells: string[]
    descriptionOffset?: { row: number; col: number }
  }>
}

// === 서버 응답 ===
export interface ProjectDocumentCodeResponse {
  id: number
  mirDocumentNumberCode: string // JSON string → MirDocumentNumberCode
  mirCellReference: string // JSON string → MirCellReference
  templateUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface MaterialInspectionRequestResponse {
  id: number
  materialDeliveryId: number
  documentNumber: string
  mirUrl: string | null
  deliveryDate: string
  createdAt: string
}

// === 슬롯 설정 (UI 전용) ===
export interface SlotConfig {
  key: 'A' | 'B' | 'C' | 'D' | 'E'
  type: DocumentSlot | null
  value: string
  format: string
  padding: number
  groupBy: string[]
}

export interface ImageCategory {
  key: string
  label: string
}

export interface DocumentNumberOptionsResponse {
  dateFormats: string[]
  imageCategories: ImageCategory[]
}

// === API ===
export const projectDocumentCodeApi = {
  async getDocumentNumberOptions(): Promise<DocumentNumberOptionsResponse> {
    const { data } = await apiClient.get<DocumentNumberOptionsResponse>(
      '/projectDocumentCode/getDocumentNumberOptions',
    )
    return data
  },

  async getProjectDocumentCode(): Promise<ProjectDocumentCodeResponse> {
    const { data } = await apiClient.get<ProjectDocumentCodeResponse>(
      '/projectDocumentCode/getProjectDocumentCode',
      { params: { documentType: 'MIR' } },
    )
    return data
  },

  async createProjectDocumentCode(body: {
    mirDocumentNumberCode: string
    mirCellReference: string
  }): Promise<ProjectDocumentCodeResponse> {
    const { data } = await apiClient.post<ProjectDocumentCodeResponse>(
      '/projectDocumentCode/createProjectDocumentCode',
      body,
    )
    return data
  },

  async updateProjectDocumentCode(body: {
    mirDocumentNumberCode: string
    mirCellReference: string
  }): Promise<ProjectDocumentCodeResponse> {
    const { data } = await apiClient.put<ProjectDocumentCodeResponse>(
      '/projectDocumentCode/updateProjectDocumentCode',
      body,
    )
    return data
  },

  async uploadMirTemplate(file: File): Promise<{ templateUrl: string }> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await apiClient.post<{ templateUrl: string }>(
      '/projectDocumentCode/uploadMirTemplate',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      },
    )
    return data
  },
}

export const materialInspectionRequestApi = {
  async createMaterialInspectionRequest(
    deliveryId: number,
  ): Promise<void> {
    await apiClient.post(
      `/materialInspectionRequest/createMaterialInspectionRequest/${deliveryId}`,
    )
  },

  async getMaterialInspectionRequestList(): Promise<
    MaterialInspectionRequestResponse[]
  > {
    const { data } = await apiClient.get<MaterialInspectionRequestResponse[]>(
      '/materialInspectionRequest/getMaterialInspectionRequestList',
    )
    return data
  },

  async deleteMaterialInspectionRequest(mirId: number): Promise<void> {
    await apiClient.delete(
      `/materialInspectionRequest/deleteMaterialInspectionRequest/${mirId}`,
    )
  },
}
