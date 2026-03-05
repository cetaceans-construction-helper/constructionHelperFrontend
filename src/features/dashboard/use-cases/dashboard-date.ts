export interface DashboardDateContext {
  today: Date
  tomorrow: Date
  todayString: string
  tomorrowString: string
  todayDayName: string
}

const dayNames = ['일', '월', '화', '수', '목', '금', '토']

export const formatLocalDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

export const getDashboardDateContext = (): DashboardDateContext => {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const todayDayName = dayNames[today.getDay()] ?? '알수없음'

  return {
    today,
    tomorrow,
    todayString: formatLocalDate(today),
    tomorrowString: formatLocalDate(tomorrow),
    todayDayName,
  }
}
