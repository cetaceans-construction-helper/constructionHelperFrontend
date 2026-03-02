<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { VueFlow, useVueFlow, type Node, type Edge } from '@vue-flow/core'
import { Controls } from '@vue-flow/controls'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { workApi, type WorkResponse, type MutationResponse } from '@/api/work'
import { workPathApi, type PathResponse } from '@/api/workPath'
import { useProjectStore } from '@/stores/project'
import { useCalendarStore } from '@/stores/calendarStore'
import { useChartConfigStore } from '@/stores/chartConfigStore'
import { worksToNodes, workToNode, computeNodeX, computeNodeWidth, dayIndexToDate } from '../nodeConfig'
import { appConfig } from '@/config'

// Composables
import { useDateHeader, ROW_HEIGHT, HEADER_HEIGHT } from '../composables/schedule2D/useDateHeader'
import { usePathEditor } from '../composables/schedule2D/usePathEditor'
import { useWorkEditor } from '../composables/schedule2D/useWorkEditor'
import { useWorkTooltipData } from '../composables/schedule2D/useWorkTooltipData'

const emit = defineEmits<{
  'works-loaded': [works: WorkResponse[]]
}>()

// VueFlow
const nodes = ref<Node[]>([])
const edges = ref<Edge[]>([])
const { zoomIn, zoomOut, viewport } = useVueFlow()

// 패스 관련 상태
const paths = ref<PathResponse[]>([])
const isLoadingWorks = ref(false)

// 그루핑 박스 표시 상태
const showWorkTypeGroup = ref(false)
const showSubWorkTypeGroup = ref(false)

// 그루핑 박스 선택 & 드래그
const selectedGroupIndex = ref<number | null>(null)
const isDraggingGroup = ref(false)
const groupDragStartY = ref(0)
const groupDragOriginalPositions = ref<Map<number, number>>(new Map())

const selectGroup = (index: number, event: MouseEvent) => {
  event.stopPropagation()
  selectedGroupIndex.value = index
}

const startGroupDrag = (index: number, event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
  if (selectedGroupIndex.value !== index) {
    selectedGroupIndex.value = index
  }

  const box = groupBoxes.value[index]
  if (!box) return

  isDraggingGroup.value = true
  groupDragStartY.value = event.clientY

  // 그룹에 속한 노드들의 원래 Y 저장
  const origPositions = new Map<number, number>()
  const workNodes = nodes.value.filter(n => n.id.startsWith('work-'))
  workNodes.forEach(n => {
    const work = n.data.work as WorkResponse
    const groupKey = box.level === 'workType'
      ? (work.workType || '미분류')
      : (work.subWorkType || '미분류')
    if (groupKey === box.label) {
      origPositions.set(work.workId, n.position.y)
    }
  })
  groupDragOriginalPositions.value = origPositions

  const cfg = chartConfigStore.config
  const rowUnit = cfg.nodeHeight + 2 * cfg.nodePaddingY

  const onMouseMove = (e: MouseEvent) => {
    const deltaScreen = e.clientY - groupDragStartY.value
    const deltaFlow = deltaScreen / viewport.value.zoom
    const snappedDelta = Math.round(deltaFlow / rowUnit) * rowUnit
    if (snappedDelta === 0 && Math.abs(deltaFlow) < rowUnit / 2) return

    origPositions.forEach((origY, workId) => {
      const node = nodes.value.find(n => n.id === `work-${workId}`)
      if (node) node.position.y = origY + snappedDelta
    })
  }

  const onMouseUp = async () => {
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
    isDraggingGroup.value = false

    // 변경된 노드들 API 저장
    const updates: Promise<void>[] = []
    origPositions.forEach((origY, workId) => {
      const node = nodes.value.find(n => n.id === `work-${workId}`)
      if (!node) return
      const snappedY = Math.floor(node.position.y / rowUnit) * rowUnit
      node.position.y = snappedY
      const work = node.data.work as WorkResponse
      if (snappedY === origY) return
      updates.push(
        workApi.updateWork(work.workId, {
          positionY: snappedY,
          startDate: work.startDate,
          workLeadTime: work.workLeadTime,
        }).then(() => {
          node.data.work = { ...work, positionY: snappedY }
        }).catch((error: any) => {
          console.error('그룹 이동 저장 실패:', error)
          node.position.y = origY
        })
      )
    })
    await Promise.all(updates)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

// 삭제 팝업 상태
const showDeleteDialog = ref(false)
const deleteType = ref<'work' | 'path'>('work')
const isDeleting = ref(false)

// 경로 최적화 상태
const showOptimizeDialog = ref(false)
const isOptimizing = ref(false)
const optimizeTarget = ref<'all' | 'current'>('all')

const executeOptimize = async () => {
  isOptimizing.value = true
  try {
    const mutation = optimizeTarget.value === 'current'
      ? await workPathApi.optimizePath(selectedPathId.value!)
      : await workPathApi.optimizePaths()
    applyMutation(mutation)
    showOptimizeDialog.value = false
  } catch (error: any) {
    console.error('경로 최적화 실패:', error)
    const errorMessage = error.response?.data?.message || error.message
    alert(errorMessage)
  } finally {
    isOptimizing.value = false
  }
}

// 말풍선 상태 - flow 좌표 저장
const tooltip = ref<{
  visible: boolean
  nodeX: number      // flow 좌표 (노드 중앙 X)
  nodeY: number      // flow 좌표 (노드 상단 Y)
  workId: number | null
  workName: string
  startDate: string
  workLeadTime: number
  completionDate: string
  isWorkingOnHoliday: boolean
}>({
  visible: false,
  nodeX: 0,
  nodeY: 0,
  workId: null,
  workName: '',
  startDate: '',
  workLeadTime: 0,
  completionDate: '',
  isWorkingOnHoliday: true
})

// 선택된 노드의 선행작업 목록 (모든 패스에서)
const tooltipPredecessors = computed(() => {
  const wId = tooltip.value.workId
  if (!wId) return []

  return paths.value.flatMap(p => {
    const predecessorEdges = p.edges.filter(e => e.targetWorkId === wId)
    return predecessorEdges.map(e => {
      const node = nodes.value.find(n => n.id === `work-${e.sourceWorkId}`)
      const work = node?.data.work as WorkResponse | undefined
      return {
        pathId: p.workPathId,
        pathName: p.workPathName,
        pathColor: p.workPathColor,
        workId: e.sourceWorkId,
        workName: work?.workName || `Work ${e.sourceWorkId}`,
        lagDays: e.lagDays ?? 0,
        isFollowing: e.lagDays !== undefined && e.lagDays !== null
      }
    })
  })
})

// 그루핑 박스
interface GroupBox {
  level: 'workType' | 'subWorkType'
  label: string
  x: number
  y: number
  width: number
  height: number
  fillColor: string
  borderColor: string
}

const GROUP_PALETTE = [
  { bg: 'rgba(59, 130, 246, 0.06)', border: 'rgba(59, 130, 246, 0.25)', subBg: 'rgba(59, 130, 246, 0.08)', subBorder: 'rgba(59, 130, 246, 0.35)' },
  { bg: 'rgba(16, 185, 129, 0.06)', border: 'rgba(16, 185, 129, 0.25)', subBg: 'rgba(16, 185, 129, 0.08)', subBorder: 'rgba(16, 185, 129, 0.35)' },
  { bg: 'rgba(245, 158, 11, 0.06)', border: 'rgba(245, 158, 11, 0.25)', subBg: 'rgba(245, 158, 11, 0.08)', subBorder: 'rgba(245, 158, 11, 0.35)' },
  { bg: 'rgba(168, 85, 247, 0.06)', border: 'rgba(168, 85, 247, 0.25)', subBg: 'rgba(168, 85, 247, 0.08)', subBorder: 'rgba(168, 85, 247, 0.35)' },
  { bg: 'rgba(236, 72, 153, 0.06)', border: 'rgba(236, 72, 153, 0.25)', subBg: 'rgba(236, 72, 153, 0.08)', subBorder: 'rgba(236, 72, 153, 0.35)' },
  { bg: 'rgba(6, 182, 212, 0.06)', border: 'rgba(6, 182, 212, 0.25)', subBg: 'rgba(6, 182, 212, 0.08)', subBorder: 'rgba(6, 182, 212, 0.35)' },
]

function calcBBox(nodeList: Node[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  nodeList.forEach(n => {
    const w = (n.data.computedWidth as number) || 0
    const h = (n.data.computedHeight as number) || 0
    minX = Math.min(minX, n.position.x)
    minY = Math.min(minY, n.position.y)
    maxX = Math.max(maxX, n.position.x + w)
    maxY = Math.max(maxY, n.position.y + h)
  })
  return { minX, minY, maxX, maxY }
}

const groupBoxes = computed<GroupBox[]>(() => {
  const workNodes = nodes.value.filter(n => n.id.startsWith('work-'))
  if (workNodes.length === 0) return []

  const boxes: GroupBox[] = []

  // workType별 그룹핑
  const byWorkType = new Map<string, Node[]>()
  workNodes.forEach(n => {
    const work = n.data.work as WorkResponse
    const key = work.workType || '미분류'
    if (!byWorkType.has(key)) byWorkType.set(key, [])
    byWorkType.get(key)!.push(n)
  })

  let typeIdx = 0
  byWorkType.forEach((typeNodes, workType) => {
    const palette = GROUP_PALETTE[typeIdx % GROUP_PALETTE.length]!

    // subWorkType별 분류
    const bySubType = new Map<string, Node[]>()
    typeNodes.forEach(n => {
      const work = n.data.work as WorkResponse
      const key = work.subWorkType || '미분류'
      if (!bySubType.has(key)) bySubType.set(key, [])
      bySubType.get(key)!.push(n)
    })

    if (bySubType.size >= 2) {
      // subWorkType 2개 이상 → workType 박스 + subWorkType 박스들
      const wtPadding = 15
      const { minX, minY, maxX, maxY } = calcBBox(typeNodes)
      boxes.push({
        level: 'workType', label: workType,
        x: minX - wtPadding, y: minY - wtPadding,
        width: maxX - minX + wtPadding * 2, height: maxY - minY + wtPadding * 2,
        fillColor: palette.bg, borderColor: palette.border,
      })

      const subPadding = 8
      bySubType.forEach((subNodes, subType) => {
        const sb = calcBBox(subNodes)
        boxes.push({
          level: 'subWorkType', label: subType,
          x: sb.minX - subPadding, y: sb.minY - subPadding,
          width: sb.maxX - sb.minX + subPadding * 2, height: sb.maxY - sb.minY + subPadding * 2,
          fillColor: palette.subBg, borderColor: palette.subBorder,
        })
      })
    } else {
      // subWorkType 1개 → subWorkType 이름으로 박스 하나만
      const subName = bySubType.keys().next().value || '미분류'
      const padding = 12
      const { minX, minY, maxX, maxY } = calcBBox(typeNodes)
      boxes.push({
        level: 'subWorkType', label: subName,
        x: minX - padding, y: minY - padding,
        width: maxX - minX + padding * 2, height: maxY - minY + padding * 2,
        fillColor: palette.subBg, borderColor: palette.subBorder,
      })
    }

    typeIdx++
  })

  return boxes
})

// 프로젝트 및 캘린더 데이터
const projectStore = useProjectStore()
const calendarStore = useCalendarStore()
const chartConfigStore = useChartConfigStore()

// 캘린더 데이터 로드
const loadCalendarData = async () => {
  if (projectStore.selectedProjectId) {
    await calendarStore.getCalendar(projectStore.selectedProjectId)
  }
}

// calendarData computed (useDateHeader에 전달)
const calendarData = computed(() => calendarStore.calendarData)

// lagDays 수정
const updateEdgeOverlap = async (pathId: number, sourceWorkId: number, targetWorkId: number, days: number | null) => {
  const path = paths.value.find(p => p.workPathId === pathId)
  if (!path) return
  const updatedEdges = path.edges.map(e =>
    e.sourceWorkId === sourceWorkId && e.targetWorkId === targetWorkId
      ? { ...e, lagDays: days }
      : e
  )
  try {
    const mutation = await workPathApi.updateWorkPath(pathId, { edges: updatedEdges })
    applyMutation(mutation)
  } catch (error: any) {
    console.error('lagDays 수정 실패:', error)
    alert(error.response?.data?.message || error.message)
  }
}

// lagDays 로컬 업데이트 (API 호출 없이 computed 재계산용)
const updateEdgeOverlapLocal = (pathId: number, sourceWorkId: number, targetWorkId: number, days: number | null) => {
  const path = paths.value.find(p => p.workPathId === pathId)
  if (!path) return
  const idx = path.edges.findIndex(e => e.sourceWorkId === sourceWorkId && e.targetWorkId === targetWorkId)
  if (idx === -1) return
  path.edges[idx] = { ...path.edges[idx]!, lagDays: days }
  paths.value = [...paths.value]
}

// 작업 및 패스 데이터 로드
const loadWorkData = async () => {
  isLoadingWorks.value = true
  try {
    const [works, pathList] = await Promise.all([
      workApi.getWorkList(),
      workPathApi.getPathList()
    ])
    nodes.value = worksToNodes(works)
    paths.value = pathList

    // 같은 source-target 쌍을 가진 엣지들에 offset 적용
    const edgePairCount = new Map<string, number>()

    edges.value = pathList.flatMap(path =>
      path.edges.map(edge => {
        const pairKey = `${edge.sourceWorkId}-${edge.targetWorkId}`
        const currentCount = edgePairCount.get(pairKey) || 0
        edgePairCount.set(pairKey, currentCount + 1)

        // offset 계산: 0, 3, -3, 6, -6, ... (X, Y 동일)
        const offsetIndex = currentCount
        const offset = offsetIndex === 0 ? 0 : (offsetIndex % 2 === 1 ? 1 : -1) * Math.ceil(offsetIndex / 2) * 3

        return {
          id: `edge-${path.workPathId}-${edge.sourceWorkId}-${edge.targetWorkId}`,
          source: `work-${edge.sourceWorkId}`,
          target: `work-${edge.targetWorkId}`,
          type: 'smoothstep',
          pathOptions: { borderRadius: 20, offset: 15 },
          style: { stroke: path.workPathColor },
          data: { pathId: path.workPathId, pathName: path.workPathName, offset }
        }
      })
    )

    emit('works-loaded', works)

    // 말풍선이 열려있으면 갱신된 노드 데이터로 동기화
    if (tooltip.value.visible && tooltip.value.workId) {
      const updatedNode = nodes.value.find(n => n.id === `work-${tooltip.value.workId}`)
      const updatedWork = updatedNode?.data.work as WorkResponse | undefined
      if (updatedNode && updatedWork) {
        tooltip.value.workName = updatedWork.workName
        tooltip.value.startDate = updatedWork.startDate
        tooltip.value.workLeadTime = updatedWork.workLeadTime
        tooltip.value.completionDate = updatedWork.completionDate
        tooltip.value.isWorkingOnHoliday = updatedWork.isWorkingOnHoliday
        tooltip.value.nodeX = updatedNode.position.x + (updatedNode.data.computedWidth as number) / 2
        tooltip.value.nodeY = updatedNode.position.y - 8
      } else {
        tooltip.value.visible = false
      }
    }
  } catch (error) {
    console.error('데이터 로드 실패:', error)
  } finally {
    isLoadingWorks.value = false
  }
}

// MutationResponse를 받아 로컬 nodes, edges, paths를 부분 갱신
const applyMutation = (mutation: MutationResponse) => {
  // 1) updatedWorks 반영 → 기존 노드 업데이트 (position.y 유지)
  if (mutation.updatedWorks.length > 0) {
    const updateMap = new Map(mutation.updatedWorks.map(w => [w.workId, w]))
    nodes.value = nodes.value.map(n => {
      const work = updateMap.get((n.data.work as WorkResponse).workId)
      if (!work) return n
      const updated = workToNode(work)
      return { ...updated, position: { ...updated.position, y: n.position.y } }
    })
    // 말풍선 동기화
    if (tooltip.value.visible && tooltip.value.workId) {
      const w = updateMap.get(tooltip.value.workId)
      if (w) {
        tooltip.value.workName = w.workName
        tooltip.value.startDate = w.startDate
        tooltip.value.workLeadTime = w.workLeadTime
        tooltip.value.completionDate = w.completionDate
        tooltip.value.isWorkingOnHoliday = w.isWorkingOnHoliday
        const node = nodes.value.find(n => n.id === `work-${w.workId}`)
        if (node) {
          tooltip.value.nodeX = node.position.x + (node.data.computedWidth as number) / 2
          tooltip.value.nodeY = node.position.y - 8
        }
      }
    }
    emit('works-loaded', nodes.value.map(n => n.data.work as WorkResponse))
  }

  // 2) updatedWorkPaths 반영 → 해당 path의 edges 재생성
  if (mutation.updatedWorkPaths.length > 0) {
    const updatedPathIds = new Set(mutation.updatedWorkPaths.map(p => p.workPathId))
    // paths 배열 갱신 (기존 path를 새 데이터로 교체)
    const pathMap = new Map(mutation.updatedWorkPaths.map(p => [p.workPathId, p]))
    paths.value = paths.value.map(p => pathMap.get(p.workPathId) ?? p)
    // 해당 path의 기존 엣지 제거 후 새로 생성
    edges.value = edges.value.filter(e => !updatedPathIds.has(e.data?.pathId))
    // 새 엣지 추가 (offset 계산 포함)
    const edgePairCount = new Map<string, number>()
    // 기존 엣지에서 pairCount 집계
    edges.value.forEach(e => {
      const key = `${e.source}-${e.target}`
      edgePairCount.set(key, (edgePairCount.get(key) || 0) + 1)
    })
    const newEdges = mutation.updatedWorkPaths.flatMap(path =>
      path.edges.map(edge => {
        const pairKey = `work-${edge.sourceWorkId}-work-${edge.targetWorkId}`
        const currentCount = edgePairCount.get(pairKey) || 0
        edgePairCount.set(pairKey, currentCount + 1)
        const offset = currentCount === 0 ? 0 : (currentCount % 2 === 1 ? 1 : -1) * Math.ceil(currentCount / 2) * 3
        return {
          id: `edge-${path.workPathId}-${edge.sourceWorkId}-${edge.targetWorkId}`,
          source: `work-${edge.sourceWorkId}`,
          target: `work-${edge.targetWorkId}`,
          type: 'smoothstep',
          pathOptions: { borderRadius: 20, offset: 15 },
          style: { stroke: path.workPathColor },
          data: { pathId: path.workPathId, pathName: path.workPathName, offset }
        }
      })
    )
    edges.value = [...edges.value, ...newEdges]
  }
}

// 삭제 팝업 열기
const openDeleteDialog = (type: 'work' | 'path') => {
  deleteType.value = type
  showDeleteDialog.value = true
}

// 삭제 실행
const executeDelete = async () => {
  isDeleting.value = true
  try {
    if (deleteType.value === 'work' && selectedWorkId.value) {
      const mutation = await workApi.deleteWork(selectedWorkId.value)
      const deletedNodeId = `work-${selectedWorkId.value}`
      edges.value = edges.value.filter((e) => e.source !== deletedNodeId && e.target !== deletedNodeId)
      nodes.value = nodes.value.filter((n) => n.id !== deletedNodeId)
      applyMutation(mutation)
      clearWorkSelection()
      tooltip.value.visible = false
      emit('works-loaded', nodes.value.map((n) => n.data.work as WorkResponse))
    } else if (deleteType.value === 'path' && selectedPathId.value) {
      await workPathApi.deleteWorkPath(selectedPathId.value)
      const deletedPathId = selectedPathId.value
      edges.value = edges.value.filter((e) => e.data?.pathId !== deletedPathId)
      paths.value = paths.value.filter((p) => p.workPathId !== deletedPathId)
      cancelPathEdit()
    }
    showDeleteDialog.value = false
  } catch (error: unknown) {
    console.error('삭제 실패:', error)
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    const errorMessage = err.response?.data?.message || err.message
    alert(errorMessage)
  } finally {
    isDeleting.value = false
  }
}

// Composables 초기화
const {
  containerRef,
  DAY_WIDTH,
  allProjectDates,
  visibleDates,
  projectGridBounds,
  yearCells,
  monthCells,
  weekCells,
  holidayIndices,
  deactivatedIndices,
  todayInProject,
  setupResizeObserver,
  cleanupResizeObserver
} = useDateHeader(viewport, calendarData)

const {
  selectedPathId,
  editingPathEdges,
  isPathEditMode,
  selectedPathColor,
  pathNodeIds,
  deleteButtonNodes,
  styledEdges,
  selectPath,
  togglePathSelection,
  cancelPathEdit,
  onConnect,
  removeNodeFromPath,
  savePathEdges,
} = usePathEditor(nodes, edges, paths, applyMutation)

// 패스 모드 플래그 (패스 선택 없이도 모드 전환 가능)
const pathMode = ref(false)
const isInPathMode = computed(() => pathMode.value || isPathEditMode.value)

// pathMode 해제 시 패스 선택도 해제
watch(pathMode, (val) => {
  if (!val && isPathEditMode.value) {
    cancelPathEdit()
    tooltip.value.visible = false
  }
})

// 패스 편집 모드에서 노드 하이라이트
watch(
  [isInPathMode, selectedPathColor, pathNodeIds],
  ([editMode, pathColor, nodeIds]) => {
    nodes.value = nodes.value.map(node => {
      const workId = parseInt(node.id.replace('work-', ''))
      const work = node.data.work as WorkResponse

      // 기본 스타일 (휴일 휴무 여부 반영)
      const baseStyle: Record<string, string> = {
        width: `${node.data.computedWidth}px`,
        height: `${node.data.computedHeight}px`,
        overflow: 'visible',
        whiteSpace: 'nowrap'
      }

      // 휴일 휴무인 작업은 옅은 회색 배경
      if (!work.isWorkingOnHoliday) {
        baseStyle.backgroundColor = '#f3f4f6'
        baseStyle.borderColor = '#d1d5db'
      }

      if (editMode && pathColor && nodeIds.has(workId)) {
        return {
          ...node,
          style: {
            ...baseStyle,
            border: `2px solid ${pathColor}`,
            boxShadow: `0 0 8px ${pathColor}50`
          }
        }
      }

      return {
        ...node,
        style: baseStyle
      }
    })
  },
  { deep: true }
)

const {
  selectedWorkId,
  workEditForm,
  selectedWork,
  clearSelection: clearWorkSelection,
  selectWork
} = useWorkEditor(nodes, applyMutation)

// 작업 생성/수정 다이얼로그
const td = reactive(useWorkTooltipData())

// 패스 편집 상태
const editPathName = ref('')
const editPathColor = ref('')
const editPathCritical = ref(false)
const isSavingPath = ref(false)

watch(selectedPathId, (pathId) => {
  if (pathId) {
    const path = paths.value.find((p) => p.workPathId === pathId)
    if (path) {
      editPathName.value = path.workPathName ?? ''
      editPathColor.value = path.workPathColor
      editPathCritical.value = path.critical
    }
  }
})

// 패스 변경 저장
const savePathChanges = async () => {
  if (!selectedPathId.value) return
  isSavingPath.value = true
  try {
    const mutation = await workPathApi.updateWorkPath(selectedPathId.value, {
      workPathName: editPathName.value,
      workPathColor: editPathColor.value,
      critical: editPathCritical.value,
      edges: editingPathEdges.value,
    })
    applyMutation(mutation)
    cancelPathEdit()
  } catch (error: any) {
    console.error('패스 수정 실패:', error)
    const errorMessage = error.response?.data?.message || error.message
    alert(errorMessage)
  } finally {
    isSavingPath.value = false
  }
}

// 리사이즈 핸들 상태
const resizing = ref<{
  side: 'left' | 'right'
  workId: number
  startMouseX: number
  origStartDate: string
  origLeadTime: number
  origNodeX: number
  origNodeWidth: number
} | null>(null)

// 선택된 노드의 양쪽 핸들 위치 computed (모서리 중앙)
const resizeHandles = computed(() => {
  if (!selectedWorkId.value) return null
  const node = nodes.value.find(n => n.id === `work-${selectedWorkId.value}`)
  if (!node) return null
  const w = node.data.computedWidth as number
  const h = node.data.computedHeight as number
  return {
    left: { x: node.position.x, y: node.position.y + h / 2 },
    right: { x: node.position.x + w, y: node.position.y + h / 2 }
  }
})

// 노드 클릭 핸들러 - 작업 선택 + 말풍선 표시
const onNodeClick = (event: { node: Node; event: MouseEvent | TouchEvent }) => {
  const work = event.node.data.work as WorkResponse | undefined
  if (!work) return

  // 같은 노드 클릭 시 선택 해제
  if (tooltip.value.visible && tooltip.value.workId === work.workId) {
    if (!isInPathMode.value) clearWorkSelection()
    tooltip.value.visible = false
    tooltip.value.workId = null
    return
  }

  // 노드 선택 (패스 모드가 아닐 때만)
  if (!isInPathMode.value) selectWork(work.workId)

  // 말풍선 표시
  tooltip.value = {
    visible: true,
    nodeX: event.node.position.x + (event.node.data.computedWidth as number) / 2,
    nodeY: event.node.position.y - 8,
    workId: work.workId,
    workName: work.workName,
    startDate: work.startDate,
    workLeadTime: work.workLeadTime,
    completionDate: work.completionDate,
    isWorkingOnHoliday: work.isWorkingOnHoliday
  }
}

// 로컬 날짜를 YYYY-MM-DD 문자열로 변환
const formatLocalDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 말풍선에서 작업 즉시 업데이트 (startDate, workLeadTime, isWorkingOnHoliday)
const updateTooltipWork = async (patch: { startDate?: string, workLeadTime?: number, isWorkingOnHoliday?: boolean }) => {
  if (!tooltip.value.workId) return

  const prev = {
    startDate: tooltip.value.startDate,
    workLeadTime: tooltip.value.workLeadTime,
    isWorkingOnHoliday: tooltip.value.isWorkingOnHoliday
  }

  // 낙관적 반영
  if (patch.startDate !== undefined) tooltip.value.startDate = patch.startDate
  if (patch.workLeadTime !== undefined) tooltip.value.workLeadTime = patch.workLeadTime
  if (patch.isWorkingOnHoliday !== undefined) tooltip.value.isWorkingOnHoliday = patch.isWorkingOnHoliday

  try {
    const mutation = await workApi.updateWork(tooltip.value.workId, {
      startDate: tooltip.value.startDate,
      workLeadTime: tooltip.value.workLeadTime,
      isWorkingOnHoliday: tooltip.value.isWorkingOnHoliday
    })
    workEditForm.value.startDate = tooltip.value.startDate
    workEditForm.value.workLeadTime = tooltip.value.workLeadTime
    workEditForm.value.isWorkingOnHoliday = tooltip.value.isWorkingOnHoliday
    applyMutation(mutation)
  } catch (error: any) {
    console.error('작업 수정 실패:', error)
    const errorMessage = error.response?.data?.message || error.message
    alert(errorMessage)
    // 롤백
    tooltip.value.startDate = prev.startDate
    tooltip.value.workLeadTime = prev.workLeadTime
    tooltip.value.isWorkingOnHoliday = prev.isWorkingOnHoliday
  }
}

// 말풍선 시작일 조절
const adjustTooltipStartDate = (days: number) => {
  const date = new Date(tooltip.value.startDate)
  date.setDate(date.getDate() + days)
  updateTooltipWork({ startDate: formatLocalDate(date) })
}

// 말풍선 작업일수 조절
const adjustTooltipLeadTime = (delta: number) => {
  const newVal = tooltip.value.workLeadTime + delta
  if (newVal < 1) return
  updateTooltipWork({ workLeadTime: newVal })
}

// 패스 선택 토글 래퍼 (작업 선택 해제 포함)
const handlePathToggle = (pathId: number) => {
  togglePathSelection(pathId)
  // 패스 선택 시 작업 선택 해제
  if (selectedPathId.value === pathId) {
    clearWorkSelection()
    tooltip.value.visible = false
  }
}

// 패스 편집 다이얼로그
const showPathDialog = ref(false)

// 노드 연결 핸들러 (패스 미선택 시 새 패스 생성)
const handleConnect = async (params: { source: string; target: string }) => {
  const result = onConnect(params)
  if (!result) {
    // 패스 편집 모드에서 work 추가된 경우 즉시 저장
    if (isPathEditMode.value) savePathEdges()
    return
  }

  // 패스 미선택 상태 → createPath 호출
  try {
    const mutation = await workPathApi.createPath(result)
    const newPath = mutation.updatedWorkPaths[0]!
    // paths 배열에 추가
    paths.value = [...paths.value, newPath]
    // 엣지 생성 (offset 계산)
    const edgePairCount = new Map<string, number>()
    edges.value.forEach(e => {
      const key = `${e.source}-${e.target}`
      edgePairCount.set(key, (edgePairCount.get(key) || 0) + 1)
    })
    const newEdges = newPath.edges.map(edge => {
      const pairKey = `work-${edge.sourceWorkId}-work-${edge.targetWorkId}`
      const currentCount = edgePairCount.get(pairKey) || 0
      edgePairCount.set(pairKey, currentCount + 1)
      const offset = currentCount === 0 ? 0 : (currentCount % 2 === 1 ? 1 : -1) * Math.ceil(currentCount / 2) * 3
      return {
        id: `edge-${newPath.workPathId}-${edge.sourceWorkId}-${edge.targetWorkId}`,
        source: `work-${edge.sourceWorkId}`,
        target: `work-${edge.targetWorkId}`,
        type: 'smoothstep',
        pathOptions: { borderRadius: 20, offset: 15 },
        style: { stroke: newPath.workPathColor },
        data: { pathId: newPath.workPathId, pathName: newPath.workPathName, offset }
      }
    })
    edges.value = [...edges.value, ...newEdges]
    applyMutation(mutation)
    // 생성된 패스를 자동 선택
    selectPath(newPath.workPathId)
  } catch (error: any) {
    console.error('패스 생성 실패:', error)
    const errorMessage = error.response?.data?.message || error.message
    alert(errorMessage)
  }
}

// 엣지 클릭 시 하이라이트 (패스모드에서만 동작)
const onEdgeClick = (event: { edge: Edge }) => {
  if (!isInPathMode.value) return
  const pathId = event.edge.data?.pathId as number | undefined
  if (!pathId) return
  selectPath(pathId)
  clearWorkSelection()
  tooltip.value.visible = false
}

// 엣지 더블클릭 시 다이얼로그 표시 (패스모드에서만 동작)
const onEdgeDoubleClick = (event: { edge: Edge }) => {
  if (!isInPathMode.value) return
  const pathId = event.edge.data?.pathId as number | undefined
  if (!pathId) return
  selectPath(pathId)
  showPathDialog.value = true
}

// 노드 더블클릭 → 상세 편집 다이얼로그
const onNodeDoubleClick = (event: { node: Node }) => {
  const work = event.node.data.work as WorkResponse | undefined
  if (!work || isInPathMode.value) return
  td.openDialog(work)
}

// 다이얼로그 제출 → 생성 or 수정
const handleWorkEditSubmit = async () => {
  if (td.isCreateMode) {
    // 생성 모드
    const result = await td.submitCreate()
    if (!result) return

    const response = result.updatedWorks[0]!
    const newNode = workToNode(response)
    newNode.position.y = td.createPositionY
    nodes.value = [...nodes.value, newNode]

    // Y 위치 백그라운드 저장
    workApi.updateWork(response.workId, {
      positionY: td.createPositionY,
      startDate: response.startDate,
      workLeadTime: response.workLeadTime,
    })

    // 선택 + 말풍선 표시
    selectWork(response.workId)
    tooltip.value = {
      visible: true,
      nodeX: newNode.position.x + (newNode.data.computedWidth as number) / 2,
      nodeY: newNode.position.y - 8,
      workId: response.workId,
      workName: response.workName,
      startDate: response.startDate,
      workLeadTime: response.workLeadTime,
      completionDate: response.completionDate,
      isWorkingOnHoliday: response.isWorkingOnHoliday,
    }
  } else {
    // 수정 모드
    const result = await td.submitEdit()
    if (!result) return

    const response = result.updatedWorks.find(w => w.workId === td.editingWorkId)!
    const updatedNode = workToNode(response)
    nodes.value = nodes.value.map((n) => {
      if (n.id !== `work-${response.workId}`) return n
      return {
        ...updatedNode,
        position: { ...updatedNode.position, y: n.position.y },
      }
    })

    // cascade 영향 받은 다른 Work도 반영
    const otherUpdates = result.updatedWorks.filter(w => w.workId !== response.workId)
    if (otherUpdates.length > 0) {
      const otherMap = new Map(otherUpdates.map(w => [w.workId, w]))
      nodes.value = nodes.value.map(n => {
        const w = otherMap.get((n.data.work as WorkResponse).workId)
        if (!w) return n
        const updated = workToNode(w)
        return { ...updated, position: { ...updated.position, y: n.position.y } }
      })
    }

    // updatedWorkPaths도 반영
    if (result.updatedWorkPaths.length > 0) {
      applyMutation({ updatedWorks: [], updatedWorkPaths: result.updatedWorkPaths })
    }

    // 말풍선이 열려있으면 갱신
    if (tooltip.value.visible && tooltip.value.workId === response.workId) {
      const node = nodes.value.find((n) => n.id === `work-${response.workId}`)
      if (node) {
        tooltip.value.workName = response.workName
        tooltip.value.startDate = response.startDate
        tooltip.value.workLeadTime = response.workLeadTime
        tooltip.value.completionDate = response.completionDate
        tooltip.value.isWorkingOnHoliday = response.isWorkingOnHoliday
        tooltip.value.nodeX = node.position.x + (node.data.computedWidth as number) / 2
        tooltip.value.nodeY = node.position.y - 8
      }
    }
  }

  emit('works-loaded', nodes.value.map((n) => n.data.work as WorkResponse))
}

// 빈 영역 클릭 시 선택 해제
const onPaneClick = () => {
  tooltip.value.visible = false
  selectedGroupIndex.value = null
  if (isPathEditMode.value) {
    cancelPathEdit()
  }
  if (!isInPathMode.value) {
    clearWorkSelection()
  }
}

// 컨테이너 더블클릭 → 노드 위가 아니면 빠른 생성
const onContainerDblClick = (event: MouseEvent) => {
  // 노드 위 더블클릭은 onNodeDoubleClick이 처리, 말풍선/그룹토글 위 더블클릭은 무시
  const target = event.target as HTMLElement
  if (target.closest('.vue-flow__node') || target.closest('[data-tooltip-balloon]') || target.closest('[data-group-toggle]')) return
  handlePaneDblClick(event)
}

// 빈 영역 더블클릭 → 생성 다이얼로그 열기
const handlePaneDblClick = (event: MouseEvent) => {
  if (isInPathMode.value) return

  const container = containerRef.value
  if (!container) return

  // 스크린 좌표 → flow 좌표 변환
  const rect = container.getBoundingClientRect()
  const flowX = (event.clientX - rect.left - viewport.value.x) / viewport.value.zoom
  const flowY = (event.clientY - rect.top - viewport.value.y) / viewport.value.zoom

  // flowX → dayIndex → startDate
  const dayIndex = Math.floor(flowX / appConfig.chart.pixelPerDay)
  const startDate = dayIndexToDate(dayIndex)

  // Y 그리드 스냅
  const cfg = chartConfigStore.config
  const rowUnit = cfg.nodeHeight + 2 * cfg.nodePaddingY
  const snappedY = Math.floor(flowY / rowUnit) * rowUnit

  td.openCreateDialog(startDate, snappedY)
}

// 노드 드래그 종료 시 위치 저장
const onNodeDragStop = async (event: { node: Node }) => {
  const work = event.node.data.work as WorkResponse | undefined
  if (!work) return

  const isSelectedWork = selectedWorkId.value === work.workId

  // 선택된 작업: X→startDate 계산
  if (isSelectedWork) {
    const cfg = chartConfigStore.config
    const originalX = event.node.data.originalX as number
    const daysDelta = Math.round((event.node.position.x - originalX) / cfg.pixelPerDay)

    if (daysDelta === 0) {
      event.node.position.x = originalX
      return
    }

    const base = new Date(work.startDate)
    base.setHours(0, 0, 0, 0)
    base.setDate(base.getDate() + daysDelta)
    const newStartDate = formatLocalDate(base)

    // 노드 좌표 재계산 (정위치 스냅)
    const newX = computeNodeX(newStartDate)
    event.node.position.x = newX
    event.node.data.originalX = newX

    try {
      const mutation = await workApi.updateWork(work.workId, {
        startDate: newStartDate,
        workLeadTime: work.workLeadTime
      })

      workEditForm.value.startDate = newStartDate
      // 연관 작업들의 위치도 갱신
      applyMutation(mutation)
    } catch (error: any) {
      console.error('위치 저장 실패:', error)
      const errorMessage = error.response?.data?.message || error.message
      alert(errorMessage)
      // 실패 시 원래 위치로 복구
      const origX = computeNodeX(work.startDate)
      event.node.position.x = origX
      event.node.data.originalX = origX
    }
    return
  }

  // 미선택 작업: Y축 위치 저장
  const cfg = chartConfigStore.config
  const rowUnit = cfg.nodeHeight + 2 * cfg.nodePaddingY
  const snappedY = Math.floor(event.node.position.y / rowUnit) * rowUnit
  event.node.position.y = snappedY

  if (snappedY === work.positionY) return

  try {
    await workApi.updateWork(work.workId, {
      positionY: snappedY,
      startDate: work.startDate,
      workLeadTime: work.workLeadTime
    })
    event.node.data.work = { ...work, positionY: snappedY }
  } catch (error: any) {
    console.error('위치 저장 실패:', error)
    const errorMessage = error.response?.data?.message || error.message
    alert(errorMessage)
    event.node.position.y = work.positionY
  }
}

// 리사이즈 드래그 시작
const onResizeStart = (side: 'left' | 'right', e: MouseEvent) => {
  const node = nodes.value.find(n => n.id === `work-${selectedWorkId.value}`)
  const work = node?.data.work as WorkResponse
  if (!node || !work) return
  e.stopPropagation()
  resizing.value = {
    side,
    workId: work.workId,
    startMouseX: e.clientX,
    origStartDate: work.startDate,
    origLeadTime: work.workLeadTime,
    origNodeX: node.position.x,
    origNodeWidth: node.data.computedWidth as number
  }
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
}

// 리사이즈 드래그 중 (날짜 단위 실시간 스냅)
const onResizeMove = (e: MouseEvent) => {
  if (!resizing.value) return
  const r = resizing.value
  const cfg = chartConfigStore.config
  const pixelDelta = e.clientX - r.startMouseX
  const flowDelta = pixelDelta / viewport.value.zoom
  const daysDelta = Math.round(flowDelta / cfg.pixelPerDay)

  const node = nodes.value.find(n => n.id === `work-${r.workId}`)
  if (!node) return

  if (r.side === 'left') {
    const clampedDays = Math.min(daysDelta, r.origLeadTime - 1)
    const newLeadTime = r.origLeadTime - clampedDays
    const newX = r.origNodeX + clampedDays * cfg.pixelPerDay
    const newWidth = computeNodeWidth(newLeadTime)
    node.position.x = newX
    node.style = { ...node.style, width: `${newWidth}px` }
    node.data.computedWidth = newWidth
  } else {
    const clampedDays = Math.max(daysDelta, -(r.origLeadTime - 1))
    const newLeadTime = r.origLeadTime + clampedDays
    const newWidth = computeNodeWidth(newLeadTime)
    node.style = { ...node.style, width: `${newWidth}px` }
    node.data.computedWidth = newWidth
  }
}

// 리사이즈 드래그 종료
const onResizeEnd = async () => {
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
  if (!resizing.value) return

  const r = resizing.value
  const cfg = chartConfigStore.config
  const node = nodes.value.find(n => n.id === `work-${r.workId}`)
  resizing.value = null
  if (!node) return

  let newStartDate = r.origStartDate
  let newLeadTime = r.origLeadTime

  if (r.side === 'left') {
    const movedPixels = node.position.x - r.origNodeX
    const daysMoved = Math.round(movedPixels / cfg.pixelPerDay)
    newLeadTime = r.origLeadTime - daysMoved
    if (daysMoved !== 0) {
      const base = new Date(r.origStartDate)
      base.setHours(0, 0, 0, 0)
      base.setDate(base.getDate() + daysMoved)
      newStartDate = formatLocalDate(base)
    }
  } else {
    const widthDelta = (node.data.computedWidth as number) - r.origNodeWidth
    const daysMoved = Math.round(widthDelta / cfg.pixelPerDay)
    newLeadTime = r.origLeadTime + daysMoved
  }

  // 변경 없으면 복원 후 리턴
  if (newStartDate === r.origStartDate && newLeadTime === r.origLeadTime) {
    node.position.x = r.origNodeX
    node.style = { ...node.style, width: `${r.origNodeWidth}px` }
    node.data.computedWidth = r.origNodeWidth
    return
  }

  try {
    const mutation = await workApi.updateWork(r.workId, {
      startDate: newStartDate,
      workLeadTime: newLeadTime
    })
    workEditForm.value.startDate = newStartDate
    workEditForm.value.workLeadTime = newLeadTime
    applyMutation(mutation)
  } catch (error: any) {
    console.error('리사이즈 실패:', error)
    const errorMessage = error.response?.data?.message || error.message
    alert(errorMessage)
    node.position.x = r.origNodeX
    node.style = { ...node.style, width: `${r.origNodeWidth}px` }
    node.data.computedWidth = r.origNodeWidth
    node.data.originalX = r.origNodeX
  }
}

// 노드 드래그 핸들러 (선택된 작업: X축만 이동, 미선택: Y축만 이동)
const onNodeDrag = (event: { node: Node }) => {
  // 리사이즈 중이면 노드 드래그 차단
  if (resizing.value) {
    event.node.position.x = event.node.data.originalX as number
    event.node.position.y = (event.node.data.work as WorkResponse).positionY
    return
  }

  const originalX = event.node.data.originalX
  const work = event.node.data.work as WorkResponse | undefined
  const isSelectedWork = work && selectedWorkId.value === work.workId

  // 패스관리모드: 모든 노드 Y축 이동 차단
  if (isInPathMode.value) {
    if (work) event.node.position.y = work.positionY
    if (originalX !== undefined) event.node.position.x = originalX
    return
  }

  if (isSelectedWork) {
    // 선택된 작업: Y축 고정, X축 날짜 단위 실시간 스냅
    event.node.position.y = work.positionY
    const cfg = chartConfigStore.config
    const originalX = event.node.data.originalX as number
    const daysDelta = Math.round((event.node.position.x - originalX) / cfg.pixelPerDay)
    event.node.position.x = originalX + daysDelta * cfg.pixelPerDay
  } else {
    // 미선택 작업: X축 잠금 (기존 동작)
    if (originalX !== undefined && event.node.position.x !== originalX) {
      event.node.position.x = originalX
    }
    // Y축 그리드 스냅
    const cfg = chartConfigStore.config
    const rowUnit = cfg.nodeHeight + 2 * cfg.nodePaddingY
    event.node.position.y = Math.floor(event.node.position.y / rowUnit) * rowUnit
  }

  // 드래그 중인 노드에 말풍선이 열려있으면 위치 갱신
  if (work && tooltip.value.visible && tooltip.value.workId === work.workId) {
    tooltip.value.nodeX = event.node.position.x + (event.node.data.computedWidth as number) / 2
    tooltip.value.nodeY = event.node.position.y - 8  // 삼각형 높이만큼 위로
  }
}

const handleVueFlowWheel = (e: WheelEvent) => {
  e.preventDefault()
  if (e.deltaY < 0) {
    zoomIn()
  } else {
    zoomOut()
  }
}

// 키보드 단축키: 1=작업관리모드, 2=패스관리모드
const onKeyDown = (e: KeyboardEvent) => {
  // input, select, textarea 등에서는 무시
  const tag = (e.target as HTMLElement).tagName
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return

  if (e.key === '1') {
    // 작업관리모드
    if (isInPathMode.value) {
      pathMode.value = false
      cancelPathEdit()
      tooltip.value.visible = false
    }
  } else if (e.key === '2') {
    // 패스관리모드
    if (!isInPathMode.value) {
      pathMode.value = true
      clearWorkSelection()
      tooltip.value.visible = false
    }
  }
}

onMounted(async () => {
  await loadCalendarData()
  loadWorkData()
  td.loadReferenceData()
  setupResizeObserver()
  window.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  cleanupResizeObserver()
  window.removeEventListener('keydown', onKeyDown)
})
</script>

<template>
  <div class="h-full">
    <!-- VueFlow 영역 -->
    <div
      ref="containerRef"
      class="relative h-full min-w-0 border border-border rounded-lg overflow-hidden"
      @wheel="handleVueFlowWheel"
      @dblclick="onContainerDblClick"
    >
      <!-- 5단 날짜 헤더 바 -->
      <div
        class="absolute top-0 left-0 right-0 bg-muted/80 border-b border-border z-20 overflow-hidden"
        :style="{ height: `${HEADER_HEIGHT}px` }"
      >
        <div
          class="absolute w-full h-full"
          :style="{ transform: `translateX(${viewport.x}px)` }"
        >
          <!-- Row 1: 년 -->
          <div
            v-for="cell in yearCells"
            :key="`year-${cell.startIndex}`"
            class="absolute flex items-center justify-center text-xs font-medium border border-border bg-muted/60"
            :style="{
              left: `${cell.startIndex * DAY_WIDTH * viewport.zoom}px`,
              width: `${cell.span * DAY_WIDTH * viewport.zoom}px`,
              height: `${ROW_HEIGHT}px`,
              top: '0px'
            }"
          >
            {{ cell.label }}
          </div>

          <!-- Row 2: 월 -->
          <div
            v-for="cell in monthCells"
            :key="`month-${cell.startIndex}`"
            class="absolute flex items-center justify-center text-xs font-medium border border-border"
            :style="{
              left: `${cell.startIndex * DAY_WIDTH * viewport.zoom}px`,
              width: `${cell.span * DAY_WIDTH * viewport.zoom}px`,
              height: `${ROW_HEIGHT}px`,
              top: `${ROW_HEIGHT}px`
            }"
          >
            {{ cell.label }}
          </div>

          <!-- Row 3: 주 -->
          <div
            v-for="cell in weekCells"
            :key="`week-${cell.startIndex}`"
            class="absolute flex items-center justify-center text-xs border border-border"
            :style="{
              left: `${cell.startIndex * DAY_WIDTH * viewport.zoom}px`,
              width: `${cell.span * DAY_WIDTH * viewport.zoom}px`,
              height: `${ROW_HEIGHT}px`,
              top: `${ROW_HEIGHT * 2}px`
            }"
          >
            {{ cell.label }}
          </div>

          <!-- Row 4: 날짜 (일자만) -->
          <div
            v-for="dateInfo in visibleDates"
            :key="`date-${dateInfo.dayIndex}`"
            class="absolute flex items-center justify-center text-xs border-r border-b border-border/50"
            :class="{
              'font-medium': dateInfo.isToday,
              'text-red-600': dateInfo.isHoliday && !dateInfo.isDeactivated
            }"
            :style="{
              left: `${dateInfo.dayIndex * DAY_WIDTH * viewport.zoom}px`,
              width: `${DAY_WIDTH * viewport.zoom}px`,
              height: `${ROW_HEIGHT}px`,
              top: `${ROW_HEIGHT * 3}px`,
              backgroundColor: dateInfo.isToday
                ? 'rgba(59, 130, 246, 0.3)'
                : dateInfo.isDeactivated
                  ? 'rgba(107, 114, 128, 0.5)'
                  : dateInfo.isHoliday
                    ? 'rgba(239, 68, 68, 0.3)'
                    : '#ffffff'
            }"
          >
            {{ dateInfo.dayOfMonth }}
          </div>

          <!-- Row 5: 요일 -->
          <div
            v-for="dateInfo in visibleDates"
            :key="`day-${dateInfo.dayIndex}`"
            class="absolute flex items-center justify-center text-[10px] border-r border-border/50"
            :class="{
              'font-medium': dateInfo.isToday,
              'text-red-600': dateInfo.isHoliday && !dateInfo.isDeactivated
            }"
            :style="{
              left: `${dateInfo.dayIndex * DAY_WIDTH * viewport.zoom}px`,
              width: `${DAY_WIDTH * viewport.zoom}px`,
              height: `${ROW_HEIGHT}px`,
              top: `${ROW_HEIGHT * 4}px`,
              backgroundColor: dateInfo.isToday
                ? 'rgba(59, 130, 246, 0.3)'
                : dateInfo.isDeactivated
                  ? 'rgba(107, 114, 128, 0.5)'
                  : dateInfo.isHoliday
                    ? 'rgba(239, 68, 68, 0.3)'
                    : '#ffffff'
            }"
          >
            {{ dateInfo.dayName }}
          </div>
        </div>
      </div>

      <VueFlow
        v-model:nodes="nodes"
        :edges="styledEdges"
        class="w-full h-full"
        :class="{ 'path-mode': isInPathMode }"
        :style="{ paddingTop: `${HEADER_HEIGHT}px` }"
        fit-view-on-init
        :min-zoom="0.5"
        :zoom-on-scroll="false"
        :zoom-on-double-click="false"
        :disable-keyboard-a11y="true"
        @node-click="onNodeClick"
        @node-double-click="onNodeDoubleClick"
        @node-drag="onNodeDrag"
        @node-drag-stop="onNodeDragStop"
        @pane-click="onPaneClick"
        @edge-click="onEdgeClick"
        @edge-double-click="onEdgeDoubleClick"
        @connect="handleConnect"
      >
        <!-- 세로 줄 패턴 (40px 간격) - 프로젝트 기간 내에서만 -->
        <svg
          style="position: absolute; width: 100%; height: 100%; pointer-events: none; z-index: 0;"
        >
          <defs>
            <pattern id="vertical-lines" x="0" y="0" width="40" height="100" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="0.2" height="100" fill="#999" />
            </pattern>
          </defs>
          <g :transform="`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`">
            <!-- 비활성일 배경 (회색 50%) -->
            <rect
              v-for="dayIndex in deactivatedIndices"
              :key="`deactivated-bg-${dayIndex}`"
              :x="dayIndex * DAY_WIDTH"
              y="-50000"
              :width="DAY_WIDTH"
              height="100000"
              fill="rgba(107, 114, 128, 0.2)"
            />
            <!-- 휴일 배경 (붉은색 30%) -->
            <rect
              v-for="dayIndex in holidayIndices"
              :key="`holiday-bg-${dayIndex}`"
              :x="dayIndex * DAY_WIDTH"
              y="-50000"
              :width="DAY_WIDTH"
              height="100000"
              fill="rgba(239, 68, 68, 0.1)"
            />
            <!-- 오늘 배경 (파란색 30%) -->
            <rect
              v-if="todayInProject !== null"
              :x="todayInProject * DAY_WIDTH"
              y="-50000"
              :width="DAY_WIDTH"
              height="100000"
              fill="rgba(59, 130, 246, 0.3)"
            />
            <!-- 세로선 그리드 -->
            <rect
              :x="projectGridBounds.startX"
              y="-50000"
              :width="projectGridBounds.width"
              height="100000"
              fill="url(#vertical-lines)"
            />
            <!-- 그루핑 박스 (SVG 비인터랙티브 배경만) -->
            <g v-if="!isInPathMode">
              <template v-if="showWorkTypeGroup">
                <template v-for="(box, i) in groupBoxes" :key="`group-wt-svg-${i}`">
                  <rect
                    v-if="box.level === 'workType'"
                    :x="box.x" :y="box.y - HEADER_HEIGHT / viewport.zoom" :width="box.width" :height="box.height"
                    :fill="box.fillColor" :stroke="box.borderColor"
                    stroke-width="1" rx="6" ry="6"
                  />
                </template>
              </template>
              <template v-if="showSubWorkTypeGroup">
                <template v-for="(box, i) in groupBoxes" :key="`group-swt-svg-${i}`">
                  <rect
                    v-if="box.level === 'subWorkType'"
                    :x="box.x" :y="box.y - HEADER_HEIGHT / viewport.zoom" :width="box.width" :height="box.height"
                    :fill="box.fillColor" :stroke="box.borderColor"
                    stroke-width="1" rx="4" ry="4" stroke-dasharray="4 2"
                  />
                </template>
              </template>
            </g>
            <!-- 휴일명/비활성일 사유 세로 텍스트 -->
            <template v-for="dateInfo in allProjectDates" :key="`reason-${dateInfo.dayIndex}`">
              <text
                v-if="dateInfo.holidayName || dateInfo.deactivatedReason"
                :x="dateInfo.dayIndex * DAY_WIDTH + DAY_WIDTH / 2"
                y="0"
                fill="currentColor"
                :fill-opacity="0.3"
                font-size="11"
                text-anchor="middle"
                dominant-baseline="middle"
                style="writing-mode: tb; glyph-orientation-vertical: 0;"
              >
                {{ dateInfo.deactivatedReason || dateInfo.holidayName }}
              </text>
            </template>
          </g>
        </svg>

        <!-- 그루핑 박스 인터랙티브 오버레이 (viewport z:4 위에 배치, pointer-events 전략으로 노드 클릭 투과) -->
        <template v-if="!isInPathMode">
          <template v-for="(box, i) in groupBoxes" :key="`group-overlay-${i}`">
            <div
              v-if="(box.level === 'workType' && showWorkTypeGroup) || (box.level === 'subWorkType' && showSubWorkTypeGroup)"
              class="absolute z-[5]"
              :style="{
                left: `${box.x * viewport.zoom + viewport.x}px`,
                top: `${(box.y - HEADER_HEIGHT / viewport.zoom) * viewport.zoom + viewport.y + HEADER_HEIGHT}px`,
                width: `${box.width * viewport.zoom}px`,
                height: `${box.height * viewport.zoom}px`,
                pointerEvents: 'none',
                borderRadius: box.level === 'workType' ? '6px' : '4px',
              }"
            >
              <!-- 테두리 8px 영역 (상/하/좌/우) — 여기서만 클릭/드래그 캡처 -->
              <div class="absolute top-0 left-0 right-0 h-[8px]" style="pointer-events: auto; cursor: grab"
                @mousedown.stop="startGroupDrag(i, $event)" @click.stop="selectGroup(i, $event)" @dblclick.stop />
              <div class="absolute bottom-0 left-0 right-0 h-[8px]" style="pointer-events: auto; cursor: grab"
                @mousedown.stop="startGroupDrag(i, $event)" @click.stop="selectGroup(i, $event)" @dblclick.stop />
              <div class="absolute top-0 bottom-0 left-0 w-[8px]" style="pointer-events: auto; cursor: grab"
                @mousedown.stop="startGroupDrag(i, $event)" @click.stop="selectGroup(i, $event)" @dblclick.stop />
              <div class="absolute top-0 bottom-0 right-0 w-[8px]" style="pointer-events: auto; cursor: grab"
                @mousedown.stop="startGroupDrag(i, $event)" @click.stop="selectGroup(i, $event)" @dblclick.stop />
              <!-- 라벨 -->
              <span
                class="absolute text-[11px] font-semibold px-1 select-none"
                style="pointer-events: auto; cursor: grab"
                :style="{ color: box.borderColor, top: '2px', left: '4px' }"
                @mousedown.stop="startGroupDrag(i, $event)"
                @click.stop="selectGroup(i, $event)"
                @dblclick.stop
              >{{ box.label }}</span>
              <!-- 선택 border (pointer-events: none) -->
              <div
                v-if="selectedGroupIndex === i"
                class="absolute inset-0"
                :style="{ pointerEvents: 'none', border: '2px solid rgba(59,130,246,0.8)', borderRadius: box.level === 'workType' ? '6px' : '4px' }"
              />
            </div>
          </template>
        </template>

        <!-- 말풍선 - VueFlow 내부에 배치, 뷰포트 반응형 바인딩 -->
        <div
          v-if="tooltip.visible"
          data-tooltip-balloon
          class="absolute z-10"
          :style="{
            left: `${tooltip.nodeX * viewport.zoom + viewport.x}px`,
            top: `${tooltip.nodeY * viewport.zoom + viewport.y}px`,
            transform: `translateX(-50%) translateY(-100%) scale(${viewport.zoom})`,
            transformOrigin: 'bottom center'
          }"
        >
          <div class="px-3 py-2 text-sm bg-popover border border-border rounded-lg shadow-lg space-y-2">
            <div class="absolute left-1/2 -bottom-2 -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-transparent border-t-border"></div>
            <div class="absolute left-1/2 -bottom-[7px] -translate-x-1/2 border-l-[7px] border-r-[7px] border-t-[7px] border-transparent border-t-popover"></div>

            <!-- ID / 작업이름 -->
            <p class="text-xs font-medium">
              <span class="text-muted-foreground">{{ tooltip.workId }}.</span> {{ tooltip.workName }}
            </p>

            <!-- 시작일 (읽기전용) -->
            <p class="text-[11px] text-muted-foreground">시작일: <span class="font-medium text-foreground">{{ tooltip.startDate }}</span></p>

            <!-- 작업기간 (읽기전용) -->
            <p class="text-[11px] text-muted-foreground">작업기간: <span class="font-medium text-foreground">{{ tooltip.workLeadTime }}일</span></p>

            <!-- 완료일 (읽기전용) -->
            <p class="text-[11px] text-muted-foreground">완료일: <span class="font-medium text-foreground">{{ tooltip.completionDate }}</span></p>

            <!-- 선행작업 목록 -->
            <div v-if="tooltipPredecessors.length > 0" class="space-y-1.5 pt-1 border-t border-border">
              <div v-for="(pred, idx) in tooltipPredecessors" :key="`${pred.pathId}-${pred.workId}`" class="space-y-0.5">
                <p class="text-[11px] text-muted-foreground">
                  선행작업{{ idx + 1 }}:
                  <span class="font-medium text-foreground">{{ pred.workId }}. {{ pred.workName }}</span>
                  <span class="ml-1 text-[10px]">({{ pred.pathName }})</span>
                </p>
                <div class="flex items-center gap-1">
                  <Checkbox
                    :model-value="pred.isFollowing"
                    class="h-3.5 w-3.5"
                    @update:model-value="updateEdgeOverlapLocal(pred.pathId, pred.workId, tooltip.workId!, $event ? 0 : null)"
                  />
                  <label class="text-[11px] text-muted-foreground">따라가기</label>
                  <template v-if="pred.isFollowing">
                    <input
                      type="number"
                      :value="pred.lagDays"
                      class="w-12 h-5 text-[11px] text-center rounded border border-border bg-background"
                      @change="updateEdgeOverlapLocal(pred.pathId, pred.workId, tooltip.workId!, Number(($event.target as HTMLInputElement).value))"
                    />
                    <span class="text-[11px] text-muted-foreground">일</span>
                    <span class="text-[11px] font-medium" :class="pred.lagDays < 0 ? 'text-blue-500' : pred.lagDays > 0 ? 'text-orange-500' : 'text-muted-foreground'">
                      {{ pred.lagDays < 0 ? `${Math.abs(pred.lagDays)}일 겹치기` : pred.lagDays === 0 ? '다음날' : `${pred.lagDays}일 벌리기` }}
                    </span>
                  </template>
                  <button
                    type="button"
                    class="ml-auto px-1.5 py-0.5 text-[10px] font-medium rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                    @click="updateEdgeOverlap(pred.pathId, pred.workId, tooltip.workId!, pred.isFollowing ? pred.lagDays : null)"
                  >
                    저장
                  </button>
                </div>
              </div>
            </div>

            <!-- 휴일 작업 여부 -->
            <div class="flex rounded-md border border-border overflow-hidden">
              <button
                type="button"
                class="flex-1 py-1 text-xs font-medium transition-colors"
                :class="tooltip.isWorkingOnHoliday ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'"
                @click="updateTooltipWork({ isWorkingOnHoliday: true })"
              >
                휴일 작업
              </button>
              <button
                type="button"
                class="flex-1 py-1 text-xs font-medium transition-colors border-l border-border"
                :class="!tooltip.isWorkingOnHoliday ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'"
                @click="updateTooltipWork({ isWorkingOnHoliday: false })"
              >
                휴일 휴무
              </button>
            </div>

            <!-- 삭제 -->
            <button
              type="button"
              class="w-full py-1 text-xs font-medium text-destructive hover:bg-destructive/10 rounded border border-destructive/30 transition-colors"
              @click="openDeleteDialog('work')"
            >
              삭제
            </button>
          </div>
        </div>

        <!-- 리사이즈 핸들 (모서리 기준 ◀ ▶ 각각 띄움, 노드 비율 고정) -->
        <template v-if="resizeHandles && !isInPathMode">
          <!-- 왼쪽 모서리: ◀ (바깥쪽) -->
          <div
            class="absolute z-20 cursor-col-resize"
            :style="{
              left: `${(resizeHandles.left.x - 3) * viewport.zoom + viewport.x}px`,
              top: `${resizeHandles.left.y * viewport.zoom + viewport.y}px`,
              transform: 'translate(-100%, -50%)'
            }"
            @mousedown.stop="onResizeStart('left', $event)"
          >
            <div :style="{
              borderTop: `${5 * viewport.zoom}px solid transparent`,
              borderBottom: `${5 * viewport.zoom}px solid transparent`,
              borderRight: `${5 * viewport.zoom}px solid black`
            }" />
          </div>
          <!-- 왼쪽 모서리: ▶ (안쪽) -->
          <div
            class="absolute z-20 cursor-col-resize"
            :style="{
              left: `${(resizeHandles.left.x + 3) * viewport.zoom + viewport.x}px`,
              top: `${resizeHandles.left.y * viewport.zoom + viewport.y}px`,
              transform: 'translateY(-50%)'
            }"
            @mousedown.stop="onResizeStart('left', $event)"
          >
            <div :style="{
              borderTop: `${5 * viewport.zoom}px solid transparent`,
              borderBottom: `${5 * viewport.zoom}px solid transparent`,
              borderLeft: `${5 * viewport.zoom}px solid black`
            }" />
          </div>
          <!-- 오른쪽 모서리: ◀ (안쪽) -->
          <div
            class="absolute z-20 cursor-col-resize"
            :style="{
              left: `${(resizeHandles.right.x - 3) * viewport.zoom + viewport.x}px`,
              top: `${resizeHandles.right.y * viewport.zoom + viewport.y}px`,
              transform: 'translate(-100%, -50%)'
            }"
            @mousedown.stop="onResizeStart('right', $event)"
          >
            <div :style="{
              borderTop: `${5 * viewport.zoom}px solid transparent`,
              borderBottom: `${5 * viewport.zoom}px solid transparent`,
              borderRight: `${5 * viewport.zoom}px solid black`
            }" />
          </div>
          <!-- 오른쪽 모서리: ▶ (바깥쪽) -->
          <div
            class="absolute z-20 cursor-col-resize"
            :style="{
              left: `${(resizeHandles.right.x + 3) * viewport.zoom + viewport.x}px`,
              top: `${resizeHandles.right.y * viewport.zoom + viewport.y}px`,
              transform: 'translateY(-50%)'
            }"
            @mousedown.stop="onResizeStart('right', $event)"
          >
            <div :style="{
              borderTop: `${5 * viewport.zoom}px solid transparent`,
              borderBottom: `${5 * viewport.zoom}px solid transparent`,
              borderLeft: `${5 * viewport.zoom}px solid black`
            }" />
          </div>
        </template>

        <!-- 패스 편집 모드: 삭제 버튼들 -->
        <template v-if="isPathEditMode">
          <button
            v-for="btn in deleteButtonNodes"
            :key="`delete-${btn.workId}`"
            class="absolute z-20 w-5 h-5 flex items-center justify-center
                   bg-red-500 hover:bg-red-600 text-white rounded-full
                   shadow-md transition-colors cursor-pointer"
            :style="{
              left: `${btn.x * viewport.zoom + viewport.x}px`,
              top: `${btn.y * viewport.zoom + viewport.y}px`,
              transform: `translate(-50%, -50%) scale(${Math.min(viewport.zoom, 1)})`
            }"
            @click="removeNodeFromPath(btn.workId); savePathEdges()"
          >
            <span class="text-xs font-bold">×</span>
          </button>
        </template>

        <Controls position="bottom-right" />
      </VueFlow>

      <!-- 그루핑 박스 토글 (우측 하단) -->
      <div v-if="!isInPathMode" data-group-toggle class="absolute bottom-4 right-4 z-30 flex flex-col gap-1 bg-background/80 backdrop-blur-sm rounded-md border border-border px-2 py-1.5">
        <label class="flex items-center gap-1.5 cursor-pointer">
          <Checkbox
            :model-value="showWorkTypeGroup"
            class="h-3.5 w-3.5"
            @update:model-value="showWorkTypeGroup = !!$event; if ($event) showSubWorkTypeGroup = false"
          />
          <span class="text-[11px] text-muted-foreground">공종 그룹</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <Checkbox
            :model-value="showSubWorkTypeGroup"
            class="h-3.5 w-3.5"
            @update:model-value="showSubWorkTypeGroup = !!$event; if ($event) showWorkTypeGroup = false"
          />
          <span class="text-[11px] text-muted-foreground">세부공종 그룹</span>
        </label>
      </div>

      <!-- 모드 인디케이터 (좌측 하단) -->
      <div class="absolute bottom-4 left-4 z-30 flex items-center gap-3">
        <button
          class="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium border transition-colors"
          :class="!isInPathMode
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-background text-muted-foreground border-border hover:bg-muted'"
          @click="pathMode = false; cancelPathEdit(); tooltip.visible = false"
        >
          <kbd class="px-1.5 py-0.5 rounded border text-xs font-mono"
            :class="!isInPathMode ? 'border-primary-foreground/30' : 'border-border'"
          >1</kbd>
          작업관리
        </button>
        <button
          class="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium border transition-colors"
          :class="isInPathMode
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-background text-muted-foreground border-border hover:bg-muted'"
          @click="pathMode = true; clearWorkSelection(); tooltip.visible = false"
        >
          <kbd class="px-1.5 py-0.5 rounded border text-xs font-mono"
            :class="isInPathMode ? 'border-primary-foreground/30' : 'border-border'"
          >2</kbd>
          패스관리
        </button>
      </div>


    </div>

  </div>

  <!-- 패스 편집 다이얼로그 (중앙) -->
  <Dialog v-model:open="showPathDialog">
    <DialogContent class="max-w-xs">
      <DialogHeader>
        <DialogTitle>패스 편집</DialogTitle>
      </DialogHeader>

      <div class="space-y-3">
        <!-- 패스명 -->
        <div class="space-y-1">
          <label class="text-[11px] text-muted-foreground">패스명</label>
          <input
            v-model="editPathName"
            class="w-full h-8 text-sm rounded border border-border bg-background px-2"
          />
        </div>

        <!-- 색상 -->
        <div class="space-y-1">
          <label class="text-[11px] text-muted-foreground">색상</label>
          <div class="flex items-center gap-1.5">
            <input
              type="color"
              v-model="editPathColor"
              class="h-8 w-8 rounded border border-border cursor-pointer p-0.5"
            />
            <input
              v-model="editPathColor"
              class="flex-1 h-8 text-sm rounded border border-border bg-background px-2 font-mono"
            />
          </div>
        </div>

        <!-- 주공정 여부 -->
        <div class="flex rounded-md border border-border overflow-hidden">
          <button
            type="button"
            class="flex-1 py-1.5 text-xs font-medium transition-colors"
            :class="editPathCritical ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'"
            @click="editPathCritical = true"
          >
            주공정
          </button>
          <button
            type="button"
            class="flex-1 py-1.5 text-xs font-medium transition-colors border-l border-border"
            :class="!editPathCritical ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'"
            @click="editPathCritical = false"
          >
            일반
          </button>
        </div>
      </div>

      <DialogFooter class="flex-col gap-1.5 sm:flex-col">
        <Button
          size="sm"
          class="w-full"
          :disabled="isSavingPath"
          @click="savePathChanges(); showPathDialog = false"
        >
          {{ isSavingPath ? '저장 중...' : '저장' }}
        </Button>
        <button
          type="button"
          class="w-full py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded border border-destructive/30 transition-colors"
          @click="openDeleteDialog('path')"
        >
          삭제
        </button>
        <button
          type="button"
          class="w-full py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950 rounded border border-blue-300 dark:border-blue-700 transition-colors"
          @click="optimizeTarget = 'current'; showOptimizeDialog = true"
        >
          현재 패스 최적화
        </button>
        <button
          type="button"
          class="w-full py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950 rounded border border-blue-300 dark:border-blue-700 transition-colors"
          @click="optimizeTarget = 'all'; showOptimizeDialog = true"
        >
          전체 경로 최적화
        </button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- 삭제 확인 다이얼로그 -->
  <AlertDialog v-model:open="showDeleteDialog">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>삭제 확인</AlertDialogTitle>
        <AlertDialogDescription>
          정말 삭제하시겠습니까?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="isDeleting">취소</AlertDialogCancel>
        <AlertDialogAction :disabled="isDeleting" @click="executeDelete">
          {{ isDeleting ? '삭제 중...' : '삭제' }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <!-- 경로 최적화 확인 다이얼로그 -->
  <AlertDialog v-model:open="showOptimizeDialog">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>경로 최적화</AlertDialogTitle>
        <AlertDialogDescription>
          {{ optimizeTarget === 'current'
            ? '현재 패스에 포함된 작업을 선행작업 완료일 기준으로 최대한 앞으로 당깁니다.'
            : '모든 패스의 작업을 선행작업 완료일 기준으로 최대한 앞으로 당깁니다.' }}
          <br />
          정말 최적화를 진행하시겠습니까?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel :disabled="isOptimizing">취소</AlertDialogCancel>
        <AlertDialogAction :disabled="isOptimizing" @click="executeOptimize">
          {{ isOptimizing ? '최적화 중...' : '최적화' }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>

  <!-- 작업 생성/편집 다이얼로그 -->
  <Dialog v-model:open="td.showDialog">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>{{ td.isCreateMode ? '작업 생성' : '작업 수정' }}</DialogTitle>
      </DialogHeader>

      <div class="space-y-4">
        <!-- 시작일, 작업기간, 휴일 작업 (수정 모드만) -->
        <template v-if="!td.isCreateMode">
          <div class="space-y-1.5">
            <label class="text-sm font-medium">시작일</label>
            <input
              type="date"
              :value="td.editStartDate"
              class="w-full h-8 text-sm rounded-md border border-border bg-background px-3"
              @change="td.editStartDate = ($event.target as HTMLInputElement).value"
            />
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium">작업기간</label>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="h-8 w-8 flex items-center justify-center rounded-md border border-border text-sm font-bold hover:bg-muted transition-colors"
                :disabled="td.editWorkLeadTime <= 1"
                @click="td.editWorkLeadTime = Math.max(1, td.editWorkLeadTime - 1)"
              >−</button>
              <span class="h-8 flex-1 flex items-center justify-center text-sm font-medium rounded-md border border-border bg-background">{{ td.editWorkLeadTime }}일</span>
              <button
                type="button"
                class="h-8 w-8 flex items-center justify-center rounded-md border border-border text-sm font-bold hover:bg-muted transition-colors"
                @click="td.editWorkLeadTime = td.editWorkLeadTime + 1"
              >+</button>
            </div>
          </div>

        </template>

        <!-- 공종 (Division → WorkType → SubWorkType) -->
        <div class="space-y-1.5">
          <label class="text-sm font-medium">공종</label>
          <Select :model-value="td.editDivisionId" @update:model-value="td.handleTooltipDivisionChange($event)">
            <SelectTrigger class="h-8 text-sm">
              <SelectValue placeholder="분류 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="d in td.divisions" :key="d.id" :value="String(d.id)">{{ d.name }}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            :model-value="td.editWorkTypeId"
            :disabled="!td.editDivisionId || td.isLoadingTooltipWorkTypes"
            @update:model-value="td.handleTooltipWorkTypeChange($event)"
          >
            <SelectTrigger class="h-8 text-sm">
              <SelectValue :placeholder="td.isLoadingTooltipWorkTypes ? '로딩...' : '공종 선택'" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="w in td.tooltipWorkTypes" :key="w.id" :value="String(w.id)">{{ w.name }}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            :model-value="td.editSubWorkTypeId"
            :disabled="!td.editWorkTypeId || td.isLoadingTooltipSubWorkTypes"
            @update:model-value="td.handleTooltipSubWorkTypeChange($event)"
          >
            <SelectTrigger class="h-8 text-sm">
              <SelectValue :placeholder="td.isLoadingTooltipSubWorkTypes ? '로딩...' : '세부공종 선택'" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="s in td.tooltipSubWorkTypes" :key="s.id" :value="String(s.id)">{{ s.name }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- 위치 (Zone, Floor, Section, Usage) — 다중 선택 -->
        <div class="space-y-1.5">
          <label class="text-sm font-medium">위치</label>
          <div class="grid grid-cols-2 gap-3">
            <div v-if="td.zones.length" class="space-y-1">
              <span class="text-xs text-muted-foreground">구역</span>
              <div class="flex flex-wrap gap-x-3 gap-y-1">
                <label v-for="z in td.zones" :key="z.id" class="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    :model-value="td.editZoneIds.includes(z.id)"
                    class="h-4 w-4"
                    @update:model-value="td.toggleZone(z.id)"
                  />
                  {{ z.name }}
                </label>
              </div>
            </div>
            <div v-if="td.floors.length" class="space-y-1">
              <span class="text-xs text-muted-foreground">층</span>
              <div class="flex flex-wrap gap-x-3 gap-y-1">
                <label v-for="f in td.floors" :key="f.id" class="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    :model-value="td.editFloorIds.includes(f.id)"
                    class="h-4 w-4"
                    @update:model-value="td.toggleFloor(f.id)"
                  />
                  {{ f.name }}
                </label>
              </div>
            </div>
            <div v-if="td.sections.length" class="space-y-1">
              <span class="text-xs text-muted-foreground">구간</span>
              <div class="flex flex-wrap gap-x-3 gap-y-1">
                <label v-for="s in td.sections" :key="s.id" class="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    :model-value="td.editSectionIds.includes(s.id)"
                    class="h-4 w-4"
                    @update:model-value="td.toggleSection(s.id)"
                  />
                  {{ s.name }}
                </label>
              </div>
            </div>
            <div v-if="td.usages.length" class="space-y-1">
              <span class="text-xs text-muted-foreground">용도</span>
              <div class="flex flex-wrap gap-x-3 gap-y-1">
                <label v-for="u in td.usages" :key="u.id" class="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    :model-value="td.editUsageIds.includes(u.id)"
                    class="h-4 w-4"
                    @update:model-value="td.toggleUsage(u.id)"
                  />
                  {{ u.name }}
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- 부재 타입 -->
        <div v-if="td.componentTypes.length" class="space-y-1.5">
          <label class="text-sm font-medium">부재</label>
          <div class="flex flex-wrap gap-x-4 gap-y-1.5">
            <label v-for="ct in td.componentTypes" :key="ct.id" class="flex items-center gap-1.5 text-sm cursor-pointer">
              <Checkbox
                :model-value="td.editComponentTypeIds.includes(ct.id)"
                class="h-4 w-4"
                @update:model-value="td.toggleComponentType(ct.id)"
              />
              {{ ct.name }}
            </label>
          </div>
        </div>

        <!-- 비고 -->
        <div class="space-y-1.5">
          <label class="text-sm font-medium">비고</label>
          <textarea
            v-model="td.editAnnotation"
            class="w-full text-sm rounded-md border border-border bg-background px-3 py-2 min-h-[60px] resize-none"
            placeholder="비고 입력"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="td.closeDialog()">취소</Button>
        <Button :disabled="td.isSavingDetails" @click="handleWorkEditSubmit">
          {{ td.isSavingDetails ? '저장 중...' : '저장' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
/* 기본적으로 연결 핸들 숨김 */
:deep(.vue-flow__handle) {
  opacity: 0;
  pointer-events: none;
  transition: all 0.2s ease;
}

/* 패스 관리 모드에서만 핸들 표시 및 크기 증가 */
.path-mode :deep(.vue-flow__handle) {
  opacity: 1;
  pointer-events: auto;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background-color: #1f2937;
  border: 1px solid white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.path-mode :deep(.vue-flow__handle:hover) {
  width: 12px;
  height: 12px;
  background-color: #111827;
}
</style>
