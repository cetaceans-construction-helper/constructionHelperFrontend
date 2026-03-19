export interface CreateDailyReportInWebPayload {
  navigateTo: string
  weather: string
  temperature: string
  todayWork: string
  tomorrowWork: string
  materials: string
  equipment: string
  manpower: string
  safetyCheck: string
  encrypted: {
    id: string
    pw: string
  }
}
