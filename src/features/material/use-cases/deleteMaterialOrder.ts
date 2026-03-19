import type { MaterialOrderRepository } from '@/features/material/use-cases/material-order-repository'

export const deleteMaterialOrder = async (
  repository: MaterialOrderRepository,
  orderId: number,
): Promise<void> => {
  await repository.deleteMaterialOrder(orderId)
}
