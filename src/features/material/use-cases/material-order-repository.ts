import type { MaterialOrderResponse } from '@/features/material/model/material-order-types'

export interface MaterialOrderRepository {
  getMaterialOrderList(): Promise<MaterialOrderResponse[]>
}
