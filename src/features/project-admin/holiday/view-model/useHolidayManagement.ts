import { ref, computed, watch } from 'vue'
import { useCalendarStore } from '@/app/context/stores/calendarStore'
import { useProjectStore } from '@/app/context/stores/project'
import { projectCalendarApi } from '@/shared/network-core/apis/projectCalendar'
import type { CalendarDateInfo } from '@/shared/network-core/contracts/calendar'

export interface CalendarCell {
  date: string
  dayOfMonth: number
  isCurrentMonth: boolean
  isHoliday: boolean
  isHolManual: boolean
  isActivated: boolean
  deactivatedReason: string | null
  holidayName: string | null
  isInProjectRange: boolean
}

export type InactiveFlowMode = 'idle' | 'set' | 'release'
export type InactiveFlowStep = 'select_start' | 'select_end' | 'confirm'

export interface InactiveFlowState {
  mode: InactiveFlowMode
  step: InactiveFlowStep
  startDate: string | null
  endDate: string | null
  reason: string
}

function formatDate(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const current = new Date(startDate)
  const end = new Date(endDate)
  while (current <= end) {
    const y = current.getFullYear()
    const m = String(current.getMonth() + 1).padStart(2, '0')
    const d = String(current.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${d}`)
    current.setDate(current.getDate() + 1)
  }
  return dates
}

export function useHolidayManagement() {
  const calendarStore = useCalendarStore()
  const projectStore = useProjectStore()

  const currentYear = ref(new Date().getFullYear())
  const currentMonth = ref(new Date().getMonth())
  const isLoading = ref(false)
  const isUpdating = ref(false)

  const inactiveFlow = ref<InactiveFlowState>({
    mode: 'idle',
    step: 'select_start',
    startDate: null,
    endDate: null,
    reason: '',
  })

  const projectStartDate = computed(() => calendarStore.calendarData?.projectStartDate ?? '')
  const projectEndDate = computed(() => calendarStore.calendarData?.projectEndDate ?? '')

  const dateInfoMap = computed(() => {
    const map = new Map<string, CalendarDateInfo>()
    if (calendarStore.calendarData) {
      for (const d of calendarStore.calendarData.dates) {
        map.set(d.date, d)
      }
    }
    return map
  })

  const calendarGrid = computed((): CalendarCell[][] => {
    const year = currentYear.value
    const month = currentMonth.value
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()

    // 일요일 시작: Sun=0, Mon=1, ..., Sat=6
    const startDayOfWeek = firstDay.getDay()

    const cells: CalendarCell[] = []

    // 이전 달 채우기
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i
      const prevMonth = month === 0 ? 11 : month - 1
      const prevYear = month === 0 ? year - 1 : year
      const dateStr = formatDate(prevYear, prevMonth, day)
      const info = dateInfoMap.value.get(dateStr)
      cells.push(createCell(dateStr, day, false, info))
    }

    // 현재 달
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = formatDate(year, month, day)
      const info = dateInfoMap.value.get(dateStr)
      cells.push(createCell(dateStr, day, true, info))
    }

    // 다음 달 채우기 (6행 = 42셀)
    const remaining = 42 - cells.length
    for (let day = 1; day <= remaining; day++) {
      const nextMonth = month === 11 ? 0 : month + 1
      const nextYear = month === 11 ? year + 1 : year
      const dateStr = formatDate(nextYear, nextMonth, day)
      const info = dateInfoMap.value.get(dateStr)
      cells.push(createCell(dateStr, day, false, info))
    }

    // 6행으로 분할
    const rows: CalendarCell[][] = []
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7))
    }
    return rows
  })

  function createCell(
    date: string,
    dayOfMonth: number,
    isCurrentMonth: boolean,
    info: CalendarDateInfo | undefined,
  ): CalendarCell {
    const inRange =
      projectStartDate.value && projectEndDate.value
        ? date >= projectStartDate.value && date <= projectEndDate.value
        : false

    return {
      date,
      dayOfMonth,
      isCurrentMonth,
      isHoliday: info?.isHoliday ?? false,
      isHolManual: info?.isHolManual ?? false,
      isActivated: info?.isActivated ?? true,
      deactivatedReason: info?.deactivatedReason ?? null,
      holidayName: info?.holidayName ?? null,
      isInProjectRange: inRange,
    }
  }

  async function loadCalendar() {
    const projectId = projectStore.selectedProjectId
    if (!projectId) return
    isLoading.value = true
    try {
      await calendarStore.getCalendar(projectId, true)
    } finally {
      isLoading.value = false
    }
  }

  function goToPrevMonth() {
    if (currentMonth.value === 0) {
      currentMonth.value = 11
      currentYear.value--
    } else {
      currentMonth.value--
    }
  }

  function goToNextMonth() {
    if (currentMonth.value === 11) {
      currentMonth.value = 0
      currentYear.value++
    } else {
      currentMonth.value++
    }
  }

  async function toggleHoliday(cell: CalendarCell) {
    if (!cell.isInProjectRange || !cell.isCurrentMonth || !cell.isActivated) return
    isUpdating.value = true
    try {
      await projectCalendarApi.updateWorkDate({
        dates: [cell.date],
        isHoliday: !cell.isHoliday,
      })
      await calendarStore.refreshCalendar()
    } catch (error: unknown) {
      console.error('휴일 토글 실패:', error)
      const e = error as { response?: { data?: { message?: string } }; message?: string }
      alert(e.response?.data?.message || e.message)
    } finally {
      isUpdating.value = false
    }
  }

  // 비활성일 플로우 시작
  function startInactiveFlow(mode: 'set' | 'release') {
    inactiveFlow.value = {
      mode,
      step: 'select_start',
      startDate: null,
      endDate: null,
      reason: '',
    }
  }

  // 비활성일 플로우에서 날짜 선택
  function selectInactiveDate(dateStr: string) {
    const flow = inactiveFlow.value
    if (flow.mode === 'idle') return

    if (flow.step === 'select_start') {
      flow.startDate = dateStr
      flow.endDate = null
      flow.step = 'select_end'
    } else if (flow.step === 'select_end') {
      // 시작일보다 이전이면 swap
      if (dateStr < flow.startDate!) {
        flow.endDate = flow.startDate
        flow.startDate = dateStr
      } else {
        flow.endDate = dateStr
      }
      flow.step = 'confirm'
    }
  }

  // 날짜 재선택
  function resetInactiveSelection() {
    const flow = inactiveFlow.value
    flow.step = 'select_start'
    flow.startDate = null
    flow.endDate = null
  }

  // 비활성일 플로우 취소
  function cancelInactiveFlow() {
    inactiveFlow.value = {
      mode: 'idle',
      step: 'select_start',
      startDate: null,
      endDate: null,
      reason: '',
    }
  }

  // 비활성일 설정 확정
  async function confirmInactiveFlow() {
    const flow = inactiveFlow.value
    if (!flow.startDate || !flow.endDate) return

    isUpdating.value = true
    try {
      if (flow.mode === 'set') {
        await projectCalendarApi.updateWorkDate({
          dates: generateDateRange(flow.startDate, flow.endDate),
          isActivated: false,
          deactivatedReason: flow.reason,
        })
      } else {
        await projectCalendarApi.updateWorkDate({
          dates: generateDateRange(flow.startDate, flow.endDate),
          isActivated: true,
        })
      }
      await calendarStore.refreshCalendar()
      cancelInactiveFlow()
    } catch (error: unknown) {
      console.error('비활성일 처리 실패:', error)
      const e = error as { response?: { data?: { message?: string } }; message?: string }
      alert(e.response?.data?.message || e.message)
    } finally {
      isUpdating.value = false
    }
  }

  // 날짜가 선택 범위에 포함되는지 확인
  function isInSelectedRange(dateStr: string): boolean {
    const flow = inactiveFlow.value
    if (flow.mode === 'idle') return false
    if (flow.startDate && !flow.endDate) {
      return dateStr === flow.startDate
    }
    if (flow.startDate && flow.endDate) {
      return dateStr >= flow.startDate && dateStr <= flow.endDate
    }
    return false
  }

  // 프로젝트 변경 시 캘린더 다시 로드
  watch(() => projectStore.selectedProjectId, () => {
    loadCalendar()
  })

  return {
    currentYear,
    currentMonth,
    isLoading,
    isUpdating,
    inactiveFlow,
    projectStartDate,
    projectEndDate,
    calendarGrid,
    loadCalendar,
    goToPrevMonth,
    goToNextMonth,
    toggleHoliday,
    startInactiveFlow,
    selectInactiveDate,
    resetInactiveSelection,
    cancelInactiveFlow,
    confirmInactiveFlow,
    isInSelectedRange,
  }
}
