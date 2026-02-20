import { ref } from 'vue'
import { superApi } from '@/api/super'
import type { Company, CreateCompanyPayload } from '@/types/super'

export function useCompanyManagement() {
  const companies = ref<Company[]>([])
  const isLoading = ref(false)
  const isCreating = ref(false)

  const loadCompanies = async () => {
    isLoading.value = true
    try {
      companies.value = await superApi.getCompanyList()
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
      await superApi.createCompany(payload)
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

  return {
    companies,
    isLoading,
    isCreating,
    loadCompanies,
    createCompany,
  }
}
