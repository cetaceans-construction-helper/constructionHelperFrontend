import { Position, type Node } from '@vue-flow/core'
import type { WorkResponse } from '@/api/work'

// 그룹 크기 계산에 사용하는 기본 여백
export const GROUP_PADDING = 20

// Work → Node 변환 함수
export function workToNode(work: WorkResponse): Node {
  // 휴일 휴무인 작업은 옅은 회색 배경
  const baseStyle: Record<string, string> = {
    width: `${work.width}px`,
    height: `${work.height}px`
  }

  if (!work.isWorkingOnHoliday) {
    baseStyle.backgroundColor = '#f3f4f6' // 옅은 회색 (gray-100)
    baseStyle.borderColor = '#d1d5db' // gray-300
  }

  return {
    id: `work-${work.workId}`,
    type: 'default',
    position: { x: work.positionX, y: work.positionY },
    data: {
      label: work.workName,
      work,
      originalX: work.positionX
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
