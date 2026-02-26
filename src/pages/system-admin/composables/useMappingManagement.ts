import { ref, watch } from 'vue'
import { superApi } from '@/api/super'
import type {
  CompanyToProject,
  CreateCompanyToProjectPayload,
  UserToProject,
  CreateUserToProjectPayload,
  Company,
  Project,
  CompanyRole,
  SystemRole,
  WorkType,
} from '@/types/super'

export function useMappingManagement() {
  // Lookup data
  const companies = ref<Company[]>([])
  const projects = ref<Project[]>([])
  const companyRoles = ref<CompanyRole[]>([])
  const systemRoles = ref<SystemRole[]>([])
  const workTypes = ref<WorkType[]>([])
  const isLoadingWorkTypes = ref(false)

  // Company-Project Mapping
  const companyToProjectList = ref<CompanyToProject[]>([])
  const isLoadingCompanyToProject = ref(false)
  const isCreatingCompanyToProject = ref(false)
  const isDeletingCompanyToProject = ref(false)
  const companyToProjectFilter = ref<{ projectId?: string; companyId?: string }>({})

  // User-Project Mapping
  const userToProjectList = ref<UserToProject[]>([])
  const isLoadingUserToProject = ref(false)
  const isCreatingUserToProject = ref(false)
  const isDeletingUserToProject = ref(false)
  const userToProjectFilter = ref<{ projectId?: string; userId?: string }>({})

  // Load lookup data
  const loadLookupData = async () => {
    try {
      const [companiesData, projectsData, companyRolesData, systemRolesData] = await Promise.all([
        superApi.getCompanyList(),
        superApi.getProjectList(),
        superApi.getCompanyRoleList(),
        superApi.getSystemRoleList(),
      ])
      companies.value = companiesData
      projects.value = projectsData
      companyRoles.value = companyRolesData
      systemRoles.value = systemRolesData
    } catch (error) {
      console.error('조회 데이터 로드 실패:', error)
    }
  }

  // Load WorkTypes by projectId
  const loadWorkTypes = async (projectId: string) => {
    if (!projectId || projectId === '__all__') {
      workTypes.value = []
      return
    }
    isLoadingWorkTypes.value = true
    try {
      workTypes.value = await superApi.getWorkTypeList(projectId)
    } catch (error) {
      console.error('공종 목록 로드 실패:', error)
      workTypes.value = []
    } finally {
      isLoadingWorkTypes.value = false
    }
  }

  // Company-Project Mapping Actions
  const loadCompanyToProjectList = async () => {
    isLoadingCompanyToProject.value = true
    try {
      const params: { projectId?: string; companyId?: string } = {}
      if (companyToProjectFilter.value.projectId && companyToProjectFilter.value.projectId !== '__all__') {
        params.projectId = companyToProjectFilter.value.projectId
      }
      if (companyToProjectFilter.value.companyId && companyToProjectFilter.value.companyId !== '__all__') {
        params.companyId = companyToProjectFilter.value.companyId
      }
      companyToProjectList.value = await superApi.getCompanyToProjectList(
        Object.keys(params).length > 0 ? params : undefined
      )
    } catch (error) {
      console.error('회사-프로젝트 매핑 조회 실패:', error)
    } finally {
      isLoadingCompanyToProject.value = false
    }
  }

  const createCompanyToProject = async (payload: CreateCompanyToProjectPayload) => {
    if (isCreatingCompanyToProject.value) return false
    isCreatingCompanyToProject.value = true
    try {
      await superApi.createCompanyToProject(payload)
      await loadCompanyToProjectList()
      return true
    } catch (error: unknown) {
      console.error('회사-프로젝트 매핑 생성 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      return false
    } finally {
      isCreatingCompanyToProject.value = false
    }
  }

  // User-Project Mapping Actions
  const loadUserToProjectList = async () => {
    isLoadingUserToProject.value = true
    try {
      const params: { projectId?: string; userId?: string } = {}
      if (userToProjectFilter.value.projectId && userToProjectFilter.value.projectId !== '__all__') {
        params.projectId = userToProjectFilter.value.projectId
      }
      if (userToProjectFilter.value.userId && userToProjectFilter.value.userId !== '__all__') {
        params.userId = userToProjectFilter.value.userId
      }
      userToProjectList.value = await superApi.getUserToProjectList(
        Object.keys(params).length > 0 ? params : undefined
      )
    } catch (error) {
      console.error('사용자-프로젝트 매핑 조회 실패:', error)
    } finally {
      isLoadingUserToProject.value = false
    }
  }

  const createUserToProject = async (payload: CreateUserToProjectPayload) => {
    if (isCreatingUserToProject.value) return false
    isCreatingUserToProject.value = true
    try {
      await superApi.createUserToProject(payload)
      await loadUserToProjectList()
      return true
    } catch (error: unknown) {
      console.error('사용자-프로젝트 매핑 생성 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      return false
    } finally {
      isCreatingUserToProject.value = false
    }
  }

  const deleteCompanyToProject = async (id: number) => {
    if (isDeletingCompanyToProject.value) return
    isDeletingCompanyToProject.value = true
    try {
      await superApi.deleteCompanyToProject(id)
      await loadCompanyToProjectList()
    } catch (error: unknown) {
      console.error('회사-프로젝트 매핑 삭제 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeletingCompanyToProject.value = false
    }
  }

  const deleteUserToProject = async (id: number) => {
    if (isDeletingUserToProject.value) return
    isDeletingUserToProject.value = true
    try {
      await superApi.deleteUserToProject(id)
      await loadUserToProjectList()
    } catch (error: unknown) {
      console.error('사용자-프로젝트 매핑 삭제 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeletingUserToProject.value = false
    }
  }

  // Watch filters and reload
  watch(companyToProjectFilter, () => loadCompanyToProjectList(), { deep: true })
  watch(userToProjectFilter, () => loadUserToProjectList(), { deep: true })

  // Load all
  const loadAll = async () => {
    await loadLookupData()
    await Promise.all([loadCompanyToProjectList(), loadUserToProjectList()])
  }

  return {
    // Lookup data
    companies,
    projects,
    companyRoles,
    systemRoles,
    workTypes,
    isLoadingWorkTypes,
    loadWorkTypes,
    // Company-Project
    companyToProjectList,
    isLoadingCompanyToProject,
    isCreatingCompanyToProject,
    isDeletingCompanyToProject,
    companyToProjectFilter,
    loadCompanyToProjectList,
    createCompanyToProject,
    deleteCompanyToProject,
    // User-Project
    userToProjectList,
    isLoadingUserToProject,
    isCreatingUserToProject,
    isDeletingUserToProject,
    userToProjectFilter,
    loadUserToProjectList,
    createUserToProject,
    deleteUserToProject,
    // Combined
    loadLookupData,
    loadAll,
  }
}
