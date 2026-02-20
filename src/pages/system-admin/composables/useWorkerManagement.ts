import { ref, computed } from 'vue'
import { superApi } from '@/api/super'
import type { Worker, UpdateWorkerPayload } from '@/types/super'

export function useWorkerManagement() {
  const workers = ref<Worker[]>([])
  const isLoading = ref(false)
  const isUpdating = ref(false)
  const filterConfirmed = ref<'all' | 'confirmed' | 'unconfirmed'>('all')

  const filteredWorkers = computed(() => {
    if (filterConfirmed.value === 'all') return workers.value
    if (filterConfirmed.value === 'confirmed') return workers.value.filter((w) => w.confirmed)
    return workers.value.filter((w) => !w.confirmed)
  })

  const loadWorkers = async () => {
    isLoading.value = true
    try {
      // API supports isConfirmed filter, but we filter client-side for simplicity
      workers.value = await superApi.getWorkerList()
    } catch (error) {
      console.error('작업자 목록 조회 실패:', error)
    } finally {
      isLoading.value = false
    }
  }

  const updateWorker = async (workerId: number, payload: UpdateWorkerPayload) => {
    if (isUpdating.value) return false
    isUpdating.value = true
    try {
      await superApi.updateWorker(workerId, payload)
      await loadWorkers()
      return true
    } catch (error: unknown) {
      console.error('작업자 수정 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      return false
    } finally {
      isUpdating.value = false
    }
  }

  const toggleWorkerConfirmed = async (worker: Worker) => {
    return updateWorker(worker.id, {
      name: worker.workerName,
      phoneNumber: worker.phoneNumber,
      registrationNumber: worker.registrationNumber,
      confirmed: !worker.confirmed,
      registrationCardUrl: worker.registrationCardUrl || undefined,
    })
  }

  return {
    workers,
    filteredWorkers,
    isLoading,
    isUpdating,
    filterConfirmed,
    loadWorkers,
    updateWorker,
    toggleWorkerConfirmed,
  }
}
