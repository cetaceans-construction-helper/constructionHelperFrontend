import type { Ref } from 'vue'
import type { Node } from '@vue-flow/core'
import { GROUP_PADDING } from './nodeConfig'

export const createGroupLogic = (nodes: Ref<Node[]>) => {
  // 그룹 크기 자동 조정
  const updateGroupSize = (groupId: string) => {
    const group = nodes.value.find(n => n.id === groupId)
    if (!group) return

    // 해당 그룹의 자식 노드들 찾기
    const children = nodes.value.filter(n => n.parentNode === groupId)
    if (children.length === 0) return

    const padding = GROUP_PADDING

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    children.forEach(child => {
      const dims = (child as any).dimensions
      const width = dims?.width ?? 0
      const height = dims?.height ?? 0

      minX = Math.min(minX, child.position.x)
      minY = Math.min(minY, child.position.y)
      maxX = Math.max(maxX, child.position.x + width)
      maxY = Math.max(maxY, child.position.y + height)
    })

    // 그룹 포지션을 자식 최소 좌표 - 패딩만큼 이동
    const shiftX = minX - padding
    const shiftY = minY - padding

    group.position = {
      x: group.position.x + shiftX,
      y: group.position.y + shiftY,
    }

    // 자식 노드들은 반대로 이동시켜 상대 위치 유지
    children.forEach(child => {
      child.position = {
        x: child.position.x - shiftX,
        y: child.position.y - shiftY,
      }
    })

    // 그룹 크기 업데이트
    const newWidth = maxX - minX + padding * 2
    const newHeight = maxY - minY + padding * 2

    const style = (group.style ?? {}) as any
    style.width = `${Math.max(newWidth, 200)}px`
    style.height = `${Math.max(newHeight, 150)}px`
    group.style = style
  }

  // 노드 변경 이벤트 핸들러
  const onNodesChange = () => {
    // 모든 그룹의 크기 업데이트
    const groups = nodes.value.filter(n => n.type === 'group')
    groups.forEach(group => updateGroupSize(group.id))
  }

  return { updateGroupSize, onNodesChange }
}

