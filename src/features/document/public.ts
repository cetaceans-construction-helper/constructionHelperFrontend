export { useMaterialInspectionPage } from '@/features/document/view-model/useMaterialInspectionPage'
export { useDailyReportPage } from '@/features/document/view-model/useDailyReportPage'
export {
  materialInspectionRequestApi,
  projectDocumentCodeApi,
} from '@/features/document/infra/project-document-code-api'
export { materialInspectionRequestRepository } from '@/features/document/infra/material-inspection-request-repository'
export { dailyReportRepository } from '@/features/document/infra/daily-report-repository'
export {
  createMaterialInspectionRequest,
  deleteMaterialInspectionRequest,
  downloadMaterialInspectionRequest,
  getMaterialInspectionRequests,
  validateMaterialInspectionRequest,
} from '@/features/document/use-cases/material-inspection-request'
export {
  createDailyReport,
  deleteDailyReport,
  downloadDailyReport,
  getDailyReports,
  validateDailyReport,
} from '@/features/document/use-cases/daily-report'

export type { MaterialInspectionRequestRepository } from '@/features/document/use-cases/material-inspection-request'
export type { DailyReportRepository } from '@/features/document/use-cases/daily-report'
export type {
  DailyReportResponse,
  DocumentNumberOptionsResponse,
  DocumentSlot,
  ImageCategory,
  MaterialInspectionRequestResponse,
  MirCellReference,
  MirDocumentNumberCode,
  MirSlotValue,
  ProjectDocumentCodeResponse,
  SlotConfig,
  ValidateDailyReportPhotos,
  ValidateDailyReportResponse,
  ValidateDailyReportSection,
  ValidateDailyReportSectionItem,
  ValidateDailyReportPhotoItem,
  ValidateMirItem,
  ValidateMirResponse,
} from '@/features/document/model/document-types'

export { default as ManagerPageView } from '@/features/document/ui/ManagerPage.vue'
export { default as DailyReportPageView } from '@/features/document/ui/DailyReportPage.vue'
export { default as MaterialInspectionPageView } from '@/features/document/ui/MaterialInspectionPage.vue'

export const documentRouteComponents = {
  ManagerPage: () => import('@/features/document/ui/ManagerPage.vue'),
  DailyReportPage: () => import('@/features/document/ui/DailyReportPage.vue'),
  MaterialInspectionPage: () => import('@/features/document/ui/MaterialInspectionPage.vue'),
}
