import { ref } from 'vue'
import { systemAdminApi } from '@/features/system-admin/infra/system-admin-api'
import type { User, Company, UpdateUserPayload } from '@/features/system-admin/model/system-admin-types'

export function useUserManagement() {
  const users = ref<User[]>([])
  const companies = ref<Company[]>([])
  const isLoading = ref(false)
  const isUpdating = ref(false)

  const loadUsers = async () => {
    isLoading.value = true
    try {
      users.value = await systemAdminApi.getUserList()
    } catch (error) {
      console.error('사용자 목록 조회 실패:', error)
    } finally {
      isLoading.value = false
    }
  }

  const loadCompanies = async () => {
    try {
      companies.value = await systemAdminApi.getCompanyList()
    } catch (error) {
      console.error('회사 목록 조회 실패:', error)
    }
  }

  const updateUser = async (id: string, payload: UpdateUserPayload) => {
    if (isUpdating.value) return false
    isUpdating.value = true
    try {
      await systemAdminApi.updateUser(id, payload)
      await loadUsers()
      return true
    } catch (error: unknown) {
      console.error('사용자 수정 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      return false
    } finally {
      isUpdating.value = false
    }
  }

  return {
    users,
    companies,
    isLoading,
    isUpdating,
    loadUsers,
    loadCompanies,
    updateUser,
  }
}
