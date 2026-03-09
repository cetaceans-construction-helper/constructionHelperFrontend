import { reactive, ref } from 'vue'
import { projectDocumentCodeApi } from '@/features/document/public'
import { analyticsClient } from '@/shared/analytics/analyticsClient'

interface OverflowEdit {
  startCell: string
  maxRows: string
}

interface SectionEdit {
  startCell: string
  maxRows: string
  overflow: OverflowEdit[]
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
  photos: {
    work: {
      cells: string
      descriptionOffsetRow: string
      descriptionOffsetCol: string
    }
  }
}

function createDefaultSection(): SectionEdit {
  return { startCell: '', maxRows: '', overflow: [] }
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
    todayWork: createDefaultSection(),
    tomorrowWork: createDefaultSection(),
    attendance: createDefaultSection(),
    material: createDefaultSection(),
    equipment: createDefaultSection(),
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

  async function load() {
    isLoading.value = true
    try {
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
            if (Array.isArray(s.overflow)) {
              cellRef[key].overflow = (s.overflow as { startCell: string; maxRows: number }[]).map((o) => ({
                startCell: o.startCell ?? '',
                maxRows: o.maxRows != null ? String(o.maxRows) : '',
              }))
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
        const validOverflows = section.overflow.filter((o) => o.startCell)
        if (validOverflows.length > 0) {
          sectionObj.overflow = validOverflows.map((o) => ({
            startCell: o.startCell,
            maxRows: Number(o.maxRows) || 0,
          }))
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

  return {
    exists,
    isLoading,
    isSaving,
    cellRef,
    dailyReportTemplateUrl,
    load,
    save,
    uploadTemplate,
    addOverflow,
    removeOverflow,
  }
}
