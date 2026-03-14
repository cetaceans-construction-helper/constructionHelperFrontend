import type {
  MaterialInspectionRequestResponse,
  ValidateMirResponse,
} from '@/features/document/model/document-types'

export interface MaterialInspectionRequestRepository {
  validateMaterialInspectionRequest(deliveryId: number): Promise<ValidateMirResponse>
  createMaterialInspectionRequest(deliveryId: number, body?: { excludedIndices: number[] }): Promise<void>
  getMaterialInspectionRequestList(): Promise<MaterialInspectionRequestResponse[]>
  deleteMaterialInspectionRequest(mirId: number): Promise<void>
  updateMirDocumentNumber(mirId: number, documentNumber: string): Promise<void>
  downloadMaterialInspectionRequestFile(url: string): Promise<string>
}

export const validateMaterialInspectionRequest = async (
  repository: MaterialInspectionRequestRepository,
  deliveryId: number,
): Promise<ValidateMirResponse> => {
  return repository.validateMaterialInspectionRequest(deliveryId)
}

export const createMaterialInspectionRequest = async (
  repository: MaterialInspectionRequestRepository,
  deliveryId: number,
  body?: { excludedIndices: number[] },
): Promise<void> => {
  await repository.createMaterialInspectionRequest(deliveryId, body)
}

export const getMaterialInspectionRequests = async (
  repository: MaterialInspectionRequestRepository,
): Promise<MaterialInspectionRequestResponse[]> => {
  return repository.getMaterialInspectionRequestList()
}

export const deleteMaterialInspectionRequest = async (
  repository: MaterialInspectionRequestRepository,
  mirId: number,
): Promise<void> => {
  await repository.deleteMaterialInspectionRequest(mirId)
}

export const updateMirDocumentNumber = async (
  repository: MaterialInspectionRequestRepository,
  mirId: number,
  documentNumber: string,
): Promise<void> => {
  await repository.updateMirDocumentNumber(mirId, documentNumber)
}

export const downloadMaterialInspectionRequest = async (
  repository: MaterialInspectionRequestRepository,
  request: Pick<MaterialInspectionRequestResponse, 'documentNumber' | 'mirUrl'>,
): Promise<{ blobUrl: string; fileName: string }> => {
  if (!request.mirUrl) {
    throw new Error('다운로드 가능한 문서가 없습니다.')
  }

  const blobUrl = await repository.downloadMaterialInspectionRequestFile(request.mirUrl)
  return {
    blobUrl,
    fileName: `${request.documentNumber}.xlsx`,
  }
}
