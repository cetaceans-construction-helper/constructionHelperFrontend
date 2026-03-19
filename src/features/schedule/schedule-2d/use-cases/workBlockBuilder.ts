import { Position, type Node } from '@vue-flow/core'
import type { WorkResponse } from '@/shared/network-core/apis/work'
import type { WeeklyRowLayout } from './rowLayout'
import { computeNodeX, dateToDayIndex } from './nodeConfig'
import { CHART_CONFIG } from '@/features/schedule/schedule-2d/view-model/chartConfigStore'

export interface WorkBlock {
  key: string              // "workType::zone::floor"
  workType: string
  zoneName: string
  floorName: string
  startDate: string        // min of matching works
  completionDate: string   // max of matching works
  label: string            // "zone floor worktype"
  rowIndex: number
}

export function buildWorkBlocks(works: WorkResponse[], weeklyRowLayout: WeeklyRowLayout): WorkBlock[] {
  // Group works by (workType, zoneName, floorName) cross-product
  const groups = new Map<string, { startDates: string[]; completionDates: string[]; workType: string; zoneName: string; floorName: string }>()

  for (const work of works) {
    const workType = work.workType || '미분류'
    const zones = work.zoneNames?.length ? work.zoneNames : ['']
    const floors = work.floorNames?.length ? work.floorNames : ['']

    for (const zone of zones) {
      for (const floor of floors) {
        const key = `${workType}::${zone}::${floor}`
        if (!groups.has(key)) {
          groups.set(key, { startDates: [], completionDates: [], workType, zoneName: zone, floorName: floor })
        }
        const g = groups.get(key)!
        g.startDates.push(work.startDate)
        g.completionDates.push(work.completionDate)
      }
    }
  }

  const blocks: WorkBlock[] = []

  for (const [key, g] of groups) {
    const rowIndex = weeklyRowLayout.rowMap.get(key)
    if (rowIndex === undefined) continue

    // Find min startDate and max completionDate
    g.startDates.sort()
    g.completionDates.sort()
    const startDate = g.startDates[0]!
    const completionDate = g.completionDates[g.completionDates.length - 1]!

    const parts = [g.zoneName, g.floorName, g.workType].filter(Boolean)
    const label = parts.join(' ')

    blocks.push({
      key,
      workType: g.workType,
      zoneName: g.zoneName,
      floorName: g.floorName,
      startDate,
      completionDate,
      label,
      rowIndex,
    })
  }

  return blocks
}

export function workBlockToNode(
  block: WorkBlock,
  rowUnit: number,
  nodeHeight: number,
): Node {
  const paddingY = (rowUnit - nodeHeight) / 2
  const startDayIndex = dateToDayIndex(block.startDate)
  const endDayIndex = dateToDayIndex(block.completionDate)
  const daySpan = endDayIndex - startDayIndex + 1
  const computedWidth = daySpan * CHART_CONFIG.pixelPerDay - 2 * CHART_CONFIG.nodePaddingX
  const x = computeNodeX(block.startDate)
  const y = block.rowIndex * rowUnit + paddingY

  return {
    id: `workblock-${block.key}`,
    type: 'workblock',
    position: { x, y },
    data: {
      label: block.label,
      computedWidth,
      computedHeight: nodeHeight,
    },
    style: {
      width: `${computedWidth}px`,
      height: `${nodeHeight}px`,
      overflow: 'visible',
      whiteSpace: 'nowrap',
    },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    draggable: false,
    connectable: false,
  }
}
