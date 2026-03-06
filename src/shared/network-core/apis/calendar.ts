import apiClient from '@/shared/network-core/apiClient'
import type { CalendarResponse, WeatherByDateResponse } from '@/shared/network-core/contracts/calendar'

export const calendarApi = {
  async getProjectCalendar(projectId: string): Promise<CalendarResponse> {
    const { data } = await apiClient.get<CalendarResponse>(
      `/project/getProjectCalendar/${projectId}`
    )
    return data
  },

  async getWeatherByDate(date: string): Promise<WeatherByDateResponse> {
    const { data } = await apiClient.get<WeatherByDateResponse>(
      '/project/getWeatherByDate',
      { params: { date } }
    )
    return data
  }
}
