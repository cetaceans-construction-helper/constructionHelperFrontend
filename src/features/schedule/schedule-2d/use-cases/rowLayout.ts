import type { WorkResponse } from '@/shared/network-core/apis/work'
import { dateToDayIndex } from './nodeConfig'

export const LEFT_HEADER_WIDTH = 200

export interface RefWorkType {
  name: string
  subWorkTypes: { id: number; name: string }[]
}

export interface SubWorkTypeSection {
  subWorkTypeId: number
  subWorkType: string
  subRowCount: number
  startRowIndex: number
}

export interface WorkTypeSection {
  workType: string
  subSections: SubWorkTypeSection[]
  totalRows: number
  startRowIndex: number
}

export interface RowLayout {
  sections: WorkTypeSection[]
  totalRows: number
  workRowMap: Map<number, number>
}

interface PaddedWork {
  workId: number
  subWorkTypeId: number
  subWorkType: string
  workType: string
  paddedStart: number
  paddedEnd: number
}

function toPaddedWork(work: WorkResponse): PaddedWork {
  return {
    workId: work.workId,
    subWorkTypeId: work.subWorkTypeId,
    subWorkType: work.subWorkType || '미분류',
    workType: work.workType || '미분류',
    paddedStart: dateToDayIndex(work.startDate) - 1,
    paddedEnd: dateToDayIndex(work.completionDate) + 1,
  }
}

function overlaps(a: PaddedWork, endB: number): boolean {
  return a.paddedStart <= endB
}

function binPackSubWorks(
  worksInSub: PaddedWork[],
  startRow: number,
  workRowMap: Map<number, number>,
): number {
  worksInSub.sort((a, b) => a.paddedStart - b.paddedStart)
  const subRows: { end: number }[] = []
  for (const pw of worksInSub) {
    let placed = false
    for (let i = 0; i < subRows.length; i++) {
      if (!overlaps(pw, subRows[i]!.end)) {
        workRowMap.set(pw.workId, startRow + i)
        subRows[i]!.end = pw.paddedEnd
        placed = true
        break
      }
    }
    if (!placed) {
      workRowMap.set(pw.workId, startRow + subRows.length)
      subRows.push({ end: pw.paddedEnd })
    }
  }
  return Math.max(1, subRows.length)
}

// === 주단위화면 (Weekly View) Types & Logic ===

export interface WeeklyZoneFloorSection {
  zoneName: string
  floorName: string
  startRowIndex: number
}

export interface WeeklyWorkTypeSection {
  workType: string
  zoneFloorSections: WeeklyZoneFloorSection[]
  totalRows: number
  startRowIndex: number
}

export interface WeeklyRowLayout {
  sections: WeeklyWorkTypeSection[]
  totalRows: number
  // key: "workType::zoneName::floorName" → row index
  rowMap: Map<string, number>
}

export function computeWeeklyRowLayout(works: WorkResponse[], refTree?: RefWorkType[]): WeeklyRowLayout {
  // Collect all (workType, zoneName, floorName) combinations from works
  const combos = new Set<string>()
  for (const work of works) {
    const workType = work.workType || '미분류'
    const zones = work.zoneNames?.length ? work.zoneNames : ['']
    const floors = work.floorNames?.length ? work.floorNames : ['']
    for (const zone of zones) {
      for (const floor of floors) {
        combos.add(`${workType}::${zone}::${floor}`)
      }
    }
  }

  // Group by workType
  const byWorkType = new Map<string, { zoneName: string; floorName: string }[]>()
  for (const key of combos) {
    const [workType, zoneName, floorName] = key.split('::') as [string, string, string]
    // 존/층 둘 다 없는 조합은 주단위화면에서 제외
    if (!zoneName && !floorName) continue
    if (!byWorkType.has(workType)) byWorkType.set(workType, [])
    byWorkType.get(workType)!.push({ zoneName, floorName })
  }

  // Sort workTypes: use refTree order if available, then alphabetical for remainder
  let sortedWorkTypes: string[]
  if (refTree && refTree.length > 0) {
    const refOrder = refTree.map((wt) => wt.name)
    const refSet = new Set(refOrder)
    const extra = [...byWorkType.keys()].filter((k) => !refSet.has(k)).sort()
    sortedWorkTypes = [...refOrder.filter((k) => byWorkType.has(k)), ...extra]
  } else {
    sortedWorkTypes = [...byWorkType.keys()].sort()
  }

  const sections: WeeklyWorkTypeSection[] = []
  const rowMap = new Map<string, number>()
  let currentRow = 0

  for (const workType of sortedWorkTypes) {
    const items = byWorkType.get(workType)!
    // Sort: zone → floor
    items.sort((a, b) => a.zoneName.localeCompare(b.zoneName) || a.floorName.localeCompare(b.floorName))

    const sectionStartRow = currentRow
    const zoneFloorSections: WeeklyZoneFloorSection[] = []

    for (const { zoneName, floorName } of items) {
      zoneFloorSections.push({ zoneName, floorName, startRowIndex: currentRow })
      rowMap.set(`${workType}::${zoneName}::${floorName}`, currentRow)
      currentRow++
    }

    sections.push({
      workType,
      zoneFloorSections,
      totalRows: currentRow - sectionStartRow,
      startRowIndex: sectionStartRow,
    })
  }

  return { sections, totalRows: currentRow, rowMap }
}

export function computeRowLayout(works: WorkResponse[], refTree?: RefWorkType[]): RowLayout {
  const paddedWorks = works.map(toPaddedWork)
  const workRowMap = new Map<number, number>()

  // Index works by subWorkTypeId
  const bySubId = new Map<number, PaddedWork[]>()
  for (const pw of paddedWorks) {
    if (!bySubId.has(pw.subWorkTypeId)) bySubId.set(pw.subWorkTypeId, [])
    bySubId.get(pw.subWorkTypeId)!.push(pw)
  }

  if (refTree && refTree.length > 0) {
    // Reference tree order
    const sections: WorkTypeSection[] = []
    let currentRow = 0
    const placedSubIds = new Set<number>()

    for (const wt of refTree) {
      const subSections: SubWorkTypeSection[] = []
      const sectionStartRow = currentRow

      if (wt.subWorkTypes.length > 0) {
        for (const sub of wt.subWorkTypes) {
          const worksInSub = bySubId.get(sub.id) || []
          const subRowCount = binPackSubWorks(worksInSub, currentRow, workRowMap)
          subSections.push({
            subWorkTypeId: sub.id,
            subWorkType: sub.name,
            subRowCount,
            startRowIndex: currentRow,
          })
          currentRow += subRowCount
          placedSubIds.add(sub.id)
        }
      } else {
        // subWorkType이 없는 workType: 빈 행 1개 생성
        subSections.push({
          subWorkTypeId: 0,
          subWorkType: '',
          subRowCount: 1,
          startRowIndex: currentRow,
        })
        currentRow += 1
      }

      sections.push({
        workType: wt.name,
        subSections,
        totalRows: currentRow - sectionStartRow,
        startRowIndex: sectionStartRow,
      })
    }

    // Fallback: works with subWorkTypeId not in refTree
    const unplaced: PaddedWork[] = []
    for (const [subId, pws] of bySubId) {
      if (!placedSubIds.has(subId)) unplaced.push(...pws)
    }
    if (unplaced.length > 0) {
      const sectionStartRow = currentRow
      const subRowCount = binPackSubWorks(unplaced, currentRow, workRowMap)
      sections.push({
        workType: '미분류',
        subSections: [{
          subWorkTypeId: 0,
          subWorkType: '미분류',
          subRowCount,
          startRowIndex: currentRow,
        }],
        totalRows: subRowCount,
        startRowIndex: sectionStartRow,
      })
      currentRow += subRowCount
    }

    return { sections, totalRows: currentRow, workRowMap }
  }

  // Fallback: alphabetical sort (original behavior)
  if (works.length === 0) {
    return { sections: [], totalRows: 0, workRowMap }
  }

  const byWorkType = new Map<string, Map<string, PaddedWork[]>>()
  for (const pw of paddedWorks) {
    if (!byWorkType.has(pw.workType)) byWorkType.set(pw.workType, new Map())
    const subMap = byWorkType.get(pw.workType)!
    const subKey = `${pw.subWorkTypeId}::${pw.subWorkType}`
    if (!subMap.has(subKey)) subMap.set(subKey, [])
    subMap.get(subKey)!.push(pw)
  }

  const sortedWorkTypes = [...byWorkType.keys()].sort()
  const sections: WorkTypeSection[] = []
  let currentRow = 0

  for (const workType of sortedWorkTypes) {
    const subMap = byWorkType.get(workType)!
    const sortedSubKeys = [...subMap.keys()].sort((a, b) => {
      const nameA = a.split('::')[1]!
      const nameB = b.split('::')[1]!
      return nameA.localeCompare(nameB)
    })

    const subSections: SubWorkTypeSection[] = []
    const sectionStartRow = currentRow

    for (const subKey of sortedSubKeys) {
      const worksInSub = subMap.get(subKey)!
      const [idStr, subWorkType] = subKey.split('::') as [string, string]
      const subWorkTypeId = Number(idStr)
      const subRowCount = binPackSubWorks(worksInSub, currentRow, workRowMap)
      subSections.push({
        subWorkTypeId,
        subWorkType,
        subRowCount,
        startRowIndex: currentRow,
      })
      currentRow += subRowCount
    }

    sections.push({
      workType,
      subSections,
      totalRows: currentRow - sectionStartRow,
      startRowIndex: sectionStartRow,
    })
  }

  return { sections, totalRows: currentRow, workRowMap }
}
