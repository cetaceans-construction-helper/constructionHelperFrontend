import { materialInspectionRequestApi } from '@/features/document/infra/project-document-code-api'
import type { MaterialInspectionRequestRepository } from '@/features/document/use-cases/material-inspection-request'

export const materialInspectionRequestRepository: MaterialInspectionRequestRepository = {
  validateMaterialInspectionRequest: (deliveryId) =>
    materialInspectionRequestApi.validateMaterialInspectionRequest(deliveryId),
  createMaterialInspectionRequest: (deliveryId, body?) =>
    materialInspectionRequestApi.createMaterialInspectionRequest(deliveryId, body),
  getMaterialInspectionRequestList: () => materialInspectionRequestApi.getMaterialInspectionRequestList(),
  deleteMaterialInspectionRequest: (mirId) =>
    materialInspectionRequestApi.deleteMaterialInspectionRequest(mirId),
  updateMirDocumentNumber: (mirId, documentNumber) =>
    materialInspectionRequestApi.updateMirDocumentNumber(mirId, documentNumber),
  downloadMaterialInspectionRequestFile: (url) =>
    materialInspectionRequestApi.downloadMaterialInspectionRequestFile(url),
}
