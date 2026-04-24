import type {
  MaterialInspectionRequestResponse,
} from '@/features/document/model/document-types'
import type { DownloadedDocument } from '@/shared/network-core/apis/document'

export interface MaterialInspectionRequestRepository {
  createMir(materialDeliveryId: number): Promise<MaterialInspectionRequestResponse>
  getMirList(): Promise<MaterialInspectionRequestResponse[]>
  deleteDocument(jobId: number): Promise<void>
  updateMirDocumentNumber(mirId: number, documentNumber: string): Promise<void>
  downloadDocument(jobId: number): Promise<DownloadedDocument>
}

export const createMir = async (
  repository: MaterialInspectionRequestRepository,
  materialDeliveryId: number,
): Promise<MaterialInspectionRequestResponse> => {
  return repository.createMir(materialDeliveryId)
}

export const getMaterialInspectionRequests = async (
  repository: MaterialInspectionRequestRepository,
): Promise<MaterialInspectionRequestResponse[]> => {
  return repository.getMirList()
}

export const deleteDocument = async (
  repository: MaterialInspectionRequestRepository,
  jobId: number,
): Promise<void> => {
  await repository.deleteDocument(jobId)
}

export const updateMirDocumentNumber = async (
  repository: MaterialInspectionRequestRepository,
  mirId: number,
  documentNumber: string,
): Promise<void> => {
  await repository.updateMirDocumentNumber(mirId, documentNumber)
}

export const downloadDocument = async (
  repository: MaterialInspectionRequestRepository,
  request: Pick<MaterialInspectionRequestResponse, 'id' | 'docNo'>,
): Promise<{ blobUrl: string; fileName: string }> => {
  const { blob, format } = await repository.downloadDocument(request.id)
  const baseName = request.docNo ?? `MIR_${request.id}`
  return {
    blobUrl: URL.createObjectURL(blob),
    fileName: `${baseName}.${format}`,
  }
}
