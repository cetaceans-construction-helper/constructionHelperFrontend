import { ref, computed, type Ref } from 'vue'
import type { Node, Edge } from '@vue-flow/core'
import { workPathApi, type PathResponse, type PathEdge, type UpdateWorkPathPayload } from '@/shared/network-core/apis/workPath'
import type { WorkResponse, MutationResponse } from '@/shared/network-core/apis/work'
import { analyticsClient } from '@/shared/analytics/analyticsClient'

// 엣지 배열 → 순서 있는 체인 배열
function edgesToChain(edges: PathEdge[]): number[] {
  if (edges.length === 0) return []

  const sources = new Set(edges.map(e => e.sourceWorkId))
  const targets = new Set(edges.map(e => e.targetWorkId))

  // 시작 노드: source이면서 target이 아닌 노드
  let startId: number | null = null
  for (const s of sources) {
    if (!targets.has(s)) {
      startId = s
      break
    }
  }
  if (!startId) startId = edges[0]!.sourceWorkId

  // 체인 구성
  const edgeMap = new Map(edges.map(e => [e.sourceWorkId, e.targetWorkId]))
  const chain = [startId]
  let current = startId
  while (edgeMap.has(current)) {
    const next = edgeMap.get(current)!
    if (chain.includes(next)) break
    chain.push(next)
    current = next
  }

  return chain
}

// 순서 있는 체인 배열 → 엣지 배열
function chainToEdges(chain: number[]): PathEdge[] {
  const edges: PathEdge[] = []
  for (let i = 0; i < chain.length - 1; i++) {
    edges.push({ sourceWorkId: chain[i]!, targetWorkId: chain[i + 1]! })
  }
  return edges
}

export function usePathEditor(
  nodes: Ref<Node[]>,
  edges: Ref<Edge[]>,
  paths: Ref<PathResponse[]>,
  onPathUpdated: (mutation: MutationResponse) => void,
  getEdgeHandles?: (sourceWorkId: number, targetWorkId: number) => { sourceHandle: string; targetHandle: string }
) {
  // 패스 선택 및 수정 상태
  const selectedPathId = ref<number | null>(null)
  const editingPathEdges = ref<PathEdge[]>([])
  const isUpdatingPath = ref(false)

  const isPathEditMode = computed(() => selectedPathId.value !== null)

  // 선택된 패스의 색상
  const selectedPathColor = computed(() => {
    if (!selectedPathId.value) return null
    const path = paths.value.find(p => p.workPathId === selectedPathId.value)
    return path?.workPathColor || '#3b82f6'
  })

  // 연결 순서대로 정렬된 노드 배열
  const orderedChainNodes = computed(() => {
    if (editingPathEdges.value.length === 0) return []

    // 모든 source와 target workId 수집
    const sources = new Set(editingPathEdges.value.map(e => e.sourceWorkId))
    const targets = new Set(editingPathEdges.value.map(e => e.targetWorkId))

    // 시작 노드 찾기: source이면서 target이 아닌 노드
    let startNodeId: number | null = null
    for (const sourceId of sources) {
      if (!targets.has(sourceId)) {
        startNodeId = sourceId
        break
      }
    }

    // 시작 노드가 없으면 순환 체인 (첫 번째 edge의 source 사용)
    if (startNodeId === null && editingPathEdges.value.length > 0) {
      startNodeId = editingPathEdges.value[0]!.sourceWorkId
    }

    if (startNodeId === null) return []

    // edge map 생성: sourceWorkId → targetWorkId
    const edgeMap = new Map<number, number>()
    editingPathEdges.value.forEach(e => {
      edgeMap.set(e.sourceWorkId, e.targetWorkId)
    })

    // 체인 순서대로 노드 수집
    const chain: number[] = [startNodeId]
    let currentId = startNodeId
    const visited = new Set<number>([startNodeId])

    while (edgeMap.has(currentId)) {
      const nextId = edgeMap.get(currentId)!
      if (visited.has(nextId)) break  // 순환 방지
      chain.push(nextId)
      visited.add(nextId)
      currentId = nextId
    }

    // workId → workName 매핑
    return chain.map(workId => {
      const node = nodes.value.find(n => n.id === `work-${workId}`)
      return {
        workId,
        workName: (node?.data.work as WorkResponse)?.workName || `Work ${workId}`
      }
    })
  })

  // 편집 중인 패스에 포함된 workId Set
  const pathNodeIds = computed(() => {
    const ids = new Set<number>()
    editingPathEdges.value.forEach(e => {
      ids.add(e.sourceWorkId)
      ids.add(e.targetWorkId)
    })
    return ids
  })

  // 삭제 버튼을 표시할 노드들의 위치 정보
  const deleteButtonNodes = computed(() => {
    if (!isPathEditMode.value) return []

    return Array.from(pathNodeIds.value).map(workId => {
      const node = nodes.value.find(n => n.id === `work-${workId}`)
      if (!node) return null

      return {
        workId,
        // 노드 우측 상단 위치
        x: node.position.x + (node.data.computedWidth as number),
        y: node.position.y
      }
    }).filter((item): item is { workId: number; x: number; y: number } => item !== null)
  })

  // 패스 편집 모드용 스타일링된 엣지
  const styledEdges = computed(() => {
    if (!selectedPathId.value) {
      // 미선택: 기본 색상 + transform offset 적용 (X, Y 모두)
      return edges.value.map(e => {
        const offset = e.data?.offset || 0
        const isFollowing = e.data?.isFollowing !== false
        return {
          ...e,
          style: {
            stroke: (e.style as { stroke?: string })?.stroke,
            strokeDasharray: isFollowing ? undefined : '12 8',
            transform: `translate(${offset}px, ${offset}px)`
          }
        }
      })
    }

    const selectedPath = paths.value.find(p => p.workPathId === selectedPathId.value)
    const pathColor = selectedPath?.workPathColor || '#3b82f6'

    // 다른 패스의 edge들 (회색으로 표시, offset 유지)
    const otherEdges = edges.value
      .filter(e => e.data?.pathId !== selectedPathId.value)
      .map(e => {
        const offset = e.data?.offset || 0
        const isFollowing = e.data?.isFollowing !== false
        return {
          ...e,
          style: {
            stroke: '#9ca3af',
            strokeWidth: 1,
            strokeDasharray: isFollowing ? undefined : '12 8',
            transform: `translate(${offset}px, ${offset}px)`
          }
        }
      })

    // 편집 중인 edge들 (패스 색상으로 표시)
    const editingEdges = editingPathEdges.value.map((edge, index) => {
      const isFollowing = edge.lagDays !== undefined && edge.lagDays !== null
      const handles = getEdgeHandles?.(edge.sourceWorkId, edge.targetWorkId)
      return {
        id: `editing-${selectedPathId.value}-${edge.sourceWorkId}-${edge.targetWorkId}-${index}`,
        source: `work-${edge.sourceWorkId}`,
        target: `work-${edge.targetWorkId}`,
        sourceHandle: handles?.sourceHandle,
        targetHandle: handles?.targetHandle,
        type: 'smoothstep',
        pathOptions: { borderRadius: 20, offset: 15 },
        style: { stroke: pathColor, strokeWidth: 2, strokeDasharray: isFollowing ? undefined : '12 8' },
        data: { pathId: selectedPathId.value, editing: true }
      }
    })

    return [...otherEdges, ...editingEdges]
  })

  // 패스 선택 (이미 같은 패스면 무시)
  const selectPath = (pathId: number) => {
    if (selectedPathId.value === pathId) return
    selectedPathId.value = pathId
    const path = paths.value.find(p => p.workPathId === pathId)
    editingPathEdges.value = path?.edges ? [...path.edges] : []
  }

  // 패스 선택 토글 (하위 호환)
  const togglePathSelection = (pathId: number) => {
    if (selectedPathId.value === pathId) {
      // 선택 해제
      selectedPathId.value = null
      editingPathEdges.value = []
    } else {
      selectPath(pathId)
    }
  }

  // edges 변경 여부 확인
  const hasEdgesChanged = () => {
    if (!selectedPathId.value) return false
    const path = paths.value.find(p => p.workPathId === selectedPathId.value)
    if (!path) return false
    const newEdges = editingPathEdges.value.map(({ sourceWorkId, targetWorkId }) => ({ sourceWorkId, targetWorkId }))
    const origEdges = path.edges.map(({ sourceWorkId, targetWorkId }) => ({ sourceWorkId, targetWorkId }))
    return JSON.stringify(newEdges) !== JSON.stringify(origEdges)
  }

  // 패스 수정 제출 (선택 해제 포함)
  const submitPathUpdate = async () => {
    if (!selectedPathId.value) return

    if (!hasEdgesChanged()) {
      selectedPathId.value = null
      editingPathEdges.value = []
      return
    }

    isUpdatingPath.value = true
    try {
      const mutation = await workPathApi.updateWorkPath(selectedPathId.value, {
        edges: editingPathEdges.value.map(({ sourceWorkId, targetWorkId }) => ({ sourceWorkId, targetWorkId })),
      })
      onPathUpdated(mutation)
      analyticsClient.trackAction('schedule_2d', 'update_path', 'success')
      selectedPathId.value = null
      editingPathEdges.value = []
    } catch (error: unknown) {
      console.error('패스 수정 실패:', error)
      analyticsClient.trackAction('schedule_2d', 'update_path', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      const errorMessage = err.response?.data?.message || err.message
      alert(errorMessage)
    } finally {
      isUpdatingPath.value = false
    }
  }

  // 패스 수정 즉시 저장 (선택 유지)
  const savePathEdges = async () => {
    if (!selectedPathId.value) return
    if (!hasEdgesChanged()) return

    isUpdatingPath.value = true
    try {
      const mutation = await workPathApi.updateWorkPath(selectedPathId.value, {
        edges: editingPathEdges.value.map(({ sourceWorkId, targetWorkId }) => ({ sourceWorkId, targetWorkId })),
      })
      onPathUpdated(mutation)
      analyticsClient.trackAction('schedule_2d', 'update_path', 'success')
    } catch (error: unknown) {
      console.error('패스 수정 실패:', error)
      analyticsClient.trackAction('schedule_2d', 'update_path', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      const errorMessage = err.response?.data?.message || err.message
      alert(errorMessage)
    } finally {
      isUpdatingPath.value = false
    }
  }

  // 패스 속성 수정 (이름, 색상, critical, edges 등)
  const updatePath = async (pathId: number, payload: UpdateWorkPathPayload): Promise<MutationResponse | null> => {
    if (Object.keys(payload).length === 0) return null
    try {
      const mutation = await workPathApi.updateWorkPath(pathId, payload)
      onPathUpdated(mutation)
      analyticsClient.trackAction('schedule_2d', 'update_path', 'success')
      return mutation
    } catch (error: unknown) {
      console.error('패스 수정 실패:', error)
      analyticsClient.trackAction('schedule_2d', 'update_path', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      return null
    }
  }

  // lagDays 수정
  const updateLagDays = async (pathId: number, targetWorkId: number, days: number | null) => {
    try {
      const mutation = await workPathApi.updateWorkPathLagDays(pathId, { workId: targetWorkId, lagDays: days })
      onPathUpdated(mutation)
      analyticsClient.trackAction('schedule_2d', 'update_path_lag_days', 'success')
    } catch (error: unknown) {
      console.error('lagDays 수정 실패:', error)
      analyticsClient.trackAction('schedule_2d', 'update_path_lag_days', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    }
  }

  // 패스 편집 취소
  const cancelPathEdit = () => {
    selectedPathId.value = null
    editingPathEdges.value = []
  }

  // 노드 연결 이벤트 (패스 편집 모드에서 - 체인 기반 재구성)
  // 패스 미선택 시 null 반환 → 호출측에서 createPath 처리
  const onConnect = (params: { source: string; target: string }): { sourceWorkId: number; targetWorkId: number } | null => {
    const sourceWorkId = parseInt(params.source.replace('work-', ''))
    const targetWorkId = parseInt(params.target.replace('work-', ''))
    if (sourceWorkId === targetWorkId) return null

    if (!isPathEditMode.value) {
      return { sourceWorkId, targetWorkId }
    }

    // 이미 동일한 연결이 있는지 확인
    const alreadyExists = editingPathEdges.value.some(
      e => e.sourceWorkId === sourceWorkId && e.targetWorkId === targetWorkId
    )
    if (alreadyExists) return null

    // 1. 현재 체인 계산
    const currentChain = edgesToChain(editingPathEdges.value)

    // 2. source와 target의 위치 확인
    const sourceIndex = currentChain.indexOf(sourceWorkId)
    const targetIndex = currentChain.indexOf(targetWorkId)

    let newChain: number[]

    if (sourceIndex === -1 && targetIndex === -1) {
      // 둘 다 체인에 없음: 분리된 체인으로 엣지만 추가
      editingPathEdges.value.push({ sourceWorkId, targetWorkId })
      return null
    } else if (sourceIndex === -1) {
      // source만 새로움: target 앞에 삽입
      newChain = [...currentChain]
      newChain.splice(targetIndex, 0, sourceWorkId)
    } else if (targetIndex === -1) {
      // target만 새로움: source 뒤에 삽입
      newChain = [...currentChain]
      newChain.splice(sourceIndex + 1, 0, targetWorkId)
    } else if (sourceIndex + 1 === targetIndex) {
      // 이미 연결됨: 아무것도 안 함
      return null
    } else {
      // 둘 다 체인에 있지만 연결 안 됨: 체인 재구성
      // source 다음에 target이 오도록 재배열
      newChain = currentChain.filter(id => id !== targetWorkId)
      const newSourceIndex = newChain.indexOf(sourceWorkId)
      newChain.splice(newSourceIndex + 1, 0, targetWorkId)
    }

    // 3. 기존 lagDays 보존용 맵
    const lagMap = new Map<string, number | null>()
    editingPathEdges.value.forEach(e => {
      if (e.lagDays != null) {
        lagMap.set(`${e.sourceWorkId}-${e.targetWorkId}`, e.lagDays)
      }
    })

    // 4. 체인에서 엣지 재생성 + lagDays 복원
    editingPathEdges.value = chainToEdges(newChain).map(e => {
      const lag = lagMap.get(`${e.sourceWorkId}-${e.targetWorkId}`)
      return lag != null ? { ...e, lagDays: lag } : e
    })
    return null
  }

  // 패스에서 노드 제거 (체인 기반 재구성으로 순서 보장)
  const removeNodeFromPath = (workId: number) => {
    const currentChain = edgesToChain(editingPathEdges.value)
    if (!currentChain.includes(workId)) return

    const newChain = currentChain.filter(id => id !== workId)
    if (newChain.length < 2) {
      editingPathEdges.value = []
      return
    }

    const lagMap = new Map<string, number | null>()
    editingPathEdges.value.forEach(e => {
      if (e.lagDays != null) {
        lagMap.set(`${e.sourceWorkId}-${e.targetWorkId}`, e.lagDays)
      }
    })

    editingPathEdges.value = chainToEdges(newChain).map(e => {
      const lag = lagMap.get(`${e.sourceWorkId}-${e.targetWorkId}`)
      return lag != null ? { ...e, lagDays: lag } : e
    })
  }

  // 패스 편집 모드 초기화 (외부에서 사용)
  const clearPathEditMode = () => {
    selectedPathId.value = null
    editingPathEdges.value = []
  }

  return {
    // State
    selectedPathId,
    editingPathEdges,
    isUpdatingPath,

    // Computed
    isPathEditMode,
    selectedPathColor,
    orderedChainNodes,
    pathNodeIds,
    deleteButtonNodes,
    styledEdges,

    // Methods
    selectPath,
    togglePathSelection,
    submitPathUpdate,
    savePathEdges,
    updatePath,
    updateLagDays,
    cancelPathEdit,
    onConnect,
    removeNodeFromPath,
    clearPathEditMode
  }
}
