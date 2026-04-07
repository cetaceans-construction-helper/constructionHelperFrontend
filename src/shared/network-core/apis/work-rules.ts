import apiClient from '@/shared/network-core/apiClient'
import type { WorkRule } from '@/features/system-admin/model/standard-types'

export const workRulesApi = {
  async getList(params?: {
    stdWorkTypeId?: number
    stdSubWorkTypeId?: number
  }): Promise<WorkRule[]> {
    const { data } = await apiClient.get<WorkRule[]>('/workRules/getWorkRulesList', { params })
    return data
  },

  async getByPeriod(params: {
    startDate: string
    endDate: string
  }): Promise<WorkRule[]> {
    const { data } = await apiClient.get<WorkRule[]>('/workRules/getWorkRulesByPeriod', { params })
    return data
  },
}
