import apiClient from '@/api/apiClient'
import type { Project } from '@/shared/network-core/contracts/project'

export const projectApi = {
  async getProjects(): Promise<Project[]> {
    const { data } = await apiClient.get<Project[]>('/project/getProjectList')
    return data
  },
}
