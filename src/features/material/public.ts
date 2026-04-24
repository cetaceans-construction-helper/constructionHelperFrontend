export { useMaterialOrder } from '@/features/material/view-model/useMaterialOrder'
export { materialOrderApi } from '@/features/material/infra/material-order-api'
export { materialOrderRepository } from '@/features/material/infra/material-order-repository'
export { getMaterialOrders } from '@/features/material/use-cases/getMaterialOrders'
export { deleteMaterialOrder } from '@/features/material/use-cases/deleteMaterialOrder'
export {
  formatMaterialOrderLineLocation,
  getMaterialOrderStatusBadgeClass,
  getMaterialOrderStatusLabel,
  sortMaterialOrdersByCreatedAtDesc,
  validateDirectMaterialDeliveryInput,
  validateMaterialOrderCreationInput,
} from '@/features/material/model/material-order-rules'

export type { MaterialOrderRepository } from '@/features/material/use-cases/material-order-repository'
export type {
  CreateDeliveryResponse,
  DeliveryLineResponse,
  DeliveryPhotoFile,
  DeliveryQuantityByDate,
  MaterialDeliveryDetail,
  MaterialDeliverySummary,
  MaterialOrderLineResponse,
  MaterialOrderResponse,
  MaterialOrderStatus,
  PhotoType,
  SpecSummary,
} from '@/features/material/model/material-order-types'

export { default as MaterialDeliveryCreateDialog } from '@/features/material/ui/components/MaterialDeliveryCreateDialog.vue'
export { default as InvoicePageView } from '@/features/material/ui/InvoicePage.vue'
export { default as MaterialDeliveryPageView } from '@/features/material/ui/MaterialDeliveryPage.vue'
export { default as OutgoingMaterialPageView } from '@/features/material/ui/OutgoingMaterialPage.vue'
export { default as RemainingMaterialPageView } from '@/features/material/ui/RemainingMaterialPage.vue'

export const materialRouteComponents = {
  InvoicePage: () => import('@/features/material/ui/InvoicePage.vue'),
  MaterialDeliveryPage: () => import('@/features/material/ui/MaterialDeliveryPage.vue'),
  OutgoingMaterialPage: () => import('@/features/material/ui/OutgoingMaterialPage.vue'),
  RemainingMaterialPage: () => import('@/features/material/ui/RemainingMaterialPage.vue'),
}
