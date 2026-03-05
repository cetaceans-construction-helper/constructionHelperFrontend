import { ref } from 'vue'
import { superApi } from '@/api/super'
import type { SystemRole, CompanyRole } from '@/types/super'

export function useRoleManagement() {
  // System Roles
  const systemRoles = ref<SystemRole[]>([])
  const isLoadingSystemRoles = ref(false)
  const isCreatingSystemRole = ref(false)
  const newSystemRoleName = ref('')

  // Company Roles
  const companyRoles = ref<CompanyRole[]>([])
  const isLoadingCompanyRoles = ref(false)
  const isCreatingCompanyRole = ref(false)
  const newCompanyRoleName = ref('')

  // System Role Actions
  const loadSystemRoles = async () => {
    isLoadingSystemRoles.value = true
    try {
      systemRoles.value = await superApi.getSystemRoleList()
    } catch (error) {
      console.error('시스템 역할 목록 조회 실패:', error)
    } finally {
      isLoadingSystemRoles.value = false
    }
  }

  const createSystemRole = async () => {
    if (isCreatingSystemRole.value || !newSystemRoleName.value.trim()) return
    isCreatingSystemRole.value = true
    try {
      await superApi.createSystemRole(newSystemRoleName.value.trim())
      newSystemRoleName.value = ''
      await loadSystemRoles()
    } catch (error: unknown) {
      console.error('시스템 역할 생성 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreatingSystemRole.value = false
    }
  }

  // Company Role Actions
  const loadCompanyRoles = async () => {
    isLoadingCompanyRoles.value = true
    try {
      companyRoles.value = await superApi.getCompanyRoleList()
    } catch (error) {
      console.error('회사 역할 목록 조회 실패:', error)
    } finally {
      isLoadingCompanyRoles.value = false
    }
  }

  const createCompanyRole = async () => {
    if (isCreatingCompanyRole.value || !newCompanyRoleName.value.trim()) return
    isCreatingCompanyRole.value = true
    try {
      await superApi.createCompanyRole(newCompanyRoleName.value.trim())
      newCompanyRoleName.value = ''
      await loadCompanyRoles()
    } catch (error: unknown) {
      console.error('회사 역할 생성 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreatingCompanyRole.value = false
    }
  }

  // Load all roles
  const loadAllRoles = async () => {
    await Promise.all([loadSystemRoles(), loadCompanyRoles()])
  }

  return {
    // System Roles
    systemRoles,
    isLoadingSystemRoles,
    isCreatingSystemRole,
    newSystemRoleName,
    loadSystemRoles,
    createSystemRole,
    // Company Roles
    companyRoles,
    isLoadingCompanyRoles,
    isCreatingCompanyRole,
    newCompanyRoleName,
    loadCompanyRoles,
    createCompanyRole,
    // Combined
    loadAllRoles,
  }
}
