export { useMaterialInspectionPage } from '@/features/document/view-model/useMaterialInspectionPage'
export {
  materialInspectionRequestApi,
  projectDocumentCodeApi,
} from '@/features/document/infra/project-document-code-api'
export { materialInspectionRequestRepository } from '@/features/document/infra/material-inspection-request-repository'
export {
  createMaterialInspectionRequest,
  deleteMaterialInspectionRequest,
  downloadMaterialInspectionRequest,
  getMaterialInspectionRequests,
} from '@/features/document/use-cases/material-inspection-request'

export type { MaterialInspectionRequestRepository } from '@/features/document/use-cases/material-inspection-request'
export type {
  DocumentNumberOptionsResponse,
  DocumentSlot,
  ImageCategory,
  MaterialInspectionRequestResponse,
  MirCellReference,
  MirDocumentNumberCode,
  MirSlotValue,
  ProjectDocumentCodeResponse,
  SlotConfig,
} from '@/features/document/model/document-types'

export { default as ManagerPageView } from '@/features/document/ui/ManagerPage.vue'
export { default as DailyReportPageView } from '@/features/document/ui/DailyReportPage.vue'
export { default as MaterialInspectionPageView } from '@/features/document/ui/MaterialInspectionPage.vue'

export const documentRouteComponents = {
  ManagerPage: () => import('@/features/document/ui/ManagerPage.vue'),
  DailyReportPage: () => import('@/features/document/ui/DailyReportPage.vue'),
  MaterialInspectionPage: () => import('@/features/document/ui/MaterialInspectionPage.vue'),
}
