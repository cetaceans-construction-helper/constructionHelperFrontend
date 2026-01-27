import apiClient from './apiClient'
import type { Project } from '@/types/project'

export const projectApi = {
  async getProjects(): Promise<Project[]> {
    const { data } = await apiClient.get<Project[]>('/project/getProjectList')
    return data
  },
}
