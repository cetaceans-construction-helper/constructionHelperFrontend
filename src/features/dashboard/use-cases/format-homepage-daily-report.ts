import type { DeliveryQuantityByDate } from '@/features/material/public'
import type {
  ActualWorkGroup,
  AttendanceGroup,
  EquipmentGroup,
} from '@/features/dashboard/model/dashboard-types'

export function formatWorksByType(worksByType: Map<number, ActualWorkGroup>): string {
  const lines: string[] = []
  for (const [, group] of worksByType) {
    lines.push(`■ ${group.workTypeName}`)
    for (const aw of group.items) {
      lines.push(`- ${aw.workName}`)
    }
    lines.push('')
  }
  return lines.join('\n').trim()
}

export function formatMaterials(deliveryByWorkType: Map<string, DeliveryQuantityByDate[]>): string {
  const lines: string[] = []
  for (const [workType, items] of deliveryByWorkType) {
    lines.push(`■ ${workType}`)
    for (const item of items) {
      lines.push(`- ${item.materialTypeName}(${item.materialSpecName}): ${item.totalQuantity} ${item.unit}`)
    }
    lines.push('')
  }
  return lines.join('\n').trim()
}

export function formatEquipment(equipmentByGroup: EquipmentGroup[]): string {
  const lines: string[] = []
  for (const group of equipmentByGroup) {
    lines.push(`■ ${group.companyDisplayName}: ${group.totalCount}대`)
    for (const item of group.items) {
      lines.push(`- ${item.equipmentTypeName}(${item.equipmentSpecName}): ${item.count}대`)
    }
    lines.push('')
  }
  const total = equipmentByGroup.reduce((sum, g) => sum + g.totalCount, 0)
  lines.push(`■ 총 장비 : ${total}대`)
  return lines.join('\n').trim()
}

export function formatManpower(attendanceByGroup: AttendanceGroup[]): string {
  const lines: string[] = []
  for (const group of attendanceByGroup) {
    lines.push(`■ ${group.workTypeName}(${group.companyDisplayName}): ${group.totalCount}명`)
    for (const item of group.items) {
      lines.push(`- ${item.laborTypeName}: ${item.count}명`)
    }
    lines.push('')
  }
  const total = attendanceByGroup.reduce((sum, g) => sum + g.totalCount, 0)
  lines.push(`■ 총 출역인원 : ${total}명`)
  return lines.join('\n').trim()
}
