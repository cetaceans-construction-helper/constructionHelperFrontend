export type DocumentSlot = 'TEXT' | 'DATE' | 'DIVISION' | 'WORK_TYPE' | 'MATERIAL_TYPE' | 'SEQ'

export interface MirSlotValue {
  type: DocumentSlot
  value?: string
  format?: string
  padding?: number
  groupBy?: string[]
}

export interface MirDocumentNumberCode {
  separator: string
  A: MirSlotValue | null
  B: MirSlotValue | null
  C: MirSlotValue | null
  D: MirSlotValue | null
  E: MirSlotValue | null
}

export interface MirCellReference {
  delivery?: {
    supplier?: string
    deliveryDate?: string
    location?: string
    documentNumber?: string
    materialTypeName?: string
    divisionName?: string
  }
  lines?: {
    startCell: string
    maxRows?: number
    columns?: {
      no?: number
      specName?: number
      manufacturer?: number
      quantity?: number
      unit?: number
    }
  }
  lineConcat?: {
    cell: string
    field: string
    separator: string
  }[]
  photos?: Record<
    string,
    {
      cells: string[]
      descriptionOffset?: { row: number; col: number }
    }
  >
}

export interface ProjectDocumentCodeResponse {
  id: number
  mirDocumentNumberCode: string
  mirCellReference: string
  templateUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface MaterialInspectionRequestResponse {
  id: number
  materialDeliveryId: number
  documentNumber: string
  mirUrl: string | null
  deliveryDate: string
  createdAt: string
}

export interface SlotConfig {
  key: 'A' | 'B' | 'C' | 'D' | 'E'
  type: DocumentSlot | null
  value: string
  format: string
  padding: number
  groupBy: string[]
}

export interface ImageCategory {
  key: string
  label: string
}

export interface DocumentNumberOptionsResponse {
  dateFormats: string[]
  imageCategories: ImageCategory[]
}
