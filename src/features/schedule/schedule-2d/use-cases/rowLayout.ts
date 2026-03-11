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

      if (subSections.length > 0) {
        sections.push({
          workType: wt.name,
          subSections,
          totalRows: currentRow - sectionStartRow,
          startRowIndex: sectionStartRow,
        })
      }
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
