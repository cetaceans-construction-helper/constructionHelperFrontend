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

export interface MaterialDeliverySummary {
  materialDeliveryId: number
  materialTypeId: number
  materialTypeName: string
  deliveryDate: string
  unit: string
  mirDocumentNumber: string | null
  totalQuantity: number
}

export interface MaterialDeliveryDetailZone {
  id: number
  name: string
}

export interface MaterialDeliveryDetailFloor {
  id: number
  name: string
}

export interface MaterialDeliveryDetailComponentType {
  componentTypeId: number
  componentTypeName: string
  isStructure: boolean
}

export interface MaterialDeliveryDetail {
  materialDeliveryId: number
  supplier: string
  workTypeId: number | null
  workTypeName: string | null
  zones: MaterialDeliveryDetailZone[]
  floors: MaterialDeliveryDetailFloor[]
  componentTypes: MaterialDeliveryDetailComponentType[]
  noteFiles: DeliveryFileInfo[]
  photoFiles: DeliveryFileInfo[]
  deliveryLines: DeliveryLineResponse[]
}

export interface CreateDeliveryResponse {
  deliveryId: number
}

export interface DeliveryLineResponse {
  deliveryLineId: number
  manufacturer: string | null
  materialSpecId: number | null
  materialSpecName: string | null
  quantity: number
}

export interface DeliveryQuantityByDate {
  materialTypeName: string
  materialSpecName: string
  totalQuantity: number
  unit: string
  workTypeName: string
}

export type MaterialOrderStatus = 'BEFORE_ORDER' | 'ORDER_COMPLETED' | 'RECEIPT_COMPLETED'
