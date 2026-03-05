import { ref } from 'vue'
import { materialOrderApi, type MaterialOrderResponse } from '@/api/materialOrder'

export function useMaterialOrder() {
  const orders = ref<MaterialOrderResponse[]>([])
  const isLoading = ref(false)

  async function loadOrders() {
    isLoading.value = true
    try {
      const data = await materialOrderApi.getMaterialOrderList()
      orders.value = data.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
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
