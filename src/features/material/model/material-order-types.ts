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

export type PhotoType = 'DELIVERY_NOTE' | 'MILL_SHEET' | 'TAG' | 'DELIVERY_PHOTO'

export interface DeliveryPhotoFile {
  photoId: number
  url: string
  type: PhotoType
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
  docId: number | null
}

export interface MaterialDeliveryDetail {
  materialDeliveryId: number
  supplier: string
  application: string | null
  workTypeId: number | null
  workTypeName: string | null
  photoFiles: DeliveryPhotoFile[]
  deliveryLines: DeliveryLineResponse[]
  docId: number | null
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
