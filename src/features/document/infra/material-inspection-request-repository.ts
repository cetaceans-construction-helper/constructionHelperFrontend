import { materialInspectionRequestApi } from '@/features/document/infra/project-document-code-api'
import { documentApi } from '@/shared/network-core/apis/document'
import type { MaterialInspectionRequestRepository } from '@/features/document/use-cases/material-inspection-request'

export const materialInspectionRequestRepository: MaterialInspectionRequestRepository = {
  createMir: (deliveryId) => materialInspectionRequestApi.createMir(deliveryId),
  getMirList: () => materialInspectionRequestApi.getMirList(),
  deleteDocument: (jobId) => documentApi.deleteDocument(jobId),
  updateMirDocumentNumber: (mirId, documentNumber) =>
    materialInspectionRequestApi.updateMirDocumentNumber(mirId, documentNumber),
  downloadDocument: (jobId) => documentApi.downloadDocument(jobId),
}
