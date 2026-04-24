import type { DocumentJobResponse } from '@/shared/network-core/apis/document'

export type {
  DocumentJobDocType,
  DocumentJobStatus,
  DocumentJobResponse,
} from '@/shared/network-core/apis/document'

export type MaterialInspectionRequestResponse = DocumentJobResponse

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
    overflow?: { startCell: string; maxRows: number }[]
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
  mirCellReference: string
  mirTemplateUrl: string | null
  dailyReportTemplateUrl: string | null
  dailyReportCellReference: string
  createdAt: string
  updatedAt: string
}

export interface ImageCategory {
  key: string
  label: string
}

// Daily Report types
export interface DailyReportResponse {
  id: number
  date: string
  dailyReportUrl: string | null
  createdAt: string
}

export interface ValidateDailyReportSectionItem {
  index: number
  rowKey: string
  values: (string | number | null)[]
}

export interface ValidateDailyReportSection {
  sectionName: string
  totalMaxRows: number
  dataRowCount: number
  exceeded: boolean
  columns: Record<string, number>
  items: ValidateDailyReportSectionItem[]
}

export interface ValidateDailyReportPhotoItem {
  index: number
  thumbnailUrl: string
  description: string
}

export interface ValidateDailyReportPhotos {
  totalCells: number
  photoCount: number
  exceeded: boolean
  items: ValidateDailyReportPhotoItem[]
}

export interface ValidateDailyReportResponse {
  sections: ValidateDailyReportSection[]
  photos: ValidateDailyReportPhotos | null
}
