// 백엔드 응답 타입
export interface CalendarDateInfo {
  date: string                    // "2025-01-22"
  dayOfWeek: number               // 0=일, 1=월, ... 6=토
  weekNumber: number              // 프로젝트 기준 주차
  isHoliday: boolean              // 휴일 여부
  holidayName: string | null      // "설날", "대체공휴일(설날)" 등
  isActivated: boolean            // 활성화 여부 (false면 비활성일)
  deactivatedReason: string | null // 비활성일 사유
  weather: string                 // "맑음", "흐림" 등
  minTemperature: number          // 최저 기온
  maxTemperature: number          // 최고 기온
}

export interface CalendarResponse {
  projectStartDate: string
  projectEndDate: string
  dates: CalendarDateInfo[]
}

// 날짜 유형 (프론트엔드 계산용)
export type DateType = 'normal' | 'holiday' | 'deactivated'

// 날짜 유형 판별 함수
export function getDateType(dateInfo: CalendarDateInfo): DateType {
  if (!dateInfo.isActivated) return 'deactivated'
  if (dateInfo.isHoliday) return 'holiday'
  return 'normal'
}
