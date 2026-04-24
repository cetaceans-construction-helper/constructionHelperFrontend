import { reactive, ref } from 'vue'
import { projectDocumentCodeApi } from '@/features/document/public'
import type { ImageCategory } from '@/features/document/public'
import { docConfigApi } from '@/shared/network-core/apis/docConfig'
import { analyticsClient } from '@/shared/analytics/analyticsClient'

// UI 편집용 내부 타입 (모든 필드를 non-optional로 관리)
interface CellRefEditState {
  delivery: {
    supplier: string
    deliveryDate: string
    location: string
    documentNumber: string
    materialTypeName: string
    divisionName: string
  }
  lines: {
    startCell: string
    maxRows: string
    columns: {
      no: string
      specName: string
      manufacturer: string
      quantity: string
      unit: string
    }
    overflow: { startCell: string; maxRows: string }[]
  }
  lineConcat: { cell: string; field: string; separator: string }[]
  photos: { key: string; cells: string; descriptionOffsetRow: string; descriptionOffsetCol: string }[]
}

function createDefaultCellRef(): CellRefEditState {
  return {
    delivery: {
      supplier: '',
      deliveryDate: '',
      location: '',
      documentNumber: '',
      materialTypeName: '',
      divisionName: '',
    },
    lines: {
      startCell: '',
      maxRows: '',
      columns: {
        no: '',
        specName: '',
        manufacturer: '',
        quantity: '',
        unit: '',
      },
      overflow: [],
    },
    lineConcat: [],
    photos: [],
  }
}

const MIR_IMAGE_CATEGORIES: ImageCategory[] = [
  { key: 'DELIVERY_NOTE', label: '납품서' },
  { key: 'MILL_SHEET', label: '시험성적서' },
  { key: 'TAG', label: '태그' },
  { key: 'DELIVERY_PHOTO', label: '반입사진' },
]

export function useDocumentSetting() {
  const exists = ref(false)
  const isLoading = ref(false)
  const isSaving = ref(false)

  const cellRef = reactive<CellRefEditState>(createDefaultCellRef())
  const mirTemplateUrl = ref<string | null>(null)
  const imageCategories = ref<ImageCategory[]>(MIR_IMAGE_CATEGORIES)

  async function load(projectId: string) {
    isLoading.value = true
    try {
      const res = await docConfigApi.getDocConfig(projectId)
      exists.value = true
      mirTemplateUrl.value = res.mirTemplateUrl

      if (res.mirExcelCellRef) {
        const cellData = JSON.parse(res.mirExcelCellRef) as Record<string, unknown>
        // delivery
        if (cellData.delivery) {
          const d = cellData.delivery as Record<string, string>
          cellRef.delivery.supplier = d.supplier ?? ''
          cellRef.delivery.deliveryDate = d.deliveryDate ?? ''
          cellRef.delivery.location = d.location ?? ''
          cellRef.delivery.documentNumber = d.documentNumber ?? ''
          cellRef.delivery.materialTypeName = d.materialTypeName ?? ''
          cellRef.delivery.divisionName = d.divisionName ?? ''
        }
        // lines
        if (cellData.lines) {
          const l = cellData.lines as Record<string, unknown>
          cellRef.lines.startCell = (l.startCell as string) ?? ''
          cellRef.lines.maxRows = l.maxRows != null ? String(l.maxRows) : ''
          if (l.columns) {
            const c = l.columns as Record<string, number | undefined>
            cellRef.lines.columns.no = c.no != null ? String(c.no) : ''
            cellRef.lines.columns.specName = c.specName != null ? String(c.specName) : ''
            cellRef.lines.columns.manufacturer = c.manufacturer != null ? String(c.manufacturer) : ''
            cellRef.lines.columns.quantity = c.quantity != null ? String(c.quantity) : ''
            cellRef.lines.columns.unit = c.unit != null ? String(c.unit) : ''
          }
          if (Array.isArray(l.overflow)) {
            cellRef.lines.overflow = (l.overflow as { startCell: string; maxRows: number }[]).map((o) => ({
              startCell: o.startCell ?? '',
              maxRows: o.maxRows != null ? String(o.maxRows) : '',
            }))
          }
        }
        // lineConcat
        cellRef.lineConcat = (cellData.lineConcat as CellRefEditState['lineConcat']) ?? []
        // photos (named map → 배열)
        if (cellData.photos) {
          const photosMap = cellData.photos as Record<string, Record<string, unknown>>
          const descrOffset = (v: Record<string, unknown>) => {
            const d = v.descriptionOffset as Record<string, number> | undefined
            return { row: d?.row != null ? String(d.row) : '', col: d?.col != null ? String(d.col) : '' }
          }
          cellRef.photos = Object.entries(photosMap).map(([key, val]) => ({
            key,
            cells: Array.isArray(val.cells) ? (val.cells as string[]).join(', ') : '',
            descriptionOffsetRow: descrOffset(val).row,
            descriptionOffsetCol: descrOffset(val).col,
          }))
        }
      }
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } }
      if (err.response?.status === 404) {
        exists.value = false
      } else {
        console.error('문서 설정 로드 실패:', error)
        const e = error as { response?: { data?: { message?: string } }; message?: string }
        alert(e.response?.data?.message || e.message)
      }
    } finally {
      isLoading.value = false
    }
  }

  function buildPayload() {
    // cellReference: 비어있는 섹션/필드 제외
    const cellResult: Record<string, unknown> = {}

    // delivery — 값이 있는 필드만
    const del = cellRef.delivery
    const delObj: Record<string, string> = {}
    if (del.supplier) delObj.supplier = del.supplier
    if (del.deliveryDate) delObj.deliveryDate = del.deliveryDate
    if (del.location) delObj.location = del.location
    if (del.documentNumber) delObj.documentNumber = del.documentNumber
    if (del.materialTypeName) delObj.materialTypeName = del.materialTypeName
    if (del.divisionName) delObj.divisionName = del.divisionName
    if (Object.keys(delObj).length > 0) cellResult.delivery = delObj

    // lines — startCell이 있을 때만
    if (cellRef.lines.startCell) {
      const linesObj: Record<string, unknown> = {
        startCell: cellRef.lines.startCell,
      }
      if (cellRef.lines.maxRows !== '') linesObj.maxRows = Number(cellRef.lines.maxRows)
      // columns — 값이 입력된 필드만 (빈 문자열이면 제외)
      const cols: Record<string, number> = {}
      const c = cellRef.lines.columns
      if (c.no !== '') cols.no = Number(c.no)
      if (c.specName !== '') cols.specName = Number(c.specName)
      if (c.manufacturer !== '') cols.manufacturer = Number(c.manufacturer)
      if (c.quantity !== '') cols.quantity = Number(c.quantity)
      if (c.unit !== '') cols.unit = Number(c.unit)
      if (Object.keys(cols).length > 0) linesObj.columns = cols
      const validOverflows = cellRef.lines.overflow.filter((o) => o.startCell)
      if (validOverflows.length > 0) {
        linesObj.overflow = validOverflows.map((o) => ({
          startCell: o.startCell,
          maxRows: Number(o.maxRows) || 0,
        }))
      }
      cellResult.lines = linesObj
    }

    // lineConcat
    if (cellRef.lineConcat.length > 0) {
      cellResult.lineConcat = cellRef.lineConcat.map((lc) => ({ ...lc }))
    }

    // photos — named map으로 직렬화
    const validPhotos = cellRef.photos.filter((p) => p.key && p.cells)
    if (validPhotos.length > 0) {
      const photosObj: Record<string, Record<string, unknown>> = {}
      for (const p of validPhotos) {
        const entry: Record<string, unknown> = {
          cells: p.cells.split(',').map((s) => s.trim()).filter(Boolean),
        }
        if (p.descriptionOffsetRow !== '' || p.descriptionOffsetCol !== '') {
          entry.descriptionOffset = {
            row: p.descriptionOffsetRow !== '' ? Number(p.descriptionOffsetRow) : 0,
            col: p.descriptionOffsetCol !== '' ? Number(p.descriptionOffsetCol) : 0,
          }
        }
        photosObj[p.key] = entry
      }
      cellResult.photos = photosObj
    }

    return {
      mirCellReference: JSON.stringify(cellResult),
    }
  }

  async function save() {
    isSaving.value = true
    try {
      const payload = buildPayload()
      if (exists.value) {
        await projectDocumentCodeApi.updateProjectDocumentCode(payload)
      } else {
        await projectDocumentCodeApi.createProjectDocumentCode(payload)
        exists.value = true
      }
      alert('저장되었습니다.')
      analyticsClient.trackAction('admin_document_setting', 'save_document_setting', 'success')
    } catch (error: unknown) {
      console.error('문서 설정 저장 실패:', error)
      analyticsClient.trackAction('admin_document_setting', 'save_document_setting', 'fail')
      const e = error as { response?: { data?: { message?: string } }; message?: string }
      alert(e.response?.data?.message || e.message)
    } finally {
      isSaving.value = false
    }
  }

  async function ensureDocConfig(projectId: string) {
    if (exists.value) return
    await docConfigApi.createDocConfig(projectId)
    exists.value = true
  }

  async function uploadTemplate(projectId: string, file: File) {
    try {
      await ensureDocConfig(projectId)
      const res = await docConfigApi.uploadTemplate(projectId, 'MIR', file)
      mirTemplateUrl.value = res.mirTemplateUrl
      alert('템플릿이 업로드되었습니다.')
    } catch (error: unknown) {
      console.error('템플릿 업로드 실패:', error)
      const e = error as { response?: { data?: { message?: string } }; message?: string }
      alert(e.response?.data?.message || e.message)
    }
  }

  return {
    exists,
    isLoading,
    isSaving,
    cellRef,
    mirTemplateUrl,
    imageCategories,
    load,
    save,
    uploadTemplate,
  }
}
