import { ref } from 'vue'
import { systemAdminApi } from '@/features/system-admin/infra/system-admin-api'
import type { Company, CreateCompanyPayload, UpdateCompanyPayload } from '@/features/system-admin/model/system-admin-types'

export function useCompanyManagement() {
  const companies = ref<Company[]>([])
  const isLoading = ref(false)
  const isCreating = ref(false)
  const isUpdating = ref(false)
  const isDeleting = ref(false)

  const loadCompanies = async () => {
    isLoading.value = true
    try {
      companies.value = await systemAdminApi.getCompanyList()
    } catch (error) {
      console.error('회사 목록 조회 실패:', error)
    } finally {
      isLoading.value = false
    }
  }

  const createCompany = async (payload: CreateCompanyPayload) => {
    if (isCreating.value) return
    isCreating.value = true
    try {
      await systemAdminApi.createCompany(payload)
      await loadCompanies()
      return true
    } catch (error: unknown) {
      console.error('회사 생성 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      return false
    } finally {
      isCreating.value = false
    }
  }

  const updateCompany = async (id: string, payload: UpdateCompanyPayload) => {
    if (isUpdating.value) return false
    isUpdating.value = true
    try {
      await systemAdminApi.updateCompany(id, payload)
      await loadCompanies()
      return true
    } catch (error: unknown) {
      console.error('회사 수정 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      return false
    } finally {
      isUpdating.value = false
    }
  }

  const deleteCompany = async (id: string) => {
    if (isDeleting.value) return
    isDeleting.value = true
    try {
      await systemAdminApi.deleteCompany(id)
      await loadCompanies()
    } catch (error: unknown) {
      console.error('회사 삭제 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeleting.value = false
    }
  }

  return {
    companies,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    loadCompanies,
    createCompany,
    updateCompany,
    deleteCompany,
  }
}
