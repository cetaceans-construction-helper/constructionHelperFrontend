import apiClient from '@/api/apiClient'
import type { CalendarResponse } from '@/shared/network-core/contracts/calendar'

export const calendarApi = {
  async getProjectCalendar(projectId: string): Promise<CalendarResponse> {
    const { data } = await apiClient.get<CalendarResponse>(
      `/project/getProjectCalendar/${projectId}`
    )
    return data
  }
}
