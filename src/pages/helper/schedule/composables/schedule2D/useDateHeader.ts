import { ref, computed, type Ref, type ComputedRef } from 'vue'
import type { CalendarResponse, CalendarDateInfo } from '@/types/calendar'
import { getDateType } from '@/types/calendar'

// 날짜 헤더 타입 정의
export interface DateCellInfo {
  date: Date
  dateString: string          // "YYYY-MM-DD" 형식
  dayIndex: number
  dayOfMonth: number
  dayName: string
  isHoliday: boolean          // 휴일 여부
  holidayName: string | null  // 휴일명
  isDeactivated: boolean      // 비활성일 여부
  deactivatedReason: string | null // 비활성일 사유
  isToday: boolean
  year: number
  month: number
  weekNumber: number
}

export interface MergedHeaderCell {
  startIndex: number
  span: number
  label: string
}

// 상수
export const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']
export const DAY_WIDTH = 40
export const ROW_HEIGHT = 20
export const HEADER_HEIGHT = ROW_HEIGHT * 5 // 100px (5단 헤더)

// 병합 셀 생성 함수
function createMergedCells(
  dates: DateCellInfo[],
  groupKey: 'year' | 'month' | 'weekNumber',
  labelFn: (d: DateCellInfo) => string
): MergedHeaderCell[] {
  if (dates.length === 0) return []

  const cells: MergedHeaderCell[] = []
  let currentGroup = dates[0]![groupKey]
  let startIndex = dates[0]!.dayIndex
  let span = 1

  for (let i = 1; i < dates.length; i++) {
    const date = dates[i]!
    if (date[groupKey] === currentGroup) {
      span++
    } else {
      cells.push({
        startIndex,
        span,
        label: labelFn(dates[i - 1]!)
      })
      currentGroup = date[groupKey]
      startIndex = date.dayIndex
      span = 1
    }
  }

  // 마지막 그룹 추가
  cells.push({
    startIndex,
    span,
    label: labelFn(dates[dates.length - 1]!)
  })

  return cells
}

interface Viewport {
  x: number
  y: number
  zoom: number
}

// CalendarDateInfo를 DateCellInfo로 변환
function convertToDateCellInfo(
  calendarDate: CalendarDateInfo,
  dayIndex: number,
  todayString: string
): DateCellInfo {
  const date = new Date(calendarDate.date)
  const dateType = getDateType(calendarDate)

  return {
    date,
    dateString: calendarDate.date,
    dayIndex,
    dayOfMonth: date.getDate(),
    dayName: DAY_NAMES[calendarDate.dayOfWeek]!,
    isHoliday: dateType === 'holiday',
    holidayName: calendarDate.holidayName,
    isDeactivated: dateType === 'deactivated',
    deactivatedReason: calendarDate.deactivatedReason,
    isToday: calendarDate.date === todayString,
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    weekNumber: calendarDate.weekNumber
  }
}

export function useDateHeader(
  viewport: Ref<Viewport>,
  calendarData: ComputedRef<CalendarResponse | null>
) {
  // 컨테이너 참조 및 크기
  const containerRef = ref<HTMLElement | null>(null)
  const containerWidth = ref(0)
  let resizeObserver: ResizeObserver | null = null

  // 오늘 날짜 문자열 (YYYY-MM-DD, 로컬 시간 기준)
  const today = new Date()
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // 오늘 날짜 기준 오프셋 (오늘이 0, 과거는 음수, 미래는 양수)
  const todayOffset = computed(() => {
    if (!calendarData.value?.dates.length) return 0

    const todayIndex = calendarData.value.dates.findIndex(
      d => d.date === todayString
    )
    return todayIndex >= 0 ? todayIndex : 0
  })

  // 프로젝트 전체 날짜 배열 (백엔드 데이터 기반)
  const allProjectDates = computed<DateCellInfo[]>(() => {
    if (!calendarData.value?.dates.length) return []

    return calendarData.value.dates.map((calendarDate, index) => {
      // dayIndex: 오늘 기준 오프셋 (오늘=0, 과거=음수, 미래=양수)
      const dayIndexFromToday = index - todayOffset.value
      return convertToDateCellInfo(calendarDate, dayIndexFromToday, todayString)
    })
  })

  // 화면에 표시할 날짜 배열 (뷰포트 기준)
  const visibleDates = computed<DateCellInfo[]>(() => {
    if (!containerWidth.value || allProjectDates.value.length === 0) return []

    const vp = viewport.value
    const startX = -vp.x / vp.zoom
    const endX = startX + containerWidth.value / vp.zoom

    // dayIndex 범위로 필터링 (dayIndex는 오늘 기준이므로 음수 가능)
    const startDayIndex = Math.floor(startX / DAY_WIDTH)
    const endDayIndex = Math.ceil(endX / DAY_WIDTH)

    return allProjectDates.value.filter(
      d => d.dayIndex >= startDayIndex && d.dayIndex <= endDayIndex
    )
  })

  // 프로젝트 그리드 범위 (오늘 기준 X 좌표)
  const projectGridBounds = computed(() => {
    if (allProjectDates.value.length === 0) {
      return { startX: 0, endX: 0, width: 0 }
    }

    const firstDate = allProjectDates.value[0]!
    const lastDate = allProjectDates.value[allProjectDates.value.length - 1]!

    const startX = firstDate.dayIndex * DAY_WIDTH
    const endX = (lastDate.dayIndex + 1) * DAY_WIDTH // +1 to include last day's full width

    return {
      startX,
      endX,
      width: endX - startX
    }
  })

  // 병합 헤더 셀
  const yearCells = computed(() =>
    createMergedCells(visibleDates.value, 'year', d => `${d.year}년`)
  )

  const monthCells = computed(() =>
    createMergedCells(visibleDates.value, 'month', d => `${d.month}월`)
  )

  const weekCells = computed(() =>
    createMergedCells(visibleDates.value, 'weekNumber', d => `W${d.weekNumber}`)
  )

  // 휴일 dayIndex 배열 (전체 프로젝트 기간)
  const holidayIndices = computed(() =>
    allProjectDates.value.filter(d => d.isHoliday).map(d => d.dayIndex)
  )

  // 비활성일 dayIndex 배열 (전체 프로젝트 기간)
  const deactivatedIndices = computed(() =>
    allProjectDates.value.filter(d => d.isDeactivated).map(d => d.dayIndex)
  )

  // 오늘이 프로젝트 기간 내에 있는지 확인
  const todayInProject = computed(() => {
    const today = allProjectDates.value.find(d => d.isToday)
    return today ? today.dayIndex : null
  })

  // ResizeObserver 설정
  const setupResizeObserver = () => {
    if (containerRef.value) {
      resizeObserver = new ResizeObserver(entries => {
        const entry = entries[0]
        if (entry) {
          containerWidth.value = entry.contentRect.width
        }
      })
      resizeObserver.observe(containerRef.value)
    }
  }

  // ResizeObserver 정리
  const cleanupResizeObserver = () => {
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
  }

  return {
    // Refs
    containerRef,
    containerWidth,

    // Computed
    allProjectDates,
    visibleDates,
    projectGridBounds,
    yearCells,
    monthCells,
    weekCells,
    holidayIndices,
    deactivatedIndices,
    todayInProject,

    // Lifecycle helpers
    setupResizeObserver,
    cleanupResizeObserver
  }
}
