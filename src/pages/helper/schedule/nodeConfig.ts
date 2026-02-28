import { Position, type Node } from '@vue-flow/core'
import type { WorkResponse } from '@/api/work'
import { CHART_CONFIG } from '@/stores/chartConfigStore'

// 그룹 크기 계산에 사용하는 기본 여백
export const GROUP_PADDING = 20

// 날짜 문자열 → 오늘 기준 일수 차이
export function dateToDayIndex(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

// startDate → 노드 X 좌표
export function computeNodeX(startDate: string): number {
  return dateToDayIndex(startDate) * CHART_CONFIG.pixelPerDay + CHART_CONFIG.nodePaddingX
}

// workLeadTime → 노드 너비 (낙관적 렌더링용)
export function computeNodeWidth(workLeadTime: number): number {
  return workLeadTime * CHART_CONFIG.pixelPerDay - 2 * CHART_CONFIG.nodePaddingX
}

// completionDate - startDate + 1 → 실제 노드 너비
export function computeNodeWidthFromDates(startDate: string, completionDate: string): number {
  const daySpan = dateToDayIndex(completionDate) - dateToDayIndex(startDate) + 1
  return daySpan * CHART_CONFIG.pixelPerDay - 2 * CHART_CONFIG.nodePaddingX
}

// Work → Node 변환 함수
export function workToNode(work: WorkResponse): Node {
  const computedWidth = computeNodeWidthFromDates(work.startDate, work.completionDate)
  const computedHeight = CHART_CONFIG.nodeHeight

  // 휴일 휴무인 작업은 옅은 회색 배경
  const baseStyle: Record<string, string> = {
    width: `${computedWidth}px`,
    height: `${computedHeight}px`,
    overflow: 'visible',
    whiteSpace: 'nowrap'
  }

  if (!work.isWorkingOnHoliday) {
    baseStyle.backgroundColor = '#f3f4f6' // 옅은 회색 (gray-100)
    baseStyle.borderColor = '#d1d5db' // gray-300
  }

  return {
    id: `work-${work.workId}`,
    type: 'default',
    position: { x: computeNodeX(work.startDate), y: work.positionY },
    data: {
      label: work.workName,
      work,
      originalX: computeNodeX(work.startDate),
      computedWidth,
      computedHeight
    },
    style: baseStyle,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    connectable: true,
  }
}

// Work 배열 → Node 배열 변환
export function worksToNodes(works: WorkResponse[]): Node[] {
  return works.map((work) => workToNode(work))
}
