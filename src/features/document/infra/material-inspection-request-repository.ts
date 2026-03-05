import { materialInspectionRequestApi } from '@/features/document/infra/project-document-code-api'
import type { MaterialInspectionRequestRepository } from '@/features/document/use-cases/material-inspection-request'

export const materialInspectionRequestRepository: MaterialInspectionRequestRepository = {
  createMaterialInspectionRequest: (deliveryId) =>
    materialInspectionRequestApi.createMaterialInspectionRequest(deliveryId),
  getMaterialInspectionRequestList: () => materialInspectionRequestApi.getMaterialInspectionRequestList(),
  deleteMaterialInspectionRequest: (mirId) =>
    materialInspectionRequestApi.deleteMaterialInspectionRequest(mirId),
  downloadMaterialInspectionRequestFile: (url) =>
    materialInspectionRequestApi.downloadMaterialInspectionRequestFile(url),
}
