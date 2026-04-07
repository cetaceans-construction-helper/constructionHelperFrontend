import { ref } from 'vue'
import { standardApi } from '@/shared/network-core/apis/standard'
import type { IdNameResponse } from '@/shared/network-core/apis/reference'

export function useStandardLabor() {
  const laborTypes = ref<IdNameResponse[]>([])

  const newLaborTypeName = ref('')

  const isCreating = ref(false)
  const isDeleting = ref(false)

  const loadLaborTypes = async () => {
    try {
      laborTypes.value = await standardApi.laborType.getList()
    } catch (error) {
      console.error('StdLaborType 목록 로드 실패:', error)
    }
  }

  const addLaborType = async () => {
    if (isCreating.value) return
    const name = newLaborTypeName.value.trim()
    if (!name) return

    isCreating.value = true
    try {
      await standardApi.laborType.create({ name })
      newLaborTypeName.value = ''
      await loadLaborTypes()
    } catch (error: unknown) {
      console.error('StdLaborType 추가 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreating.value = false
    }
  }

  const deleteLaborType = async (id: number) => {
    if (isDeleting.value) return
    isDeleting.value = true
    try {
      await standardApi.laborType.delete(id)
      laborTypes.value = laborTypes.value.filter((lt) => lt.id !== id)
    } catch (error: unknown) {
      console.error('StdLaborType 삭제 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeleting.value = false
    }
  }

  const updateLaborTypeName = async (id: number, name: string) => {
    try {
      await standardApi.laborType.update(id, { name })
      const item = laborTypes.value.find((lt) => lt.id === id)
      if (item) item.name = name
    } catch (error: unknown) {
      console.error('StdLaborType 수정 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      await loadLaborTypes()
    }
  }

  return {
    laborTypes,
    newLaborTypeName,
    isCreating,
    isDeleting,
    loadLaborTypes,
    addLaborType,
    deleteLaborType,
    updateLaborTypeName,
  }
}
