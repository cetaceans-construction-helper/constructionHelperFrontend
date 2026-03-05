import apiClient from '@/api/apiClient'

export interface UpdateWorkDateRequest {
  dates: string[]
  isHoliday?: boolean
  isActivated?: boolean
  deactivatedReason?: string
}

export const projectCalendarApi = {
  async updateWorkDate(body: UpdateWorkDateRequest): Promise<void> {
    await apiClient.put('/project/updateWorkDate', body)
  },
}
