import apiClient from '@/shared/network-core/apiClient'

export type DocumentJobDocType =
  | 'DR'
  | 'MIR'
  | 'CAT'
  | 'CCST'
  | 'SCHEDULE_3WEEK'
  | 'SCHEDULE_3MONTH'

export type DocumentJobStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'

export interface DocumentJobResponse {
  id: number
  projectId: string
  docType: DocumentJobDocType
  docNo: string | null
  status: DocumentJobStatus
  resultUrl: string | null
  pdfUrl: string | null
  errCode: string | null
  errDetail: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

export interface DownloadedDocument {
  blob: Blob
  format: 'pdf' | 'xlsx'
}

export const documentApi = {
  async getDocumentJob(jobId: number): Promise<DocumentJobResponse> {
    const { data } = await apiClient.get<DocumentJobResponse>(
      `/document/getDocumentJob/${jobId}`,
    )
    return data
  },

  async downloadDocument(jobId: number): Promise<DownloadedDocument> {
    const response = await apiClient.get<Blob>(
      `/document/downloadDocument/${jobId}`,
      { responseType: 'blob' },
    )
    const contentType = String(response.headers['content-type'] ?? '')
    const format: 'pdf' | 'xlsx' = contentType.includes('pdf') ? 'pdf' : 'xlsx'
    return { blob: response.data, format }
  },

  async deleteDocument(jobId: number): Promise<void> {
    await apiClient.delete(`/document/deleteDocument/${jobId}`)
  },
}
