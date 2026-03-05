import apiClient from '@/api/apiClient'
import type {
  Company,
  CreateCompanyPayload,
  UpdateCompanyPayload,
  Project,
  CreateProjectPayload,
  UpdateProjectPayload,
  SystemRole,
  CompanyRole,
  WorkType,
  CompanyToProject,
  CreateCompanyToProjectPayload,
  UpdateCompanyToProjectPayload,
  UserToProject,
  CreateUserToProjectPayload,
  UpdateUserToProjectPayload,
  User,
  Worker,
  UpdateWorkerPayload,
} from '@/features/system-admin/model/system-admin-types'

export const systemAdminApi = {
  // Company
  async getCompanyList(): Promise<Company[]> {
    const { data } = await apiClient.get<Company[]>('/super/getCompanyList')
    return data
  },

  async createCompany(payload: CreateCompanyPayload): Promise<Company> {
    const { data } = await apiClient.post<Company>('/super/createCompany', payload)
    return data
  },

  async updateCompany(id: string, payload: UpdateCompanyPayload): Promise<Company> {
    const { data } = await apiClient.put<Company>(`/super/updateCompany/${id}`, payload)
    return data
  },

  async deleteCompany(id: string): Promise<void> {
    await apiClient.delete(`/super/deleteCompany/${id}`)
  },

  // Project
  async getProjectList(): Promise<Project[]> {
    const { data } = await apiClient.get<Project[]>('/super/getProjectList')
    return data
  },

  async createProject(payload: CreateProjectPayload): Promise<Project> {
    const { data } = await apiClient.post<Project>('/super/createProject', payload)
    return data
  },

  async updateProject(id: string, payload: UpdateProjectPayload): Promise<Project> {
    const { data } = await apiClient.put<Project>(`/super/updateProject/${id}`, payload)
    return data
  },

  async deleteProject(id: string): Promise<void> {
    await apiClient.delete(`/super/deleteProject/${id}`)
  },

  // User
  async getUserList(): Promise<User[]> {
    const { data } = await apiClient.get<User[]>('/super/getUserList')
    return data
  },

  // System Role
  async getSystemRoleList(): Promise<SystemRole[]> {
    const { data } = await apiClient.get<SystemRole[]>('/super/getSystemRoleList')
    return data
  },

  async createSystemRole(name: string): Promise<SystemRole> {
    const { data } = await apiClient.post<SystemRole>('/super/createSystemRole', { name })
    return data
  },

  // Company Role
  async getCompanyRoleList(): Promise<CompanyRole[]> {
    const { data } = await apiClient.get<CompanyRole[]>('/super/getCompanyRoleList')
    return data
  },

  async createCompanyRole(name: string): Promise<CompanyRole> {
    const { data } = await apiClient.post<CompanyRole>('/super/createCompanyRole', { name })
    return data
  },

  // WorkType
  async getWorkTypeList(projectId: string): Promise<WorkType[]> {
    const { data } = await apiClient.get<WorkType[]>('/super/getWorkTypeList', {
      params: { projectId },
    })
    return data
  },

  // Company-Project Mapping
  async getCompanyToProjectList(params?: {
    projectId?: string
    companyId?: string
  }): Promise<CompanyToProject[]> {
    const { data } = await apiClient.get<CompanyToProject[]>('/super/getCompanyToProjectList', {
      params,
    })
    return data
  },

  async createCompanyToProject(payload: CreateCompanyToProjectPayload): Promise<CompanyToProject> {
    const { data } = await apiClient.post<CompanyToProject>(
      '/super/createCompanyToProject',
      payload
    )
    return data
  },

  async updateCompanyToProject(id: number, payload: UpdateCompanyToProjectPayload): Promise<CompanyToProject> {
    const { data } = await apiClient.put<CompanyToProject>(
      `/super/updateCompanyToProject/${id}`,
      payload
    )
    return data
  },

  // User-Project Mapping
  async getUserToProjectList(params?: {
    projectId?: string
    userId?: string
  }): Promise<UserToProject[]> {
    const { data } = await apiClient.get<UserToProject[]>('/super/getUserToProjectList', {
      params,
    })
    return data
  },

  async createUserToProject(payload: CreateUserToProjectPayload): Promise<UserToProject> {
    const { data } = await apiClient.post<UserToProject>('/super/createUserToProject', payload)
    return data
  },

  async updateUserToProject(id: number, payload: UpdateUserToProjectPayload): Promise<UserToProject> {
    const { data } = await apiClient.put<UserToProject>(
      `/super/updateUserToProject/${id}`,
      payload
    )
    return data
  },

  // Worker
  async getWorkerList(params?: { isConfirmed?: boolean }): Promise<Worker[]> {
    const { data } = await apiClient.get<Worker[]>('/super/getWorkerList', { params })
    return data
  },

  async updateWorker(workerId: number, payload: UpdateWorkerPayload): Promise<Worker> {
    const { data } = await apiClient.put<Worker>(`/super/updateWorker/${workerId}`, payload)
    return data
  },

  // Company-Project 삭제
  async deleteCompanyToProject(id: number): Promise<void> {
    await apiClient.delete(`/companyProject/deleteCompanyToProject/${id}`)
  },

  // User-Project 삭제
  async deleteUserToProject(id: number): Promise<void> {
    await apiClient.delete(`/userProject/deleteUserToProject/${id}`)
  },
}
