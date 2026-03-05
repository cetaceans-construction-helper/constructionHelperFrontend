import { materialOrderApi } from '@/features/material/infra/material-order-api'
import type { MaterialOrderRepository } from '@/features/material/use-cases/material-order-repository'

export const materialOrderRepository: MaterialOrderRepository = {
  getMaterialOrderList: () => materialOrderApi.getMaterialOrderList(),
}
