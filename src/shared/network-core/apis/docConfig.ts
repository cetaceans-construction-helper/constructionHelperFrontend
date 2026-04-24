import apiClient from '@/shared/network-core/apiClient'

export type DocConfigDocType = 'MIR' | 'CAT' | 'CCST'
export type UploadDocType = 'MIR' | 'CAT' | 'CCST' | 'DR'

export interface DocConfigResponse {
  id: number
  projectId: string
  drTemplateUrl: string | null
  mirTemplateUrl: string | null
  catTemplateUrl: string | null
  ccstTemplateUrl: string | null
  mirDocNoPrompt: string | null
  catDocNoPrompt: string | null
  ccstDocNoPrompt: string | null
  drExcelCellRef: string | null
  mirExcelCellRef: string | null
  catExcelCellRef: string | null
  ccstExcelCellRef: string | null
  createdAt: string
  updatedAt: string
}

export const docConfigApi = {
  async createDocConfig(projectId: string): Promise<DocConfigResponse> {
    const { data } = await apiClient.post<DocConfigResponse>(
      `/docConfig/createDocConfig/${projectId}`,
    )
    return data
  },

  async getDocConfig(projectId: string): Promise<DocConfigResponse> {
    const { data } = await apiClient.get<DocConfigResponse>(
      `/docConfig/getDocConfig/${projectId}`,
    )
    return data
  },

  async updateDocNoPrompt(
    projectId: string,
    body: { docType: DocConfigDocType; prompt: string },
  ): Promise<DocConfigResponse> {
    const { data } = await apiClient.put<DocConfigResponse>(
      `/docConfig/updateDocNoPrompt/${projectId}`,
      body,
    )
    return data
  },

  async uploadTemplate(
    projectId: string,
    docType: UploadDocType,
    file: File,
  ): Promise<DocConfigResponse> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await apiClient.post<DocConfigResponse>(
      `/docConfig/uploadTemplate/${projectId}/${docType}`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      },
    )
    return data
  },

  async generateExcelCellRef(
    projectId: string,
    docType: UploadDocType,
  ): Promise<{
    docType: UploadDocType
    json: string
    iterations: number
    converged: boolean
    sampleUsed: boolean
  }> {
    const { data } = await apiClient.post<{
      docType: UploadDocType
      json: string
      iterations: number
      converged: boolean
      sampleUsed: boolean
    }>(
      `/docConfig/generateExcelCellRef/${projectId}`,
      { docType },
      { timeout: 120000 },
    )
    return data
  },

  async updateExcelCellRef(
    projectId: string,
    body: { docType: UploadDocType; json: string },
  ): Promise<DocConfigResponse> {
    const { data } = await apiClient.put<DocConfigResponse>(
      `/docConfig/updateExcelCellRef/${projectId}`,
      body,
    )
    return data
  },
}
