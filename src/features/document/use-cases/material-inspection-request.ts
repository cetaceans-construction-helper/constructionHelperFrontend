import type { MaterialInspectionRequestResponse } from '@/features/document/model/document-types'

export interface MaterialInspectionRequestRepository {
  createMaterialInspectionRequest(deliveryId: number): Promise<void>
  getMaterialInspectionRequestList(): Promise<MaterialInspectionRequestResponse[]>
  deleteMaterialInspectionRequest(mirId: number): Promise<void>
  downloadMaterialInspectionRequestFile(url: string): Promise<string>
}

export const createMaterialInspectionRequest = async (
  repository: MaterialInspectionRequestRepository,
  deliveryId: number,
): Promise<void> => {
  await repository.createMaterialInspectionRequest(deliveryId)
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
