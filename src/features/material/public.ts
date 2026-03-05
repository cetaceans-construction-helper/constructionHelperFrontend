export { useMaterialOrder } from '@/features/material/view-model/useMaterialOrder'
export { materialOrderApi } from '@/features/material/infra/material-order-api'
export { materialOrderRepository } from '@/features/material/infra/material-order-repository'
export { getMaterialOrders } from '@/features/material/use-cases/getMaterialOrders'
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
  DeliveryFileInfo,
  DeliveryLineResponse,
  DeliveryQuantityByDate,
  MaterialDeliverySummary,
  MaterialOrderLineResponse,
  MaterialOrderResponse,
  MaterialOrderStatus,
  SpecSummary,
} from '@/features/material/model/material-order-types'

export { default as InvoicePageView } from '@/features/material/ui/InvoicePage.vue'
export { default as IncomingMaterialPageView } from '@/features/material/ui/IncomingMaterialPage.vue'
export { default as OutgoingMaterialPageView } from '@/features/material/ui/OutgoingMaterialPage.vue'
export { default as RemainingMaterialPageView } from '@/features/material/ui/RemainingMaterialPage.vue'

export const materialRouteComponents = {
  InvoicePage: () => import('@/features/material/ui/InvoicePage.vue'),
  IncomingMaterialPage: () => import('@/features/material/ui/IncomingMaterialPage.vue'),
  OutgoingMaterialPage: () => import('@/features/material/ui/OutgoingMaterialPage.vue'),
  RemainingMaterialPage: () => import('@/features/material/ui/RemainingMaterialPage.vue'),
}
