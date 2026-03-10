import { reactive, ref } from 'vue'
import { projectDocumentCodeApi } from '@/features/document/public'
import { analyticsClient } from '@/shared/analytics/analyticsClient'
import {
  referenceApi,
  type IdNameResponse,
  type WorkTypeResponse,
  type LaborTypeResponse,
  type MaterialTypeResponse,
  type MaterialSpecResponse,
  type EquipmentTypeResponse,
  type EquipmentSpecResponse,
} from '@/shared/network-core/apis/reference'

interface OverflowEdit {
  startCell: string
  maxRows: string
}

interface SectionEdit {
  startCell: string
  maxRows: string
  overflow: OverflowEdit[]
  columns: Record<string, string>
}

interface ExcludedIds {
  todayWork: { workTypeIds: number[] }
  tomorrowWork: { workTypeIds: number[] }
  attendance: { laborTypeIds: number[] }
  material: { materialSpecIds: number[] }
  equipment: { equipmentSpecIds: number[] }
}

interface CellRefEditState {
  tomorrowWorkMode: number
  fixed: {
    date: string
    dayOfWeek: string
    weather: string
    minTemperature: string
    maxTemperature: string
    tomorrowDate: string
  }
  todayWork: SectionEdit
  tomorrowWork: SectionEdit
  attendance: SectionEdit
  material: SectionEdit
  equipment: SectionEdit
  attendanceDetail: number[]
  excluded: ExcludedIds
  photos: {
    work: {
      cells: string
      descriptionOffsetRow: string
      descriptionOffsetCol: string
    }
  }
}

const SECTION_COLUMN_KEYS: Record<string, string[]> = {
  todayWork: ['workTypeName', 'workName'],
  tomorrowWork: ['workTypeName', 'workName'],
  attendance: ['workTypeDisplayName', 'laborTypeName', 'companyDisplayName', 'cumulativeCount', 'todayCount', 'totalCumulativeCount'],
  material: ['materialTypeName', 'materialSpecName', 'unit', 'cumulativeQuantity', 'todayQuantity', 'totalCumulativeQuantity'],
  equipment: ['equipmentTypeName', 'equipmentSpecName', 'cumulativeCount', 'todayCount', 'totalCumulativeCount'],
}

const SECTION_COLUMN_LABELS: Record<string, Record<string, string>> = {
  todayWork: { workTypeName: '공종명', workName: '작업명' },
  tomorrowWork: { workTypeName: '공종명', workName: '작업명' },
  attendance: { workTypeDisplayName: '공종명', laborTypeName: '직종명', companyDisplayName: '업체명', cumulativeCount: '전일까지총인원', todayCount: '금일인원', totalCumulativeCount: '누적인원' },
  material: { materialTypeName: '자재종류', materialSpecName: '규격명', unit: '단위', cumulativeQuantity: '전일까지총수량', todayQuantity: '금일수량', totalCumulativeQuantity: '누적수량' },
  equipment: { equipmentTypeName: '장비종류', equipmentSpecName: '규격명', cumulativeCount: '전일까지총대수', todayCount: '금일대수', totalCumulativeCount: '누적대수' },
}

function createDefaultColumns(sectionKey: string): Record<string, string> {
  const keys = SECTION_COLUMN_KEYS[sectionKey] ?? []
  const cols: Record<string, string> = {}
  for (const k of keys) cols[k] = ''
  return cols
}

function createDefaultSection(sectionKey: string): SectionEdit {
  return { startCell: '', maxRows: '', overflow: [], columns: createDefaultColumns(sectionKey) }
}

function createDefaultCellRef(): CellRefEditState {
  return {
    tomorrowWorkMode: 1,
    fixed: {
      date: '',
      dayOfWeek: '',
      weather: '',
      minTemperature: '',
      maxTemperature: '',
      tomorrowDate: '',
    },
    todayWork: createDefaultSection('todayWork'),
    tomorrowWork: createDefaultSection('tomorrowWork'),
    attendance: createDefaultSection('attendance'),
    material: createDefaultSection('material'),
    equipment: createDefaultSection('equipment'),
    attendanceDetail: [],
    excluded: {
      todayWork: { workTypeIds: [] },
      tomorrowWork: { workTypeIds: [] },
      attendance: { laborTypeIds: [] },
      material: { materialSpecIds: [] },
      equipment: { equipmentSpecIds: [] },
    },
    photos: {
      work: { cells: '', descriptionOffsetRow: '', descriptionOffsetCol: '' },
    },
  }
}

const SECTION_KEYS = ['todayWork', 'tomorrowWork', 'attendance', 'material', 'equipment'] as const
type SectionKey = (typeof SECTION_KEYS)[number]

export function useDailyReportSetting() {
  const exists = ref(false)
  const isLoading = ref(false)
  const isSaving = ref(false)

  const cellRef = reactive<CellRefEditState>(createDefaultCellRef())
  const dailyReportTemplateUrl = ref<string | null>(null)

  const divisions = ref<IdNameResponse[]>([])
  const workTypes = ref<WorkTypeResponse[]>([])
  const laborTypes = ref<LaborTypeResponse[]>([])
  const materialTypes = ref<MaterialTypeResponse[]>([])
  const materialSpecs = ref<MaterialSpecResponse[]>([])
  const equipmentTypes = ref<EquipmentTypeResponse[]>([])
  const equipmentSpecs = ref<EquipmentSpecResponse[]>([])

  async function loadReferenceData() {
    try {
      const [divList, laborList, matTypes, eqTypes] = await Promise.all([
        referenceApi.getDivisionList(),
        referenceApi.getLaborTypeList(),
        referenceApi.getMaterialTypeList(),
        referenceApi.getEquipmentTypeList(),
      ])
      divisions.value = divList
      laborTypes.value = laborList
      materialTypes.value = matTypes
      equipmentTypes.value = eqTypes

      const [wtLists, msLists, esList] = await Promise.all([
        Promise.all(divList.map((d) => referenceApi.getWorkTypeList(d.id))),
        Promise.all(matTypes.map((mt) => referenceApi.getMaterialSpecList(mt.id))),
        referenceApi.getEquipmentSpecList(),
      ])
      workTypes.value = wtLists.flat()
      materialSpecs.value = msLists.flat()
      equipmentSpecs.value = esList
    } catch (error) {
      console.error('참조 데이터 로드 실패:', error)
    }
  }

  async function load() {
    isLoading.value = true
    try {
      await loadReferenceData()
      const res = await projectDocumentCodeApi.getProjectDocumentCode()
      exists.value = true
      dailyReportTemplateUrl.value = res.dailyReportTemplateUrl

      if (res.dailyReportCellReference) {
        const cellData = JSON.parse(res.dailyReportCellReference) as Record<string, unknown>

        // tomorrowWorkMode
        if (cellData.tomorrowWorkMode != null) {
          cellRef.tomorrowWorkMode = cellData.tomorrowWorkMode as number
        }

        // fixed
        if (cellData.fixed) {
          const f = cellData.fixed as Record<string, string>
          cellRef.fixed.date = f.date ?? ''
          cellRef.fixed.dayOfWeek = f.dayOfWeek ?? ''
          cellRef.fixed.weather = f.weather ?? ''
          cellRef.fixed.minTemperature = f.minTemperature ?? ''
          cellRef.fixed.maxTemperature = f.maxTemperature ?? ''
          cellRef.fixed.tomorrowDate = f.tomorrowDate ?? ''
        }

        // 변동자 섹션들
        for (const key of SECTION_KEYS) {
          if (cellData[key]) {
            const s = cellData[key] as Record<string, unknown>
            cellRef[key].startCell = (s.startCell as string) ?? ''
            cellRef[key].maxRows = s.maxRows != null ? String(s.maxRows) : ''
            if (s.columns) {
              const c = s.columns as Record<string, number | undefined>
              const colKeys = SECTION_COLUMN_KEYS[key] ?? []
              for (const ck of colKeys) {
                cellRef[key].columns[ck] = c[ck] != null ? String(c[ck]) : ''
              }
            }
            if (Array.isArray(s.overflow)) {
              cellRef[key].overflow = (s.overflow as { startCell: string; maxRows: number }[]).map((o) => ({
                startCell: o.startCell ?? '',
                maxRows: o.maxRows != null ? String(o.maxRows) : '',
              }))
            }

            // attendanceDetail (attendance 섹션만)
            if (key === 'attendance' && Array.isArray(s.attendanceDetail)) {
              cellRef.attendanceDetail = [...(s.attendanceDetail as number[])]
            }

            // excluded IDs
            if (key === 'todayWork' || key === 'tomorrowWork') {
              if (Array.isArray(s.excludedWorkTypeIds)) {
                cellRef.excluded[key].workTypeIds = [...(s.excludedWorkTypeIds as number[])]
              }
            }
            if (key === 'attendance') {
              if (Array.isArray(s.excludedLaborTypeIds)) {
                cellRef.excluded.attendance.laborTypeIds = [...(s.excludedLaborTypeIds as number[])]
              }
            }
            if (key === 'material') {
              if (Array.isArray(s.excludedMaterialSpecIds)) {
                cellRef.excluded.material.materialSpecIds = [...(s.excludedMaterialSpecIds as number[])]
              }
            }
            if (key === 'equipment') {
              if (Array.isArray(s.excludedEquipmentSpecIds)) {
                cellRef.excluded.equipment.equipmentSpecIds = [...(s.excludedEquipmentSpecIds as number[])]
              }
            }
          }
        }

        // photos
        if (cellData.photos) {
          const photosMap = cellData.photos as Record<string, Record<string, unknown>>
          if (photosMap.work) {
            const w = photosMap.work
            cellRef.photos.work.cells = Array.isArray(w.cells) ? (w.cells as string[]).join(', ') : ''
            const d = w.descriptionOffset as Record<string, number> | undefined
            cellRef.photos.work.descriptionOffsetRow = d?.row != null ? String(d.row) : ''
            cellRef.photos.work.descriptionOffsetCol = d?.col != null ? String(d.col) : ''
          }
        }
      }
    } catch (error: unknown) {
      const err = error as { response?: { status?: number } }
      if (err.response?.status === 404) {
        exists.value = false
      } else {
        console.error('작업일보 설정 로드 실패:', error)
        const e = error as { response?: { data?: { message?: string } }; message?: string }
        alert(e.response?.data?.message || e.message)
      }
    } finally {
      isLoading.value = false
    }
  }

  function buildPayload() {
    const cellResult: Record<string, unknown> = {}

    // tomorrowWorkMode
    cellResult.tomorrowWorkMode = cellRef.tomorrowWorkMode

    // fixed — 값이 있는 필드만
    const fixedObj: Record<string, string> = {}
    const f = cellRef.fixed
    if (f.date) fixedObj.date = f.date
    if (f.dayOfWeek) fixedObj.dayOfWeek = f.dayOfWeek
    if (f.weather) fixedObj.weather = f.weather
    if (f.minTemperature) fixedObj.minTemperature = f.minTemperature
    if (f.maxTemperature) fixedObj.maxTemperature = f.maxTemperature
    if (cellRef.tomorrowWorkMode === 1 && f.tomorrowDate) fixedObj.tomorrowDate = f.tomorrowDate
    if (Object.keys(fixedObj).length > 0) cellResult.fixed = fixedObj

    // 변동자 섹션들 — startCell이 있을 때만
    for (const key of SECTION_KEYS) {
      const section = cellRef[key]
      if (section.startCell) {
        const sectionObj: Record<string, unknown> = {
          startCell: section.startCell,
        }
        if (section.maxRows !== '') sectionObj.maxRows = Number(section.maxRows)
        const cols: Record<string, number> = {}
        for (const [ck, cv] of Object.entries(section.columns)) {
          if (cv !== '') cols[ck] = Number(cv)
        }
        if (Object.keys(cols).length > 0) sectionObj.columns = cols
        const validOverflows = section.overflow.filter((o) => o.startCell)
        if (validOverflows.length > 0) {
          sectionObj.overflow = validOverflows.map((o) => ({
            startCell: o.startCell,
            maxRows: Number(o.maxRows) || 0,
          }))
        }
        // excluded IDs
        if (key === 'todayWork' || key === 'tomorrowWork') {
          const exc = cellRef.excluded[key]
          if (exc.workTypeIds.length > 0) sectionObj.excludedWorkTypeIds = [...exc.workTypeIds]
        }
        if (key === 'attendance') {
          const exc = cellRef.excluded.attendance
          if (exc.laborTypeIds.length > 0) sectionObj.excludedLaborTypeIds = [...exc.laborTypeIds]

          // attendanceDetail
          if (cellRef.attendanceDetail.length > 0) {
            sectionObj.attendanceDetail = [...cellRef.attendanceDetail]
          }
        }
        if (key === 'material') {
          const exc = cellRef.excluded.material
          if (exc.materialSpecIds.length > 0) sectionObj.excludedMaterialSpecIds = [...exc.materialSpecIds]
        }
        if (key === 'equipment') {
          const exc = cellRef.excluded.equipment
          if (exc.equipmentSpecIds.length > 0) sectionObj.excludedEquipmentSpecIds = [...exc.equipmentSpecIds]
        }

        cellResult[key] = sectionObj
      }
    }

    // photos
    const pw = cellRef.photos.work
    if (pw.cells) {
      const workEntry: Record<string, unknown> = {
        cells: pw.cells.split(',').map((s) => s.trim()).filter(Boolean),
      }
      if (pw.descriptionOffsetRow !== '' || pw.descriptionOffsetCol !== '') {
        workEntry.descriptionOffset = {
          row: pw.descriptionOffsetRow !== '' ? Number(pw.descriptionOffsetRow) : 0,
          col: pw.descriptionOffsetCol !== '' ? Number(pw.descriptionOffsetCol) : 0,
        }
      }
      cellResult.photos = { work: workEntry }
    }

    return {
      dailyReportCellReference: JSON.stringify(cellResult),
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
      analyticsClient.trackAction('admin_daily_report_setting', 'save_daily_report_setting', 'success')
    } catch (error: unknown) {
      console.error('작업일보 설정 저장 실패:', error)
      analyticsClient.trackAction('admin_daily_report_setting', 'save_daily_report_setting', 'fail')
      const e = error as { response?: { data?: { message?: string } }; message?: string }
      alert(e.response?.data?.message || e.message)
    } finally {
      isSaving.value = false
    }
  }

  async function uploadTemplate(file: File) {
    try {
      const res = await projectDocumentCodeApi.uploadDailyReportTemplate(file)
      dailyReportTemplateUrl.value = res.dailyReportTemplateUrl
      alert('템플릿이 업로드되었습니다.')
    } catch (error: unknown) {
      console.error('템플릿 업로드 실패:', error)
      const e = error as { response?: { data?: { message?: string } }; message?: string }
      alert(e.response?.data?.message || e.message)
    }
  }

  function addOverflow(sectionKey: SectionKey) {
    cellRef[sectionKey].overflow.push({ startCell: '', maxRows: '' })
  }

  function removeOverflow(sectionKey: SectionKey, index: number) {
    cellRef[sectionKey].overflow.splice(index, 1)
  }

  function toggleAttendanceDetailLaborType(ltId: number) {
    cellRef.attendanceDetail = cellRef.attendanceDetail.includes(ltId)
      ? cellRef.attendanceDetail.filter((v) => v !== ltId)
      : [...cellRef.attendanceDetail, ltId]
  }

  function toggleId(list: number[], id: number): number[] {
    return list.includes(id) ? list.filter((v) => v !== id) : [...list, id]
  }

  return {
    exists,
    isLoading,
    isSaving,
    cellRef,
    dailyReportTemplateUrl,
    sectionColumnKeys: SECTION_COLUMN_KEYS,
    sectionColumnLabels: SECTION_COLUMN_LABELS,
    divisions,
    workTypes,
    laborTypes,
    materialTypes,
    materialSpecs,
    equipmentTypes,
    equipmentSpecs,
    load,
    save,
    uploadTemplate,
    addOverflow,
    removeOverflow,
    toggleAttendanceDetailLaborType,
    toggleId,
  }
}
