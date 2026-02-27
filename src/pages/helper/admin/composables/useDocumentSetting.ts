import { reactive, ref } from 'vue'
import { projectDocumentCodeApi } from '@/api/projectDocumentCode'
import type {
  SlotConfig,
  MirDocumentNumberCode,
  MirSlotValue,
  ImageCategory,
} from '@/api/projectDocumentCode'

function createDefaultSlots(): SlotConfig[] {
  return (['A', 'B', 'C', 'D', 'E'] as const).map((key) => ({
    key,
    type: null,
    value: '',
    format: 'YYYYMMDD',
    padding: 3,
    groupBy: [],
  }))
}

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
    shiftExisting: boolean
    columns: {
      no: string
      specName: string
      manufacturer: string
      quantity: string
      unit: string
    }
  }
  lineConcat: { cell: string; field: string; separator: string }[]
  photos: { key: string; startCell: string; direction: 'row' | 'column'; span: number; descriptionOffsetRow: string; descriptionOffsetCol: string }[]
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
      shiftExisting: false,
      columns: {
        no: '',
        specName: '',
        manufacturer: '',
        quantity: '',
        unit: '',
      },
    },
    lineConcat: [],
    photos: [],
  }
}

export function useDocumentSetting() {
  const exists = ref(false)
  const isLoading = ref(false)
  const isSaving = ref(false)

  const separator = ref('-')
  const slots = ref<SlotConfig[]>(createDefaultSlots())
  const cellRef = reactive<CellRefEditState>(createDefaultCellRef())
  const mirTemplateUrl = ref<string | null>(null)
  const dateFormats = ref<string[]>([])
  const imageCategories = ref<ImageCategory[]>([])

  async function load() {
    isLoading.value = true
    try {
      // options 로드 (실패해도 설정 로드 계속)
      projectDocumentCodeApi
        .getDocumentNumberOptions()
        .then((opts) => {
          dateFormats.value = opts.dateFormats
          imageCategories.value = opts.imageCategories
        })
        .catch(() => {})

      const res = await projectDocumentCodeApi.getProjectDocumentCode()
      exists.value = true
      mirTemplateUrl.value = res.templateUrl

      const numCode: MirDocumentNumberCode = JSON.parse(res.mirDocumentNumberCode)
      separator.value = numCode.separator || '-'

      for (const slot of slots.value) {
        const slotVal = numCode[slot.key] as MirSlotValue | null
        if (slotVal) {
          slot.type = slotVal.type
          if (slotVal.value != null) slot.value = slotVal.value
          if (slotVal.format != null) slot.format = slotVal.format
          if (slotVal.padding != null) slot.padding = slotVal.padding
          if (Array.isArray(slotVal.groupBy)) slot.groupBy = slotVal.groupBy
        } else {
          slot.type = null
        }
      }

      const cellData = JSON.parse(res.mirCellReference) as Record<string, unknown>
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
        cellRef.lines.shiftExisting = (l.shiftExisting as boolean) ?? false
        if (l.columns) {
          const c = l.columns as Record<string, number | undefined>
          cellRef.lines.columns.no = c.no != null ? String(c.no) : ''
          cellRef.lines.columns.specName = c.specName != null ? String(c.specName) : ''
          cellRef.lines.columns.manufacturer = c.manufacturer != null ? String(c.manufacturer) : ''
          cellRef.lines.columns.quantity = c.quantity != null ? String(c.quantity) : ''
          cellRef.lines.columns.unit = c.unit != null ? String(c.unit) : ''
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
          startCell: (val.startCell as string) ?? '',
          direction: ((val.direction as string) ?? 'column') as 'row' | 'column',
          span: (val.span as number) ?? 1,
          descriptionOffsetRow: descrOffset(val).row,
          descriptionOffsetCol: descrOffset(val).col,
        }))
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
    const numCode: Record<string, unknown> = { separator: separator.value }
    for (const slot of slots.value) {
      if (!slot.type) {
        numCode[slot.key] = null
        continue
      }
      const slotObj: Record<string, unknown> = { type: slot.type }
      switch (slot.type) {
        case 'TEXT':
          slotObj.value = slot.value
          break
        case 'DATE':
          slotObj.format = slot.format
          break
        case 'SEQ':
          slotObj.padding = slot.padding
          slotObj.groupBy = slot.groupBy
          break
      }
      numCode[slot.key] = slotObj
    }

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
      if (cellRef.lines.shiftExisting) linesObj.shiftExisting = true
      // columns — 값이 입력된 필드만 (빈 문자열이면 제외)
      const cols: Record<string, number> = {}
      const c = cellRef.lines.columns
      if (c.no !== '') cols.no = Number(c.no)
      if (c.specName !== '') cols.specName = Number(c.specName)
      if (c.manufacturer !== '') cols.manufacturer = Number(c.manufacturer)
      if (c.quantity !== '') cols.quantity = Number(c.quantity)
      if (c.unit !== '') cols.unit = Number(c.unit)
      if (Object.keys(cols).length > 0) linesObj.columns = cols
      cellResult.lines = linesObj
    }

    // lineConcat
    if (cellRef.lineConcat.length > 0) {
      cellResult.lineConcat = cellRef.lineConcat.map((lc) => ({ ...lc }))
    }

    // photos — named map으로 직렬화
    const validPhotos = cellRef.photos.filter((p) => p.key && p.startCell)
    if (validPhotos.length > 0) {
      const photosObj: Record<string, Record<string, unknown>> = {}
      for (const p of validPhotos) {
        const entry: Record<string, unknown> = { startCell: p.startCell }
        if (p.direction) entry.direction = p.direction
        if (p.span > 1) entry.span = p.span
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
      mirDocumentNumberCode: JSON.stringify(numCode),
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
    } catch (error: unknown) {
      console.error('문서 설정 저장 실패:', error)
      const e = error as { response?: { data?: { message?: string } }; message?: string }
      alert(e.response?.data?.message || e.message)
    } finally {
      isSaving.value = false
    }
  }

  async function uploadTemplate(file: File) {
    try {
      const res = await projectDocumentCodeApi.uploadMirTemplate(file)
      mirTemplateUrl.value = res.templateUrl
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
    separator,
    slots,
    cellRef,
    mirTemplateUrl,
    dateFormats,
    imageCategories,
    load,
    save,
    uploadTemplate,
  }
}
