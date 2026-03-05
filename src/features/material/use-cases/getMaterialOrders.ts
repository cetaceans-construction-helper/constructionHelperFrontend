import { sortMaterialOrdersByCreatedAtDesc } from '@/features/material/model/material-order-rules'
import type { MaterialOrderResponse } from '@/features/material/model/material-order-types'
import type { MaterialOrderRepository } from '@/features/material/use-cases/material-order-repository'

export const getMaterialOrders = async (
  repository: MaterialOrderRepository,
): Promise<MaterialOrderResponse[]> => {
  const orders = await repository.getMaterialOrderList()
  return sortMaterialOrdersByCreatedAtDesc(orders)
}
