import type {
  MaterialOrderLineResponse,
  MaterialOrderResponse,
  MaterialOrderStatus,
} from '@/features/material/model/material-order-types'

const materialOrderStatusLabels: Record<MaterialOrderStatus, string> = {
  BEFORE_ORDER: '발주전',
  ORDER_COMPLETED: '발주완료',
  RECEIPT_COMPLETED: '반입완료',
}

const materialOrderStatusBadgeClasses: Record<MaterialOrderStatus, string> = {
  BEFORE_ORDER: 'bg-red-500 text-white hover:bg-red-500/80',
  ORDER_COMPLETED: 'bg-green-500 text-white hover:bg-green-500/80',
  RECEIPT_COMPLETED: 'bg-blue-500 text-white hover:bg-blue-500/80',
}

const isMaterialOrderStatus = (status: string): status is MaterialOrderStatus => {
  return status === 'BEFORE_ORDER' || status === 'ORDER_COMPLETED' || status === 'RECEIPT_COMPLETED'
}

export const getMaterialOrderStatusLabel = (status: string): string => {
  if (!isMaterialOrderStatus(status)) return status
  return materialOrderStatusLabels[status]
}

export const getMaterialOrderStatusBadgeClass = (status: string): string => {
  if (!isMaterialOrderStatus(status)) return 'bg-muted text-muted-foreground'
  return materialOrderStatusBadgeClasses[status]
}

export const formatMaterialOrderLineLocation = (line: MaterialOrderLineResponse): string => {
  const parts = [line.zoneName, line.floorName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : '-'
}

export const sortMaterialOrdersByCreatedAtDesc = (
  orders: MaterialOrderResponse[],
): MaterialOrderResponse[] => {
  return [...orders].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  )
}

export const validateMaterialOrderCreationInput = (params: {
  materialTypeId: string
  workTypeId: string
}): string | null => {
  if (!params.materialTypeId) return '자재유형을 선택해주세요'
  if (!params.workTypeId) return '공종을 선택해주세요'
  return null
}

export const validateDirectMaterialDeliveryInput = (params: {
  materialTypeId: string
}): string | null => {
  if (!params.materialTypeId) return '자재유형을 선택해주세요.'
  return null
}
