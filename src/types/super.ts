// Company
export interface Company {
  id: string
  companyName: string
  companyAddress: string | null
  registrationNumber: string | null
  phoneNumber: string | null
  bankingAccount: string | null
  displayName: string | null
}

export interface CreateCompanyPayload {
  name: string
  address?: string
  registrationNumber?: string
  phoneNumber?: string
  bankingAccount?: string
  displayName?: string
}

// Project
export interface Project {
  id: string
  projectName: string
  siteAddress: string | null
  startDate: string
  completionDate: string
  weatherNx: number | null
  weatherNy: number | null
}

export interface CreateProjectPayload {
  name: string
  address?: string
  startDate: string
  completionDate: string
  weatherNx?: number
  weatherNy?: number
}

// Roles
export interface SystemRole {
  id: number
  name: string
}

export interface CompanyRole {
  id: number
  name: string
}

// WorkType
export interface WorkType {
  id: number
  name: string
}

// Company-Project Mapping
export interface CompanyToProject {
  id: number
  companyId: string
  companyName: string
  projectId: string
  projectName: string
  roleId: number
  roleName: string
  workTypeId: number | null
  workTypeName: string | null
}

export interface CreateCompanyToProjectPayload {
  companyId: string
  projectId: string
  roleId: number
  workTypeId?: number
}

// User-Project Mapping
export interface UserToProject {
  id: number
  userId: string
  userName: string
  userEmail: string
  projectId: string
  projectName: string
  companyToProjectId: number
  companyName: string
  projectRole: string | null
  systemRoleId: number
  systemRoleName: string
}

export interface CreateUserToProjectPayload {
  userId: string
  projectId: string
  companyToProjectId: number
  projectRole?: string
  systemRoleId: number
}

// Worker
export interface Worker {
  id: number
  workerName: string
  phoneNumber: string
  registrationNumber: string
  confirmed: boolean
  registrationCardUrl: string | null
}

export interface UpdateWorkerPayload {
  name: string
  phoneNumber: string
  registrationNumber: string
  confirmed: boolean
  registrationCardUrl?: string
}
