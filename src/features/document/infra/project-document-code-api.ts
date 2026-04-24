import apiClient from '@/shared/network-core/apiClient'
import type {
  MaterialInspectionRequestResponse,
  ProjectDocumentCodeResponse,
} from '@/features/document/model/document-types'

export const projectDocumentCodeApi = {
  async createProjectDocumentCode(body: {
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
    mirCellReference?: string
    dailyReportCellReference?: string
  }): Promise<ProjectDocumentCodeResponse> {
    const { data } = await apiClient.put<ProjectDocumentCodeResponse>(
      '/projectDocumentCode/updateProjectDocumentCode',
      body,
    )
    return data
  },
}

export const materialInspectionRequestApi = {
  async createMir(materialDeliveryId: number): Promise<MaterialInspectionRequestResponse> {
    const { data } = await apiClient.post<MaterialInspectionRequestResponse>(
      `/materialInspectionRequest/createMir/${materialDeliveryId}`,
    )
    return data
  },

  async getMirList(): Promise<MaterialInspectionRequestResponse[]> {
    const { data } = await apiClient.get<MaterialInspectionRequestResponse[]>(
      '/materialInspectionRequest/getMirList',
    )
    return data
  },

  async updateMirDocumentNumber(mirId: number, documentNumber: string): Promise<void> {
    await apiClient.put(`/materialInspectionRequest/updateMirDocumentNumber/${mirId}`, { documentNumber })
  },
}
