import apiClient from '@/shared/network-core/apiClient'
import type {
  DocumentNumberOptionsResponse,
  MaterialInspectionRequestResponse,
  ProjectDocumentCodeResponse,
  ValidateMirResponse,
} from '@/features/document/model/document-types'

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
    mirDocumentNumberCode?: string
    mirCellReference?: string
    dailyReportCellReference?: string
  }): Promise<ProjectDocumentCodeResponse> {
    const { data } = await apiClient.post<ProjectDocumentCodeResponse>(
      '/projectDocumentCode/createProjectDocumentCode',
      body,
    )
    return data
  },

  async updateProjectDocumentCode(body: {
    mirDocumentNumberCode?: string
    mirCellReference?: string
    dailyReportCellReference?: string
  }): Promise<ProjectDocumentCodeResponse> {
    const { data } = await apiClient.put<ProjectDocumentCodeResponse>(
      '/projectDocumentCode/updateProjectDocumentCode',
      body,
    )
    return data
  },

  async uploadMirTemplate(file: File): Promise<ProjectDocumentCodeResponse> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await apiClient.post<ProjectDocumentCodeResponse>(
      '/projectDocumentCode/uploadMirTemplate',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      },
    )
    return data
  },

  async uploadDailyReportTemplate(file: File): Promise<ProjectDocumentCodeResponse> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await apiClient.post<ProjectDocumentCodeResponse>(
      '/projectDocumentCode/uploadDailyReportTemplate',
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
  async validateMaterialInspectionRequest(deliveryId: number): Promise<ValidateMirResponse> {
    const { data } = await apiClient.get<ValidateMirResponse>(
      `/materialInspectionRequest/validateMaterialInspectionRequest/${deliveryId}`,
    )
    return data
  },

  async createMaterialInspectionRequest(
    deliveryId: number,
    body?: { excludedIndices: number[] },
  ): Promise<void> {
    await apiClient.post(
      `/materialInspectionRequest/createMaterialInspectionRequest/${deliveryId}`,
      body,
    )
  },

  async getMaterialInspectionRequestList(): Promise<MaterialInspectionRequestResponse[]> {
    const { data } = await apiClient.get<MaterialInspectionRequestResponse[]>(
      '/materialInspectionRequest/getMaterialInspectionRequestList',
    )
    return data
  },

  async deleteMaterialInspectionRequest(mirId: number): Promise<void> {
    await apiClient.delete(`/materialInspectionRequest/deleteMaterialInspectionRequest/${mirId}`)
  },

  async downloadMaterialInspectionRequestFile(url: string): Promise<string> {
    const { data } = await apiClient.get<Blob>('/materialDelivery/downloadFile', {
      params: { url },
      responseType: 'blob',
    })
    return URL.createObjectURL(data)
  },
}
