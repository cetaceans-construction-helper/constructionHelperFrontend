import { ref } from 'vue'
import { materialOrderRepository } from '@/features/material/infra/material-order-repository'
import type { MaterialOrderResponse } from '@/features/material/model/material-order-types'
import { getMaterialOrders } from '@/features/material/use-cases/getMaterialOrders'

export function useMaterialOrder() {
  const orders = ref<MaterialOrderResponse[]>([])
  const isLoading = ref(false)

  async function loadOrders() {
    isLoading.value = true
    try {
      orders.value = await getMaterialOrders(materialOrderRepository)
    } catch (error: unknown) {
      console.error('발주서 목록 로드 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isLoading.value = false
    }
  }

  return { orders, isLoading, loadOrders }
}
