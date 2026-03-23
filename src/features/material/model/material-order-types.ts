export interface MaterialOrderLineResponse {
  id: number
  taskId: number
  object3dId: number | null
  materialSpecId: number
  materialSpecName: string
  componentCodeId: number
  componentCodeName: string | null
  workStepId: number | null
  workStepName: string | null
  zoneId: number | null
  zoneName: string | null
  floorId: number | null
  floorName: string | null
  sectionId: number | null
  sectionName: string | null
  usageId: number | null
  usageName: string | null
  quantity: number
}

export interface SpecSummary {
  materialSpecId: number
  materialSpecName: string
  quantity: number
}

export interface MaterialOrderResponse {
  id: number
  orderNo: string
  orderStatus: string
  materialTypeId: number
  materialTypeName: string
  unit: string
  workTypeId: number
  workTypeName: string
  totalQuantity: number
  specSummary: SpecSummary[]
  orderedAt: string | null
  createdAt: string
  orderLines: MaterialOrderLineResponse[]
}

export interface DeliveryFileInfo {
  noteId?: number
  photoId?: number
  url: string
  description: string
}

export interface DeliverySpecQuantity {
  materialSpecId: number
  materialSpecName: string
  quantity: number
}

export interface MaterialDeliverySummary {
  materialDeliveryId: number
  materialOrderId: number
  materialOrderNumber: string
  supplier: string
  deliveryDate: string
  location: string | null
  noteFiles: DeliveryFileInfo[]
  photoFiles: DeliveryFileInfo[]
  unit: string
  specQuantities: DeliverySpecQuantity[]
}

export interface CreateDeliveryResponse {
  deliveryId: number
}

export interface DeliveryLineResponse {
  deliveryLineId: number
  manufacturer: string | null
  materialSpecId: number | null
  materialSpecName: string | null
  specValidation: boolean
  quantity: number
}

export interface DeliveryQuantityByDate {
  materialTypeName: string
  materialSpecName: string
  totalQuantity: number
  unit: string
  workTypeName: string | null
}

export type MaterialOrderStatus = 'BEFORE_ORDER' | 'ORDER_COMPLETED' | 'RECEIPT_COMPLETED'
