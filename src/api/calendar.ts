import apiClient from './apiClient'
import type { CalendarResponse } from '@/types/calendar'

export const calendarApi = {
  async getProjectCalendar(projectId: string): Promise<CalendarResponse> {
    const { data } = await apiClient.get<CalendarResponse>(
      `/project/getProjectCalendar/${projectId}`
    )
    return data
  }
}
