<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted, markRaw } from 'vue'
import { VueFlow, useVueFlow, type Node, type Edge } from '@vue-flow/core'
import { Controls } from '@vue-flow/controls'
import { Button } from '@/shared/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Checkbox } from '@/shared/ui/checkbox'
import {
  workApi,
  type WorkResponse,
  type MutationResponse,
  type UpdateWorkPayload,
} from '@/shared/network-core/apis/work'
import { workPathApi, type PathResponse } from '@/shared/network-core/apis/workPath'
import { useProjectStore } from '@/app/context/stores/project'
import { useCalendarStore } from '@/app/context/stores/calendarStore'
import {
  useChartConfigStore,
  CHART_CONFIG,
} from '@/features/schedule/schedule-2d/view-model/chartConfigStore'
import {
  workToNode,
  computeNodeX,
  dayIndexToDate,
} from '@/features/schedule/schedule-2d/use-cases/nodeConfig'
import {
  computeRowLayout,
  LEFT_HEADER_WIDTH,
  type RowLayout,
  type RefWorkType,
} from '@/features/schedule/schedule-2d/use-cases/rowLayout'
import { referenceApi } from '@/shared/network-core/apis/reference'
import WorkNode from './WorkNode.vue'
import LeftHeader from './LeftHeader.vue'
import { appConfig } from '@/app/bootstrap/config'
import { analyticsClient } from '@/shared/analytics/analyticsClient'

// Composables
import {
  useDateHeader,
  ROW_HEIGHT,
  HEADER_HEIGHT,
} from '@/features/schedule/schedule-2d/view-model/useDateHeader'
import { usePathEditor } from '@/features/schedule/schedule-2d/view-model/usePathEditor'
import { useWorkEditor } from '@/features/schedule/schedule-2d/view-model/useWorkEditor'
import { useWorkTooltipData } from '@/features/schedule/schedule-2d/view-model/useWorkTooltipData'

const emit = defineEmits<{
  'works-loaded': [works: WorkResponse[]]
}>()

// VueFlow
const nodes = ref<Node[]>([])
const edges = ref<Edge[]>([])
const { zoomIn, zoomOut, viewport, setViewport } = useVueFlow()

// 패스 관련 상태
const paths = ref<PathResponse[]>([])

// workType → 팔레트 인덱스 맵 (nodes와 독립적으로 관리, groupBoxes와 공유)
const workTypePaletteMap = ref<Map<string, number>>(new Map())
const isLoadingWorks = ref(false)

// Reference tree (API 순서 보존)
const refTree = ref<RefWorkType[]>([])

const loadRefTree = async () => {
  try {
    const divisions = await referenceApi.getDivisionList()
    const tree: RefWorkType[] = []
    for (const div of divisions) {
      const workTypes = await referenceApi.getWorkTypeList(div.id)
      for (const wt of workTypes) {
        const subs = await referenceApi.getSubWorkTypeList(wt.id)
        tree.push({ name: wt.name, subWorkTypes: subs.map((s) => ({ id: s.id, name: s.name })) })
      }
    }
    refTree.value = tree
  } catch (error) {
    console.error('Reference tree 로드 실패:', error)
  }
}

// 행 배치용 ROW_UNIT (nodeHeight + 2 * nodePaddingY)
const ROW_UNIT = CHART_CONFIG.nodeHeight + 2 * CHART_CONFIG.nodePaddingY
// 노드를 행 내 수직 중앙에 배치하기 위한 오프셋
const NODE_OFFSET_Y = CHART_CONFIG.nodePaddingY

// rowLayout computed
const rowLayout = computed<RowLayout>(() => {
  const works = nodes.value
    .filter((n) => n.id.startsWith('work-'))
    .map((n) => n.data.work as WorkResponse)
  return computeRowLayout(works, refTree.value.length > 0 ? refTree.value : undefined)
})

// rowLayout 변경 시 노드 Y 자동 갱신
watch(rowLayout, (layout) => {
  nodes.value.forEach((n) => {
    if (!n.id.startsWith('work-')) return
    const work = n.data.work as WorkResponse
    const row = layout.workRowMap.get(work.workId)
    if (row !== undefined) n.position.y = row * ROW_UNIT + NODE_OFFSET_Y
  })
})

// 그루핑 박스 표시 상태
const showWorkTypeGroup = ref(false)
const showSubWorkTypeGroup = ref(false)

// 그루핑 박스 선택
const selectedGroupIndex = ref<number | null>(null)

const selectGroup = (index: number, event: MouseEvent) => {
  event.stopPropagation()
  selectedGroupIndex.value = index
}

// 화면 좌표 → flow 좌표 변환 후 그룹박스 히트 테스트 (공통 헬퍼)
const hitTestGroupBox = (event: MouseEvent): number => {
  if (isPathEditMode.value) return -1
  if (!showWorkTypeGroup.value && !showSubWorkTypeGroup.value) return -1
  const container = containerRef.value
  if (!container) return -1
  const rect = container.getBoundingClientRect()
  const flowX =
    (event.clientX - rect.left - LEFT_HEADER_WIDTH - viewport.value.x) / viewport.value.zoom
  const flowY = (event.clientY - rect.top - HEADER_HEIGHT - viewport.value.y) / viewport.value.zoom
  return groupBoxes.value.findIndex((box) => {
    const visible =
      (box.level === 'workType' && showWorkTypeGroup.value) ||
      (box.level === 'subWorkType' && showSubWorkTypeGroup.value)
    return (
      visible &&
      flowX >= box.x &&
      flowX <= box.x + box.width &&
      flowY >= box.y &&
      flowY <= box.y + box.height
    )
  })
}

const getGroupLabelOffset = (box: {
  x: number
  y: number
  width: number
  height: number
}): { top: string; left: string } => {
  const zoom = viewport.value.zoom
  const overlayLeft = box.x * zoom + viewport.value.x
  const overlayTop = box.y * zoom + viewport.value.y
  const overlayWidth = box.width * zoom
  const overlayHeight = box.height * zoom

  let labelLeft = 4
  if (overlayLeft < 0) {
    labelLeft = Math.max(4, -overlayLeft + 4)
  }

  let labelTop = 2
  if (overlayTop < 0) {
    labelTop = Math.max(2, -overlayTop + 2)
  }

  // 라벨이 박스 밖으로 넘어가지 않도록 clamp
  labelLeft = Math.min(labelLeft, Math.max(0, overlayWidth - 80))
  labelTop = Math.min(labelTop, Math.max(0, overlayHeight - 16))

  return { top: `${labelTop}px`, left: `${labelLeft}px` }
}

// 그룹 드래그 비활성화 (Y축이 rowLayout 기반이므로)
const startGroupDrag = (_index: number, event: MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
  selectedGroupIndex.value = _index
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
  const action = optimizeTarget.value === 'current' ? 'optimize_current_path' : 'optimize_all_paths'
  try {
    const mutation =
      optimizeTarget.value === 'current'
        ? await workPathApi.optimizePath(selectedPathId.value!)
        : await workPathApi.optimizePaths()
    applyMutation(mutation)
    showOptimizeDialog.value = false
    showPathDialog.value = false
    analyticsClient.trackAction('schedule_2d', action, 'success')
  } catch (error: unknown) {
    console.error('경로 최적화 실패:', error)
    analyticsClient.trackAction('schedule_2d', action, 'fail')
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  } finally {
    isOptimizing.value = false
  }
}

// 말풍선 상태 - flow 좌표 저장
const tooltip = ref<{
  visible: boolean
  nodeX: number // flow 좌표 (노드 중앙 X)
  nodeY: number // flow 좌표 (노드 상단 Y)
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
  isWorkingOnHoliday: true,
})

// 선택된 노드의 선행작업 목록 (모든 패스에서)
const tooltipPredecessors = computed(() => {
  const wId = tooltip.value.workId
  if (!wId) return []

  return paths.value.flatMap((p) => {
    const predecessorEdges = p.edges.filter((e) => e.targetWorkId === wId)
    return predecessorEdges.map((e) => {
      const node = nodes.value.find((n) => n.id === `work-${e.sourceWorkId}`)
      const work = node?.data.work as WorkResponse | undefined
      return {
        pathId: p.workPathId,
        pathName: p.workPathName,
        pathColor: p.workPathColor,
        workId: e.sourceWorkId,
        workName: work?.workName || `Work ${e.sourceWorkId}`,
        lagDays: e.lagDays ?? 0,
        isFollowing: e.lagDays !== undefined && e.lagDays !== null,
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
  {
    bg: 'rgba(59, 130, 246, 0.06)',
    border: 'rgba(59, 130, 246, 0.25)',
    subBg: 'rgba(59, 130, 246, 0.08)',
    subBorder: 'rgba(59, 130, 246, 0.35)',
    nodeBg: '#e8f0fe',
  },
  {
    bg: 'rgba(16, 185, 129, 0.06)',
    border: 'rgba(16, 185, 129, 0.25)',
    subBg: 'rgba(16, 185, 129, 0.08)',
    subBorder: 'rgba(16, 185, 129, 0.35)',
    nodeBg: '#e2f5ec',
  },
  {
    bg: 'rgba(245, 158, 11, 0.06)',
    border: 'rgba(245, 158, 11, 0.25)',
    subBg: 'rgba(245, 158, 11, 0.08)',
    subBorder: 'rgba(245, 158, 11, 0.35)',
    nodeBg: '#fdf5dc',
  },
  {
    bg: 'rgba(168, 85, 247, 0.06)',
    border: 'rgba(168, 85, 247, 0.25)',
    subBg: 'rgba(168, 85, 247, 0.08)',
    subBorder: 'rgba(168, 85, 247, 0.35)',
    nodeBg: '#f0edfe',
  },
  {
    bg: 'rgba(236, 72, 153, 0.06)',
    border: 'rgba(236, 72, 153, 0.25)',
    subBg: 'rgba(236, 72, 153, 0.08)',
    subBorder: 'rgba(236, 72, 153, 0.35)',
    nodeBg: '#fceef6',
  },
  {
    bg: 'rgba(6, 182, 212, 0.06)',
    border: 'rgba(6, 182, 212, 0.25)',
    subBg: 'rgba(6, 182, 212, 0.08)',
    subBorder: 'rgba(6, 182, 212, 0.35)',
    nodeBg: '#e4f8fb',
  },
]

function calcBBox(nodeList: Node[]) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  nodeList.forEach((n) => {
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
  const workNodes = nodes.value.filter((n) => n.id.startsWith('work-'))
  if (workNodes.length === 0) return []

  const boxes: GroupBox[] = []

  // workType별 그룹핑
  const byWorkType = new Map<string, Node[]>()
  workNodes.forEach((n) => {
    const work = n.data.work as WorkResponse
    const key = work.workType || '미분류'
    if (!byWorkType.has(key)) byWorkType.set(key, [])
    byWorkType.get(key)!.push(n)
  })

  byWorkType.forEach((typeNodes, workType) => {
    const typeIdx = workTypePaletteMap.value.get(workType) ?? 0
    const palette = GROUP_PALETTE[typeIdx % GROUP_PALETTE.length]!

    // subWorkType별 분류
    const bySubType = new Map<string, Node[]>()
    typeNodes.forEach((n) => {
      const work = n.data.work as WorkResponse
      const key = work.subWorkType || '미분류'
      if (!bySubType.has(key)) bySubType.set(key, [])
      bySubType.get(key)!.push(n)
    })

    // workType 박스 (항상 생성)
    const wtPadding = 15
    const { minX, minY, maxX, maxY } = calcBBox(typeNodes)
    boxes.push({
      level: 'workType',
      label: workType,
      x: minX - wtPadding,
      y: minY - wtPadding,
      width: maxX - minX + wtPadding * 2,
      height: maxY - minY + wtPadding * 2,
      fillColor: palette.bg,
      borderColor: palette.border,
    })

    // subWorkType 박스들
    const subPadding = 8
    bySubType.forEach((subNodes, subType) => {
      const sb = calcBBox(subNodes)
      boxes.push({
        level: 'subWorkType',
        label: subType,
        x: sb.minX - subPadding,
        y: sb.minY - subPadding,
        width: sb.maxX - sb.minX + subPadding * 2,
        height: sb.maxY - sb.minY + subPadding * 2,
        fillColor: palette.subBg,
        borderColor: palette.subBorder,
      })
    })
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
const updateEdgeOverlap = async (
  pathId: number,
  _sourceWorkId: number,
  targetWorkId: number,
  days: number | null,
) => {
  await updateLagDays(pathId, targetWorkId, days)
  tooltip.value.visible = false
}

// lagDays 로컬 업데이트 (API 호출 없이 computed 재계산용)
const updateEdgeOverlapLocal = (
  pathId: number,
  sourceWorkId: number,
  targetWorkId: number,
  days: number | null,
) => {
  const path = paths.value.find((p) => p.workPathId === pathId)
  if (!path) return
  const idx = path.edges.findIndex(
    (e) => e.sourceWorkId === sourceWorkId && e.targetWorkId === targetWorkId,
  )
  if (idx === -1) return
  path.edges[idx] = { ...path.edges[idx]!, lagDays: days }
  paths.value = [...paths.value]

  // 엣지의 isFollowing 동기화
  const edgeId = `edge-${pathId}-${sourceWorkId}-${targetWorkId}`
  const edgeIdx = edges.value.findIndex((e) => e.id === edgeId)
  if (edgeIdx !== -1) {
    const e = edges.value[edgeIdx]!
    edges.value[edgeIdx] = { ...e, data: { ...e.data, isFollowing: days !== undefined && days !== null } }
    edges.value = [...edges.value]
  }
}

// 작업 및 패스 데이터 로드
const loadWorkData = async () => {
  isLoadingWorks.value = true
  try {
    const [works, pathList] = await Promise.all([workApi.getWorkList(), workPathApi.getPathList()])

    const layout = computeRowLayout(works, refTree.value.length > 0 ? refTree.value : undefined)

    // workType → 팔레트 인덱스 맵 구축 (rowLayout.sections 순서 = LeftHeader 순서)
    const paletteMap = new Map<string, number>()
    layout.sections.forEach((section, idx) => {
      paletteMap.set(section.workType, idx)
    })
    workTypePaletteMap.value = paletteMap
    nodes.value = works.map((w) => {
      const y = (layout.workRowMap.get(w.workId) ?? 0) * ROW_UNIT + NODE_OFFSET_Y
      const node = workToNode(w, y)
      const idx = paletteMap.get(w.workType || '미분류')
      if (idx !== undefined) {
        const palette = GROUP_PALETTE[idx % GROUP_PALETTE.length]!
        ;(node.style as Record<string, string>).backgroundColor = palette.nodeBg
      }
      return node
    })
    paths.value = pathList

    // 같은 source-target 쌍을 가진 엣지들에 offset 적용
    const edgePairCount = new Map<string, number>()

    edges.value = pathList.flatMap((path) =>
      path.edges.map((edge) => {
        const pairKey = `${edge.sourceWorkId}-${edge.targetWorkId}`
        const currentCount = edgePairCount.get(pairKey) || 0
        edgePairCount.set(pairKey, currentCount + 1)

        // offset 계산: 0, 3, -3, 6, -6, ... (X, Y 동일)
        const offsetIndex = currentCount
        const offset =
          offsetIndex === 0 ? 0 : (offsetIndex % 2 === 1 ? 1 : -1) * Math.ceil(offsetIndex / 2) * 3

        return {
          id: `edge-${path.workPathId}-${edge.sourceWorkId}-${edge.targetWorkId}`,
          source: `work-${edge.sourceWorkId}`,
          target: `work-${edge.targetWorkId}`,
          type: 'smoothstep',
          pathOptions: { borderRadius: 20, offset: 15 },
          style: { stroke: path.workPathColor },
          data: { pathId: path.workPathId, pathName: path.workPathName, offset, isFollowing: edge.lagDays !== undefined && edge.lagDays !== null },
        }
      }),
    )

    emit('works-loaded', works)

    // 말풍선이 열려있으면 갱신된 노드 데이터로 동기화
    if (tooltip.value.visible && tooltip.value.workId) {
      const updatedNode = nodes.value.find((n) => n.id === `work-${tooltip.value.workId}`)
      const updatedWork = updatedNode?.data.work as WorkResponse | undefined
      if (updatedNode && updatedWork) {
        tooltip.value.workName = updatedWork.workName
        tooltip.value.startDate = updatedWork.startDate
        tooltip.value.workLeadTime = updatedWork.workLeadTime
        tooltip.value.completionDate = updatedWork.completionDate
        tooltip.value.isWorkingOnHoliday = updatedWork.isWorkingOnHoliday
        tooltip.value.nodeX =
          updatedNode.position.x + (updatedNode.data.computedWidth as number) / 2
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
  // 1) updatedWorks 반영 → 기존 노드 업데이트 (Y는 rowLayout 기반 재계산)
  if (mutation.updatedWorks.length > 0) {
    const updateMap = new Map(mutation.updatedWorks.map((w) => [w.workId, w]))
    nodes.value = nodes.value.map((n) => {
      const work = updateMap.get((n.data.work as WorkResponse).workId)
      if (!work) return n
      const updated = workToNode(work)
      return { ...updated, position: { ...updated.position, y: n.position.y } }
    })
    // rowLayout 기반으로 Y 재배치
    const layout = rowLayout.value
    nodes.value.forEach((n) => {
      const work = n.data.work as WorkResponse
      const row = layout.workRowMap.get(work.workId)
      if (row !== undefined) n.position.y = row * ROW_UNIT + NODE_OFFSET_Y
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
        const node = nodes.value.find((n) => n.id === `work-${w.workId}`)
        if (node) {
          tooltip.value.nodeX = node.position.x + (node.data.computedWidth as number) / 2
          tooltip.value.nodeY = node.position.y - 8
        }
      }
    }
    emit(
      'works-loaded',
      nodes.value.map((n) => n.data.work as WorkResponse),
    )
  }

  // 2) updatedWorkPaths 반영 → 해당 path의 edges 재생성
  if (mutation.updatedWorkPaths.length > 0) {
    const updatedPathIds = new Set(mutation.updatedWorkPaths.map((p) => p.workPathId))
    // paths 배열 갱신 (기존 path를 새 데이터로 교체)
    const pathMap = new Map(mutation.updatedWorkPaths.map((p) => [p.workPathId, p]))
    paths.value = paths.value.map((p) => pathMap.get(p.workPathId) ?? p)
    // 해당 path의 기존 엣지 제거 후 새로 생성
    edges.value = edges.value.filter((e) => !updatedPathIds.has(e.data?.pathId))
    // 새 엣지 추가 (offset 계산 포함)
    const edgePairCount = new Map<string, number>()
    // 기존 엣지에서 pairCount 집계
    edges.value.forEach((e) => {
      const key = `${e.source}-${e.target}`
      edgePairCount.set(key, (edgePairCount.get(key) || 0) + 1)
    })
    const newEdges = mutation.updatedWorkPaths.flatMap((path) =>
      path.edges.map((edge) => {
        const pairKey = `work-${edge.sourceWorkId}-work-${edge.targetWorkId}`
        const currentCount = edgePairCount.get(pairKey) || 0
        edgePairCount.set(pairKey, currentCount + 1)
        const offset =
          currentCount === 0
            ? 0
            : (currentCount % 2 === 1 ? 1 : -1) * Math.ceil(currentCount / 2) * 3
        return {
          id: `edge-${path.workPathId}-${edge.sourceWorkId}-${edge.targetWorkId}`,
          source: `work-${edge.sourceWorkId}`,
          target: `work-${edge.targetWorkId}`,
          type: 'smoothstep',
          pathOptions: { borderRadius: 20, offset: 15 },
          style: { stroke: path.workPathColor },
          data: { pathId: path.workPathId, pathName: path.workPathName, offset, isFollowing: edge.lagDays !== undefined && edge.lagDays !== null },
        }
      }),
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
      edges.value = edges.value.filter(
        (e) => e.source !== deletedNodeId && e.target !== deletedNodeId,
      )
      nodes.value = nodes.value.filter((n) => n.id !== deletedNodeId)
      applyMutation(mutation)
      clearWorkSelection()
      tooltip.value.visible = false
      emit(
        'works-loaded',
        nodes.value.map((n) => n.data.work as WorkResponse),
      )
      analyticsClient.trackAction('schedule_2d', 'delete_work', 'success')
    } else if (deleteType.value === 'path' && selectedPathId.value) {
      await workPathApi.deleteWorkPath(selectedPathId.value)
      const deletedPathId = selectedPathId.value
      edges.value = edges.value.filter((e) => e.data?.pathId !== deletedPathId)
      paths.value = paths.value.filter((p) => p.workPathId !== deletedPathId)
      cancelPathEdit()
      showPathDialog.value = false
      analyticsClient.trackAction('schedule_2d', 'delete_path', 'success')
    }
    showDeleteDialog.value = false
  } catch (error: unknown) {
    console.error('삭제 실패:', error)
    analyticsClient.trackAction(
      'schedule_2d',
      deleteType.value === 'work' ? 'delete_work' : 'delete_path',
      'fail',
    )
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
  cleanupResizeObserver,
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
  cancelPathEdit,
  onConnect,
  removeNodeFromPath,
  savePathEdges,
  updatePath,
  updateLagDays,
} = usePathEditor(nodes, edges, paths, applyMutation)

// 패스 편집 모드에서 노드 하이라이트
watch(
  [isPathEditMode, selectedPathColor, pathNodeIds],
  ([editMode, pathColor, nodeIds]) => {
    nodes.value = nodes.value.map((node) => {
      const workId = parseInt(node.id.replace('work-', ''))
      const work = node.data.work as WorkResponse

      // 기본 스타일 (휴일 휴무 여부 반영)
      const baseStyle: Record<string, string> = {
        width: `${node.data.computedWidth}px`,
        height: `${node.data.computedHeight}px`,
        overflow: 'visible',
        whiteSpace: 'nowrap',
      }

      // 공종 배경색 적용
      const wtIdx = workTypePaletteMap.value.get(work.workType || '미분류')
      if (wtIdx !== undefined) {
        baseStyle.backgroundColor = GROUP_PALETTE[wtIdx % GROUP_PALETTE.length]!.nodeBg
      }

      // 휴일 미작업 노드
      if (!work.isWorkingOnHoliday) {
        baseStyle.borderColor = 'transparent'
      }

      if (editMode && pathColor && nodeIds.has(workId)) {
        if (!work.isWorkingOnHoliday) {
          // 휴일 노드: 점선 테두리를 패스 색상으로 하이라이트
          return {
            ...node,
            class: 'holiday-node holiday-node--highlight',
            style: {
              ...baseStyle,
              '--holiday-highlight-color': pathColor,
              boxShadow: `0 0 8px ${pathColor}50`,
            } as Record<string, string>,
          }
        }
        return {
          ...node,
          style: {
            ...baseStyle,
            border: `2px solid ${pathColor}`,
            boxShadow: `0 0 8px ${pathColor}50`,
          },
        }
      }

      return {
        ...node,
        class: !work.isWorkingOnHoliday ? 'holiday-node' : undefined,
        style: baseStyle,
      }
    })
  },
  { deep: true },
)

const {
  selectedWorkId,
  workEditForm,
  clearSelection: clearWorkSelection,
  selectWork,
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

function handleDeleteFromPath(workId: number) {
  removeNodeFromPath(workId)
  savePathEdges()
}

function handleWorkTypeGroupToggle(checked: boolean | 'indeterminate') {
  showWorkTypeGroup.value = !!checked
  if (checked) showSubWorkTypeGroup.value = false
}

function handleSubWorkTypeGroupToggle(checked: boolean | 'indeterminate') {
  showSubWorkTypeGroup.value = !!checked
  if (checked) showWorkTypeGroup.value = false
}

function handleSavePathAndClose() {
  savePathChanges()
  showPathDialog.value = false
}

// 패스 변경 저장 (변경된 필드만 전송)
const savePathChanges = async () => {
  if (!selectedPathId.value) return
  const path = paths.value.find((p) => p.workPathId === selectedPathId.value)
  if (!path) return

  const payload: import('@/shared/network-core/apis/workPath').UpdateWorkPathPayload = {}
  if (editPathName.value !== (path.workPathName ?? '')) payload.workPathName = editPathName.value
  if (editPathColor.value !== path.workPathColor) payload.workPathColor = editPathColor.value
  if (editPathCritical.value !== path.critical) payload.critical = editPathCritical.value

  const newEdges = editingPathEdges.value.map(({ sourceWorkId, targetWorkId }) => ({
    sourceWorkId,
    targetWorkId,
  }))
  const origEdges = path.edges.map(({ sourceWorkId, targetWorkId }) => ({
    sourceWorkId,
    targetWorkId,
  }))
  const edgesChanged = JSON.stringify(newEdges) !== JSON.stringify(origEdges)
  if (edgesChanged) payload.edges = newEdges

  if (Object.keys(payload).length === 0) {
    cancelPathEdit()
    return
  }

  isSavingPath.value = true
  try {
    await updatePath(selectedPathId.value, payload)
    cancelPathEdit()
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
  const node = nodes.value.find((n) => n.id === `work-${selectedWorkId.value}`)
  if (!node) return null
  const w = node.data.computedWidth as number
  const h = node.data.computedHeight as number
  return {
    left: { x: node.position.x, y: node.position.y + h / 2 },
    right: { x: node.position.x + w, y: node.position.y + h / 2 },
    halfH: h / 2,
  }
})

// 노드 클릭 핸들러 - 작업 선택 + 말풍선 표시
const onNodeClick = (event: { node: Node; event: MouseEvent | TouchEvent }) => {
  const work = event.node.data.work as WorkResponse | undefined
  if (!work) return

  // 같은 노드 클릭 시 선택 해제
  if (tooltip.value.visible && tooltip.value.workId === work.workId) {
    if (!isPathEditMode.value) clearWorkSelection()
    tooltip.value.visible = false
    tooltip.value.workId = null
    return
  }

  // 노드 선택 (패스 편집 중이 아닐 때만)
  if (!isPathEditMode.value) selectWork(work.workId)

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
    isWorkingOnHoliday: work.isWorkingOnHoliday,
  }
}

// 로컬 날짜를 YYYY-MM-DD 문자열로 변환
const formatLocalDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 말풍선에서 작업 즉시 업데이트 (startDate, workLeadTime, isWorkingOnHoliday)
const updateTooltipWork = async (patch: {
  startDate?: string
  workLeadTime?: number
  isWorkingOnHoliday?: boolean
}) => {
  if (!tooltip.value.workId) return

  const prev = {
    startDate: tooltip.value.startDate,
    workLeadTime: tooltip.value.workLeadTime,
    isWorkingOnHoliday: tooltip.value.isWorkingOnHoliday,
  }

  // 낙관적 반영
  if (patch.startDate !== undefined) tooltip.value.startDate = patch.startDate
  if (patch.workLeadTime !== undefined) tooltip.value.workLeadTime = patch.workLeadTime
  if (patch.isWorkingOnHoliday !== undefined)
    tooltip.value.isWorkingOnHoliday = patch.isWorkingOnHoliday

  try {
    const mutation = await workApi.updateWork(tooltip.value.workId, patch)
    workEditForm.value.startDate = tooltip.value.startDate
    workEditForm.value.workLeadTime = tooltip.value.workLeadTime
    workEditForm.value.isWorkingOnHoliday = tooltip.value.isWorkingOnHoliday

    // 대상 노드 명시적 갱신 (applyMutation이 처리 못할 경우 대비)
    const directWork = mutation.updatedWorks.find((w) => w.workId === tooltip.value.workId)
    if (directWork) {
      const updated = workToNode(directWork)
      const row = rowLayout.value.workRowMap.get(directWork.workId)
      const y = row !== undefined ? row * ROW_UNIT + NODE_OFFSET_Y : NODE_OFFSET_Y
      nodes.value = nodes.value.map((n) =>
        n.id === `work-${directWork.workId}`
          ? { ...updated, position: { ...updated.position, y } }
          : n,
      )
    }

    // cascade 및 path 갱신
    const cascadeMutation = {
      updatedWorks: mutation.updatedWorks.filter((w) => w.workId !== tooltip.value.workId),
      updatedWorkPaths: mutation.updatedWorkPaths,
    }
    if (cascadeMutation.updatedWorks.length > 0 || cascadeMutation.updatedWorkPaths.length > 0) {
      applyMutation(cascadeMutation)
    }

    emit(
      'works-loaded',
      nodes.value.map((n) => n.data.work as WorkResponse),
    )
    analyticsClient.trackAction('schedule_2d', 'update_work', 'success')
  } catch (error: unknown) {
    console.error('작업 수정 실패:', error)
    analyticsClient.trackAction('schedule_2d', 'update_work', 'fail')
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
    // 롤백
    tooltip.value.startDate = prev.startDate
    tooltip.value.workLeadTime = prev.workLeadTime
    tooltip.value.isWorkingOnHoliday = prev.isWorkingOnHoliday
  }
}

// 패스 편집 다이얼로그
const showPathDialog = ref(false)

// 노드 연결 핸들러 (패스 미선택 시 새 패스 생성)
const handleConnect = async (params: { source: string; target: string }) => {
  // 노드 선택 상태에서는 패스 생성/추가 차단 (리사이즈 핸들만 활성)
  if (selectedWorkId.value) return

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
    edges.value.forEach((e) => {
      const key = `${e.source}-${e.target}`
      edgePairCount.set(key, (edgePairCount.get(key) || 0) + 1)
    })
    const newEdges = newPath.edges.map((edge) => {
      const pairKey = `work-${edge.sourceWorkId}-work-${edge.targetWorkId}`
      const currentCount = edgePairCount.get(pairKey) || 0
      edgePairCount.set(pairKey, currentCount + 1)
      const offset =
        currentCount === 0 ? 0 : (currentCount % 2 === 1 ? 1 : -1) * Math.ceil(currentCount / 2) * 3
      return {
        id: `edge-${newPath.workPathId}-${edge.sourceWorkId}-${edge.targetWorkId}`,
        source: `work-${edge.sourceWorkId}`,
        target: `work-${edge.targetWorkId}`,
        type: 'smoothstep',
        pathOptions: { borderRadius: 20, offset: 15 },
        style: { stroke: newPath.workPathColor },
        data: { pathId: newPath.workPathId, pathName: newPath.workPathName, offset, isFollowing: edge.lagDays !== undefined && edge.lagDays !== null },
      }
    })
    edges.value = [...edges.value, ...newEdges]
    applyMutation(mutation)
    // 생성된 패스를 자동 선택
    selectPath(newPath.workPathId)
    analyticsClient.trackAction('schedule_2d', 'create_path', 'success')
  } catch (error: unknown) {
    console.error('패스 생성 실패:', error)
    analyticsClient.trackAction('schedule_2d', 'create_path', 'fail')
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  }
}

// 엣지 클릭 시 하이라이트 (겹친 패스 순환 선택)
const onEdgeClick = (event: { edge: Edge }) => {
  const pathId = event.edge.data?.pathId as number | undefined
  if (!pathId) return

  // 같은 source-target 쌍의 패스 ID 수집
  const pairPathIds = [
    ...new Set(
      edges.value
        .filter(
          (e) => e.source === event.edge.source && e.target === event.edge.target && e.data?.pathId,
        )
        .map((e) => e.data!.pathId as number),
    ),
  ]

  if (
    pairPathIds.length > 1 &&
    selectedPathId.value &&
    pairPathIds.includes(selectedPathId.value)
  ) {
    const idx = pairPathIds.indexOf(selectedPathId.value)
    selectPath(pairPathIds[(idx + 1) % pairPathIds.length]!)
  } else {
    selectPath(pathId)
  }

  clearWorkSelection()
  tooltip.value.visible = false
}

// 엣지 우클릭 → 패스 편집 다이얼로그
const onEdgeContextMenu = (event: { edge: Edge; event: MouseEvent | TouchEvent }) => {
  event.event.preventDefault()
  const pathId = event.edge.data?.pathId as number | undefined
  if (!pathId) return
  selectPath(pathId)
  showPathDialog.value = true
}

// 노드 우클릭 → 상세 편집 다이얼로그
const onNodeContextMenu = (event: { node: Node; event: MouseEvent | TouchEvent }) => {
  event.event.preventDefault()
  const work = event.node.data.work as WorkResponse | undefined
  if (!work) return
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
    nodes.value = [...nodes.value, newNode]
    // rowLayout will recompute and place the node at the correct Y

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
    const editingId = td.editingWorkId
    const result = await td.submitEdit()
    if (!result) return

    const response = result.updatedWorks.find((w) => w.workId === editingId)!
    const updatedNode = workToNode(response)
    nodes.value = nodes.value.map((n) => {
      if (n.id !== `work-${response.workId}`) return n
      return { ...updatedNode, position: { ...updatedNode.position, y: n.position.y } }
    })

    // cascade 영향 받은 다른 Work도 반영
    const otherUpdates = result.updatedWorks.filter((w) => w.workId !== response.workId)
    if (otherUpdates.length > 0) {
      const otherMap = new Map(otherUpdates.map((w) => [w.workId, w]))
      nodes.value = nodes.value.map((n) => {
        const w = otherMap.get((n.data.work as WorkResponse).workId)
        if (!w) return n
        const updated = workToNode(w)
        return { ...updated, position: { ...updated.position, y: n.position.y } }
      })
    }
    // rowLayout 기반 Y 재배치
    const layout = rowLayout.value
    nodes.value.forEach((n) => {
      const work = n.data.work as WorkResponse
      const row = layout.workRowMap.get(work.workId)
      if (row !== undefined) n.position.y = row * ROW_UNIT + NODE_OFFSET_Y
    })

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

  emit(
    'works-loaded',
    nodes.value.map((n) => n.data.work as WorkResponse),
  )
}

// 빈 영역 클릭 시 — 그룹박스 내부면 그룹 선택, 아니면 선택 해제
const onPaneClick = (event: MouseEvent) => {
  tooltip.value.visible = false
  if (isPathEditMode.value) {
    cancelPathEdit()
  }
  if (!isPathEditMode.value) {
    clearWorkSelection()
  }

  // 그룹박스 표시 중이면 클릭 위치가 그룹박스 내부인지 체크
  const hitIndex = hitTestGroupBox(event)
  if (hitIndex >= 0) {
    selectedGroupIndex.value = hitIndex
    return
  }
  selectedGroupIndex.value = null
}

// 컨테이너 mousedown capture → 그룹박스 내부(노드 아닌 영역)에서 드래그 시작
const onContainerMouseDown = (event: MouseEvent) => {
  if (event.button !== 0) return
  const target = event.target as HTMLElement
  // 노드·컨트롤·말풍선·토글 위 mousedown은 해당 요소가 처리
  if (
    target.closest('.vue-flow__node') ||
    target.closest('.vue-flow__panel') ||
    target.closest('[data-tooltip-balloon]') ||
    target.closest('[data-group-toggle]')
  )
    return
  // 헤더 영역 mousedown은 무시
  const container = containerRef.value
  if (!container) return
  const rect = container.getBoundingClientRect()
  if (event.clientY - rect.top < HEADER_HEIGHT) return

  const hitIndex = hitTestGroupBox(event)
  if (hitIndex >= 0) {
    startGroupDrag(hitIndex, event)
  }
}

// 컨테이너 더블클릭 → 노드·그룹박스 위가 아니면 빠른 생성
const onContainerDblClick = (event: MouseEvent) => {
  // 노드 위 더블클릭은 onNodeDoubleClick이 처리, 말풍선/그룹토글 위 더블클릭은 무시
  const target = event.target as HTMLElement
  if (
    target.closest('.vue-flow__node') ||
    target.closest('[data-tooltip-balloon]') ||
    target.closest('[data-group-toggle]')
  )
    return
  // 그룹박스 내부 더블클릭 → 작업 생성 방지
  if (hitTestGroupBox(event) >= 0) return
  handlePaneDblClick(event)
}

// flowY → rowLayout에서 subWorkType 찾기
const resolveSubWorkTypeFromY = (
  flowY: number,
): { subWorkTypeId: number; subWorkTypeName: string } | null => {
  const rowIndex = Math.floor(flowY / ROW_UNIT)
  const layout = rowLayout.value
  for (const section of layout.sections) {
    for (const sub of section.subSections) {
      if (rowIndex >= sub.startRowIndex && rowIndex < sub.startRowIndex + sub.subRowCount) {
        return { subWorkTypeId: sub.subWorkTypeId, subWorkTypeName: sub.subWorkType }
      }
    }
  }
  return null
}

// 빈 영역 더블클릭 → 생성 다이얼로그 열기
const handlePaneDblClick = (event: MouseEvent) => {
  if (isPathEditMode.value) return

  const container = containerRef.value
  if (!container) return

  // 스크린 좌표 → flow 좌표 변환 (VueFlow wrapper 기준)
  const rect = container.getBoundingClientRect()
  const flowX =
    (event.clientX - rect.left - LEFT_HEADER_WIDTH - viewport.value.x) / viewport.value.zoom
  const flowY = (event.clientY - rect.top - HEADER_HEIGHT - viewport.value.y) / viewport.value.zoom

  // flowY → subWorkType 결정
  const resolved = resolveSubWorkTypeFromY(flowY)
  if (!resolved) return

  // flowX → dayIndex → startDate
  const dayIndex = Math.floor(flowX / appConfig.chart.pixelPerDay)
  const startDate = dayIndexToDate(dayIndex)

  // Y 그리드 스냅
  const cfg = chartConfigStore.config
  const rowUnit = cfg.nodeHeight + 2 * cfg.nodePaddingY
  const snappedY = Math.floor(flowY / rowUnit) * rowUnit

  td.openCreateDialog(startDate, snappedY, resolved.subWorkTypeId, resolved.subWorkTypeName)
}

// 노드 드래그 종료 시 X축 변경만 저장 (Y는 rowLayout 기반)
const onNodeDragStop = async (event: { node: Node }) => {
  const work = event.node.data.work as WorkResponse | undefined
  if (!work) return

  const cfg = chartConfigStore.config
  const originalX = event.node.data.originalX as number

  // X축 변경 계산
  const daysDelta = Math.round((event.node.position.x - originalX) / cfg.pixelPerDay)
  let newStartDate: string | undefined
  if (daysDelta !== 0) {
    const base = new Date(work.startDate)
    base.setHours(0, 0, 0, 0)
    base.setDate(base.getDate() + daysDelta)
    newStartDate = formatLocalDate(base)
  }

  // 변경 없으면 원위치 복구 후 종료
  if (daysDelta === 0) {
    event.node.position.x = originalX
    return
  }

  // X 스냅 위치 반영
  if (newStartDate) {
    const newX = computeNodeX(newStartDate)
    event.node.position.x = newX
    event.node.data.originalX = newX
  } else {
    event.node.position.x = originalX
  }

  // payload 구성: X축만
  const payload: UpdateWorkPayload = {}
  if (newStartDate) payload.startDate = newStartDate

  try {
    const mutation = await workApi.updateWork(work.workId, payload)

    // 선택된 작업 폼 동기화
    if (newStartDate && selectedWorkId.value === work.workId) {
      workEditForm.value.startDate = newStartDate
    }
    applyMutation(mutation)
    analyticsClient.trackAction('schedule_2d', 'update_work', 'success')
  } catch (error: unknown) {
    console.error('위치 저장 실패:', error)
    analyticsClient.trackAction('schedule_2d', 'update_work', 'fail')
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
    // 실패 시 원위치 복구
    const origX = computeNodeX(work.startDate)
    event.node.position.x = origX
    event.node.data.originalX = origX
  }
}

// 리사이즈 드래그 시작
const onResizeStart = (side: 'left' | 'right', e: MouseEvent) => {
  const node = nodes.value.find((n) => n.id === `work-${selectedWorkId.value}`)
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
    origNodeWidth: node.data.computedWidth as number,
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

  const node = nodes.value.find((n) => n.id === `work-${r.workId}`)
  if (!node) return

  if (r.side === 'left') {
    const clampedDays = Math.min(daysDelta, r.origLeadTime - 1)
    const newX = r.origNodeX + clampedDays * cfg.pixelPerDay
    const newWidth = r.origNodeWidth - clampedDays * cfg.pixelPerDay
    node.position.x = newX
    node.style = { ...node.style, width: `${newWidth}px` }
    node.data.computedWidth = newWidth
  } else {
    const clampedDays = Math.max(daysDelta, -(r.origLeadTime - 1))
    const newWidth = r.origNodeWidth + clampedDays * cfg.pixelPerDay
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
  const node = nodes.value.find((n) => n.id === `work-${r.workId}`)
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
    const payload: UpdateWorkPayload = {}
    if (newStartDate !== r.origStartDate) payload.startDate = newStartDate
    if (newLeadTime !== r.origLeadTime) payload.workLeadTime = newLeadTime
    const mutation = await workApi.updateWork(r.workId, payload)
    workEditForm.value.startDate = newStartDate
    workEditForm.value.workLeadTime = newLeadTime
    applyMutation(mutation)
    analyticsClient.trackAction('schedule_2d', 'update_work', 'success')
  } catch (error: unknown) {
    console.error('리사이즈 실패:', error)
    analyticsClient.trackAction('schedule_2d', 'update_work', 'fail')
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
    node.position.x = r.origNodeX
    node.style = { ...node.style, width: `${r.origNodeWidth}px` }
    node.data.computedWidth = r.origNodeWidth
    node.data.originalX = r.origNodeX
  }
}

// 노드 드래그 핸들러 (X축 날짜 스냅, Y축 잠금)
const onNodeDrag = (event: { node: Node }) => {
  // 리사이즈 중이면 노드 드래그 차단
  if (resizing.value) {
    event.node.position.x = event.node.data.originalX as number
    const work = event.node.data.work as WorkResponse
    const row = rowLayout.value.workRowMap.get(work.workId)
    event.node.position.y = (row ?? 0) * ROW_UNIT + NODE_OFFSET_Y
    return
  }

  const originalX = event.node.data.originalX
  const work = event.node.data.work as WorkResponse | undefined

  // Y축 잠금: 항상 layout 기반 위치로 복원
  if (work) {
    const row = rowLayout.value.workRowMap.get(work.workId)
    if (row !== undefined) event.node.position.y = row * ROW_UNIT + NODE_OFFSET_Y
  }

  // 패스 편집 중: X 이동도 차단
  if (isPathEditMode.value) {
    if (originalX !== undefined) event.node.position.x = originalX
    return
  }

  const cfg = chartConfigStore.config

  // X축: 날짜 단위 스냅
  if (originalX !== undefined) {
    const daysDelta = Math.round((event.node.position.x - (originalX as number)) / cfg.pixelPerDay)
    event.node.position.x = (originalX as number) + daysDelta * cfg.pixelPerDay
  }

  // 드래그 중인 노드에 말풍선이 열려있으면 위치 갱신
  if (work && tooltip.value.visible && tooltip.value.workId === work.workId) {
    tooltip.value.nodeX = event.node.position.x + (event.node.data.computedWidth as number) / 2
    tooltip.value.nodeY = event.node.position.y - 8
  }
}

const ZOOM_MIN = 0.4
const ZOOM_MAX = 2
const ZOOM_FACTOR = 0.1

const handleVueFlowWheel = (e: WheelEvent) => {
  e.preventDefault()

  const oldZoom = viewport.value.zoom
  const newZoom = Math.min(
    ZOOM_MAX,
    Math.max(ZOOM_MIN, oldZoom + (e.deltaY < 0 ? ZOOM_FACTOR : -ZOOM_FACTOR)),
  )
  if (newZoom === oldZoom) return

  // 마우스 커서 위치를 VueFlow wrapper 기준으로 계산
  const container = containerRef.value
  if (!container) return
  const rect = container.getBoundingClientRect()
  const mouseX = e.clientX - rect.left - LEFT_HEADER_WIDTH
  const mouseY = e.clientY - rect.top - HEADER_HEIGHT

  // 커서 아래의 flow 좌표가 줌 후에도 동일 화면 위치에 유지되도록 viewport 보정
  const newX = mouseX - (mouseX - viewport.value.x) * (newZoom / oldZoom)
  const newY = mouseY - (mouseY - viewport.value.y) * (newZoom / oldZoom)

  setViewport({ x: newX, y: newY, zoom: newZoom })
}

onMounted(async () => {
  await Promise.all([loadCalendarData(), loadRefTree()])
  loadWorkData()
  td.loadReferenceData()
  setupResizeObserver()
})

onUnmounted(() => {
  cleanupResizeObserver()
})
</script>

<template>
  <div class="h-full">
    <!-- VueFlow 영역 -->
    <div
      ref="containerRef"
      class="relative h-full min-w-0 border border-border rounded-lg overflow-hidden"
      @wheel="handleVueFlowWheel"
      @mousedown.capture="onContainerMouseDown"
      @dblclick="onContainerDblClick"
    >
      <!-- 코너 셀 (공종/세부공종 라벨) -->
      <div
        class="absolute z-30 bg-muted border-b border-r border-border flex items-center justify-center text-xs font-medium"
        :style="{ width: `${LEFT_HEADER_WIDTH}px`, height: `${HEADER_HEIGHT}px` }"
      >
        공종 / 세부공종
      </div>

      <!-- 5단 날짜 헤더 바 -->
      <div
        class="absolute top-0 right-0 bg-muted/80 border-b border-border z-20 overflow-hidden"
        :style="{ left: `${LEFT_HEADER_WIDTH}px`, height: `${HEADER_HEIGHT}px` }"
      >
        <div class="absolute w-full h-full" :style="{ transform: `translateX(${viewport.x}px)` }">
          <!-- Row 1: 년 -->
          <div
            v-for="cell in yearCells"
            :key="`year-${cell.startIndex}`"
            class="absolute flex items-center justify-center text-xs font-medium border border-border bg-muted/60"
            :style="{
              left: `${cell.startIndex * DAY_WIDTH * viewport.zoom}px`,
              width: `${cell.span * DAY_WIDTH * viewport.zoom}px`,
              height: `${ROW_HEIGHT}px`,
              top: '0px',
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
              top: `${ROW_HEIGHT}px`,
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
              top: `${ROW_HEIGHT * 2}px`,
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
              'text-red-600': dateInfo.isHoliday && !dateInfo.isDeactivated,
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
                    : '#ffffff',
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
              'text-red-600': dateInfo.isHoliday && !dateInfo.isDeactivated,
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
                    : '#ffffff',
            }"
          >
            {{ dateInfo.dayName }}
          </div>
        </div>
      </div>

      <!-- 왼쪽 헤더 -->
      <LeftHeader
        :row-layout="rowLayout"
        :viewport-y="viewport.y"
        :zoom="viewport.zoom"
        :header-height="HEADER_HEIGHT"
      />

      <!-- VueFlow wrapper: 헤더/좌측 패널 아래 영역에만 배치 (좌표계 정렬) -->
      <div
        class="absolute right-0 bottom-0"
        :style="{ top: `${HEADER_HEIGHT}px`, left: `${LEFT_HEADER_WIDTH}px` }"
      >
        <VueFlow
          v-model:nodes="nodes"
          :edges="styledEdges"
          :node-types="{ work: markRaw(WorkNode) }"
          class="w-full h-full"
          :class="{
            'path-mode': isPathEditMode || !selectedWorkId,
            'work-selected': !!selectedWorkId,
          }"
          fit-view-on-init
          :min-zoom="0.3"
          :zoom-on-scroll="false"
          :zoom-on-double-click="false"
          :disable-keyboard-a11y="true"
          :nodes-connectable="!selectedWorkId"
          @node-click="onNodeClick"
          @node-context-menu="onNodeContextMenu"
          @node-drag="onNodeDrag"
          @node-drag-stop="onNodeDragStop"
          @pane-click="onPaneClick"
          @edge-click="onEdgeClick"
          @edge-context-menu="onEdgeContextMenu"
          @connect="handleConnect"
        >
          <!-- 세로 줄 패턴 (40px 간격) - 프로젝트 기간 내에서만 -->
          <svg
            style="position: absolute; width: 100%; height: 100%; pointer-events: none; z-index: 0"
          >
            <defs>
              <pattern
                id="vertical-lines"
                x="0"
                y="0"
                :width="DAY_WIDTH"
                height="100"
                patternUnits="userSpaceOnUse"
              >
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
              <!-- 가로 구분선 (행 경계) -->
              <line
                v-for="ri in rowLayout.totalRows + 1"
                :key="`hline-${ri}`"
                x1="-50000"
                :y1="(ri - 1) * ROW_UNIT"
                x2="50000"
                :y2="(ri - 1) * ROW_UNIT"
                stroke="#d1d5db"
                stroke-opacity="0.4"
                stroke-width="1"
              />
              <!-- 그루핑 박스 (SVG 비인터랙티브 배경만) -->
              <g v-if="!isPathEditMode">
                <template v-if="showWorkTypeGroup">
                  <template v-for="(box, i) in groupBoxes" :key="`group-wt-svg-${i}`">
                    <rect
                      v-if="box.level === 'workType'"
                      :x="box.x"
                      :y="box.y"
                      :width="box.width"
                      :height="box.height"
                      :fill="box.fillColor"
                      :stroke="box.borderColor"
                      stroke-width="1"
                      rx="6"
                      ry="6"
                    />
                  </template>
                </template>
                <template v-if="showSubWorkTypeGroup">
                  <template v-for="(box, i) in groupBoxes" :key="`group-swt-svg-${i}`">
                    <rect
                      v-if="box.level === 'subWorkType'"
                      :x="box.x"
                      :y="box.y"
                      :width="box.width"
                      :height="box.height"
                      :fill="box.fillColor"
                      :stroke="box.borderColor"
                      stroke-width="1"
                      rx="4"
                      ry="4"
                      stroke-dasharray="4 2"
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
                  style="writing-mode: tb; glyph-orientation-vertical: 0"
                >
                  {{ dateInfo.deactivatedReason || dateInfo.holidayName }}
                </text>
              </template>
            </g>
          </svg>

          <!-- 그루핑 박스 인터랙티브 오버레이 (viewport z:4 위에 배치, pointer-events 전략으로 노드 클릭 투과) -->
          <template v-if="!isPathEditMode">
            <template v-for="(box, i) in groupBoxes" :key="`group-overlay-${i}`">
              <div
                v-if="
                  (box.level === 'workType' && showWorkTypeGroup) ||
                  (box.level === 'subWorkType' && showSubWorkTypeGroup)
                "
                class="absolute z-[5]"
                :style="{
                  left: `${box.x * viewport.zoom + viewport.x}px`,
                  top: `${box.y * viewport.zoom + viewport.y}px`,
                  width: `${box.width * viewport.zoom}px`,
                  height: `${box.height * viewport.zoom}px`,
                  pointerEvents: 'none',
                  borderRadius: box.level === 'workType' ? '6px' : '4px',
                }"
              >
                <!-- 테두리 8px 영역 (상/하/좌/우) — 여기서만 드래그 캡처 -->
                <div
                  class="absolute top-0 left-0 right-0 h-[8px]"
                  style="pointer-events: auto; cursor: grab"
                  @mousedown.stop="startGroupDrag(i, $event)"
                  @click.stop="selectGroup(i, $event)"
                  @dblclick.stop
                />
                <div
                  class="absolute bottom-0 left-0 right-0 h-[8px]"
                  style="pointer-events: auto; cursor: grab"
                  @mousedown.stop="startGroupDrag(i, $event)"
                  @click.stop="selectGroup(i, $event)"
                  @dblclick.stop
                />
                <div
                  class="absolute top-0 bottom-0 left-0 w-[8px]"
                  style="pointer-events: auto; cursor: grab"
                  @mousedown.stop="startGroupDrag(i, $event)"
                  @click.stop="selectGroup(i, $event)"
                  @dblclick.stop
                />
                <div
                  class="absolute top-0 bottom-0 right-0 w-[8px]"
                  style="pointer-events: auto; cursor: grab"
                  @mousedown.stop="startGroupDrag(i, $event)"
                  @click.stop="selectGroup(i, $event)"
                  @dblclick.stop
                />
                <!-- 라벨 -->
                <span
                  class="absolute text-[11px] font-semibold px-1 select-none"
                  style="pointer-events: auto; cursor: grab"
                  :style="{ color: box.borderColor, ...getGroupLabelOffset(box) }"
                  @mousedown.stop="startGroupDrag(i, $event)"
                  @click.stop="selectGroup(i, $event)"
                  @dblclick.stop
                  >{{ box.label }}</span
                >
                <!-- 선택 border (pointer-events: none) -->
                <div
                  v-if="selectedGroupIndex === i"
                  class="absolute inset-0"
                  :style="{
                    pointerEvents: 'none',
                    border: `2px solid ${box.borderColor}`,
                    borderRadius: box.level === 'workType' ? '6px' : '4px',
                  }"
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
              transformOrigin: 'bottom center',
            }"
          >
            <div
              class="px-3 py-2 text-sm bg-popover border border-border rounded-lg shadow-lg space-y-2"
            >
              <div
                class="absolute left-1/2 -bottom-2 -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-transparent border-t-border"
              ></div>
              <div
                class="absolute left-1/2 -bottom-[7px] -translate-x-1/2 border-l-[7px] border-r-[7px] border-t-[7px] border-transparent border-t-popover"
              ></div>

              <!-- ID / 작업이름 -->
              <p class="text-xs font-medium">
                <span class="text-muted-foreground">{{ tooltip.workId }}.</span>
                {{ tooltip.workName }}
              </p>

              <!-- 시작일 (읽기전용) -->
              <p class="text-[11px] text-muted-foreground">
                시작일: <span class="font-medium text-foreground">{{ tooltip.startDate }}</span>
              </p>

              <!-- 작업기간 (읽기전용) -->
              <p class="text-[11px] text-muted-foreground">
                작업기간:
                <span class="font-medium text-foreground">{{ tooltip.workLeadTime }}일</span>
              </p>

              <!-- 완료일 (읽기전용) -->
              <p class="text-[11px] text-muted-foreground">
                완료일:
                <span class="font-medium text-foreground">{{ tooltip.completionDate }}</span>
              </p>

              <!-- 선행작업 목록 -->
              <div
                v-if="tooltipPredecessors.length > 0"
                class="space-y-1.5 pt-1 border-t border-border"
              >
                <div
                  v-for="(pred, idx) in tooltipPredecessors"
                  :key="`${pred.pathId}-${pred.workId}`"
                  class="space-y-0.5"
                >
                  <p class="text-[11px] text-muted-foreground">
                    선행작업{{ idx + 1 }}:
                    <span
                      class="inline-block w-2 h-2 rounded-full mr-1 align-middle"
                      :style="{ backgroundColor: pred.pathColor }"
                    ></span>
                    <span class="font-medium text-foreground"
                      >{{ pred.workId }}. {{ pred.workName }}</span
                    >
                  </p>
                  <div class="flex items-center gap-1">
                    <Checkbox
                      :model-value="pred.isFollowing"
                      class="h-3.5 w-3.5"
                      @update:model-value="
                        updateEdgeOverlapLocal(
                          pred.pathId,
                          pred.workId,
                          tooltip.workId!,
                          $event ? 0 : null,
                        )
                      "
                    />
                    <label class="text-[11px] text-muted-foreground">따라가기</label>
                    <template v-if="pred.isFollowing">
                      <input
                        type="number"
                        :value="pred.lagDays"
                        class="w-12 h-5 text-[11px] text-center rounded border border-border bg-background"
                        @change="
                          updateEdgeOverlapLocal(
                            pred.pathId,
                            pred.workId,
                            tooltip.workId!,
                            Number(($event.target as HTMLInputElement).value),
                          )
                        "
                      />
                      <span class="text-[11px] text-muted-foreground">일</span>
                      <span
                        class="text-[11px] font-medium"
                        :class="
                          pred.lagDays < 0
                            ? 'text-blue-500'
                            : pred.lagDays > 0
                              ? 'text-orange-500'
                              : 'text-muted-foreground'
                        "
                      >
                        {{
                          pred.lagDays < 0
                            ? `${Math.abs(pred.lagDays)}일 겹치기`
                            : pred.lagDays === 0
                              ? '다음날'
                              : `${pred.lagDays}일 벌리기`
                        }}
                      </span>
                    </template>
                    <button
                      type="button"
                      class="ml-auto px-1.5 py-0.5 text-[10px] font-medium rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                      @click="
                        updateEdgeOverlap(
                          pred.pathId,
                          pred.workId,
                          tooltip.workId!,
                          pred.isFollowing ? pred.lagDays : null,
                        )
                      "
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
                  :class="
                    tooltip.isWorkingOnHoliday
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-muted'
                  "
                  @click="updateTooltipWork({ isWorkingOnHoliday: true })"
                >
                  휴일 작업
                </button>
                <button
                  type="button"
                  class="flex-1 py-1 text-xs font-medium transition-colors border-l border-border"
                  :class="
                    !tooltip.isWorkingOnHoliday
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-muted'
                  "
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

          <!-- 리사이즈 핸들 (노드 세로 모서리에 바 1개씩) -->
          <template v-if="resizeHandles && !isPathEditMode">
            <!-- 왼쪽 모서리 ◀ -->
            <div
              class="absolute z-20 cursor-col-resize flex items-center justify-center"
              :style="{
                left: `${resizeHandles.left.x * viewport.zoom + viewport.x}px`,
                top: `${(resizeHandles.left.y - resizeHandles.halfH) * viewport.zoom + viewport.y}px`,
                width: `${16 * viewport.zoom}px`,
                height: `${resizeHandles.halfH * 2 * viewport.zoom}px`,
                transform: 'translateX(-50%)',
              }"
              @mousedown.stop="onResizeStart('left', $event)"
            >
              <div style="display: flex; align-items: center; gap: 5px">
                <div
                  :style="{
                    width: '0',
                    height: '0',
                    borderTop: `${Math.max(4, 5 * viewport.zoom)}px solid transparent`,
                    borderBottom: `${Math.max(4, 5 * viewport.zoom)}px solid transparent`,
                    borderRight: `${Math.max(5, 6 * viewport.zoom)}px solid #1f2937`,
                  }"
                />
                <div
                  :style="{
                    width: '0',
                    height: '0',
                    borderTop: `${Math.max(4, 5 * viewport.zoom)}px solid transparent`,
                    borderBottom: `${Math.max(4, 5 * viewport.zoom)}px solid transparent`,
                    borderLeft: `${Math.max(5, 6 * viewport.zoom)}px solid #1f2937`,
                  }"
                />
              </div>
            </div>
            <!-- 오른쪽 모서리 ◀▶ -->
            <div
              class="absolute z-20 cursor-col-resize flex items-center justify-center"
              :style="{
                left: `${resizeHandles.right.x * viewport.zoom + viewport.x}px`,
                top: `${(resizeHandles.right.y - resizeHandles.halfH) * viewport.zoom + viewport.y}px`,
                width: `${16 * viewport.zoom}px`,
                height: `${resizeHandles.halfH * 2 * viewport.zoom}px`,
                transform: 'translateX(-50%)',
              }"
              @mousedown.stop="onResizeStart('right', $event)"
            >
              <div style="display: flex; align-items: center; gap: 5px">
                <div
                  :style="{
                    width: '0',
                    height: '0',
                    borderTop: `${Math.max(4, 5 * viewport.zoom)}px solid transparent`,
                    borderBottom: `${Math.max(4, 5 * viewport.zoom)}px solid transparent`,
                    borderRight: `${Math.max(5, 6 * viewport.zoom)}px solid #1f2937`,
                  }"
                />
                <div
                  :style="{
                    width: '0',
                    height: '0',
                    borderTop: `${Math.max(4, 5 * viewport.zoom)}px solid transparent`,
                    borderBottom: `${Math.max(4, 5 * viewport.zoom)}px solid transparent`,
                    borderLeft: `${Math.max(5, 6 * viewport.zoom)}px solid #1f2937`,
                  }"
                />
              </div>
            </div>
          </template>

          <!-- 패스 편집 모드: 삭제 버튼들 -->
          <template v-if="isPathEditMode">
            <button
              v-for="btn in deleteButtonNodes"
              :key="`delete-${btn.workId}`"
              class="absolute z-20 w-5 h-5 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-colors cursor-pointer"
              :style="{
                left: `${btn.x * viewport.zoom + viewport.x}px`,
                top: `${btn.y * viewport.zoom + viewport.y}px`,
                transform: `translate(-50%, -50%) scale(${Math.min(viewport.zoom, 1)})`,
              }"
              @click="handleDeleteFromPath(btn.workId)"
            >
              <span class="text-xs font-bold">×</span>
            </button>
          </template>

          <Controls position="bottom-right" />
        </VueFlow>
      </div>

      <!-- 그루핑 박스 토글 (우측 하단) -->
      <div
        v-if="!isPathEditMode"
        data-group-toggle
        class="absolute bottom-4 right-4 z-30 flex flex-col gap-1 bg-background/80 backdrop-blur-sm rounded-md border border-border px-2 py-1.5"
      >
        <label class="flex items-center gap-1.5 cursor-pointer">
          <Checkbox
            :model-value="showWorkTypeGroup"
            class="h-3.5 w-3.5"
            @update:model-value="handleWorkTypeGroupToggle"
          />
          <span class="text-[11px] text-muted-foreground">공종 그룹</span>
        </label>
        <label class="flex items-center gap-1.5 cursor-pointer">
          <Checkbox
            :model-value="showSubWorkTypeGroup"
            class="h-3.5 w-3.5"
            @update:model-value="handleSubWorkTypeGroupToggle"
          />
          <span class="text-[11px] text-muted-foreground">세부공종 그룹</span>
        </label>
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
            :class="
              editPathCritical
                ? 'bg-primary text-primary-foreground'
                : 'bg-background hover:bg-muted'
            "
            @click="editPathCritical = true"
          >
            주공정
          </button>
          <button
            type="button"
            class="flex-1 py-1.5 text-xs font-medium transition-colors border-l border-border"
            :class="
              !editPathCritical
                ? 'bg-primary text-primary-foreground'
                : 'bg-background hover:bg-muted'
            "
            @click="editPathCritical = false"
          >
            일반
          </button>
        </div>
      </div>

      <DialogFooter class="flex-col gap-1.5 sm:flex-col">
        <Button size="sm" class="w-full" :disabled="isSavingPath" @click="handleSavePathAndClose">
          {{ isSavingPath ? '저장 중...' : '저장' }}
        </Button>
        <button
          type="button"
          class="w-full py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded border border-destructive/30 transition-colors"
          @click="openDeleteDialog('path')"
        >
          삭제
        </button>
        <!-- <button
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
          전체 패스 최적화
        </button> -->
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <!-- 삭제 확인 다이얼로그 -->
  <AlertDialog v-model:open="showDeleteDialog">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>삭제 확인</AlertDialogTitle>
        <AlertDialogDescription> 정말 삭제하시겠습니까? </AlertDialogDescription>
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
          {{
            optimizeTarget === 'current'
              ? '현재 패스에 포함된 작업을 선행작업 완료일 기준으로 최대한 앞으로 당깁니다.'
              : '모든 패스의 작업을 선행작업 완료일 기준으로 최대한 앞으로 당깁니다.'
          }}
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
              >
                −
              </button>
              <span
                class="h-8 flex-1 flex items-center justify-center text-sm font-medium rounded-md border border-border bg-background"
                >{{ td.editWorkLeadTime }}일</span
              >
              <button
                type="button"
                class="h-8 w-8 flex items-center justify-center rounded-md border border-border text-sm font-bold hover:bg-muted transition-colors"
                @click="td.editWorkLeadTime = td.editWorkLeadTime + 1"
              >
                +
              </button>
            </div>
          </div>
        </template>

        <!-- 공종 (생성 모드: 더블클릭 위치에서 자동 결정, 수정 모드: 3계층 선택) -->
        <div v-if="td.isCreateMode" class="space-y-1.5">
          <label class="text-sm font-medium">세부공종</label>
          <div class="h-8 flex items-center text-sm rounded-md border border-border bg-muted px-3">
            {{ td.createSubWorkTypeName }}
          </div>
        </div>
        <div v-else class="space-y-1.5">
          <label class="text-sm font-medium">공종</label>
          <Select
            :model-value="td.editDivisionId"
            @update:model-value="td.handleTooltipDivisionChange($event)"
          >
            <SelectTrigger class="h-8 text-sm">
              <SelectValue placeholder="분류 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="d in td.divisions" :key="d.id" :value="String(d.id)">{{
                d.name
              }}</SelectItem>
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
              <SelectItem v-for="w in td.tooltipWorkTypes" :key="w.id" :value="String(w.id)">{{
                w.name
              }}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            :model-value="td.editSubWorkTypeId"
            :disabled="!td.editWorkTypeId || td.isLoadingTooltipSubWorkTypes"
            @update:model-value="td.handleTooltipSubWorkTypeChange($event)"
          >
            <SelectTrigger class="h-8 text-sm">
              <SelectValue
                :placeholder="td.isLoadingTooltipSubWorkTypes ? '로딩...' : '세부공종 선택'"
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="s in td.tooltipSubWorkTypes" :key="s.id" :value="String(s.id)">{{
                s.name
              }}</SelectItem>
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
                <label
                  v-for="z in td.zones"
                  :key="z.id"
                  class="flex items-center gap-1.5 text-sm cursor-pointer"
                >
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
                <label
                  v-for="f in td.floors"
                  :key="f.id"
                  class="flex items-center gap-1.5 text-sm cursor-pointer"
                >
                  <Checkbox
                    :model-value="td.editFloorIds.includes(f.id)"
                    class="h-4 w-4"
                    @update:model-value="td.toggleFloor(f.id)"
                  />
                  {{ f.name }}
                </label>
              </div>
            </div>
            <!-- TODO: section/usage 임시 비활성화 -->
            <!-- <div v-if="td.sections.length" class="space-y-1">
              <span class="text-xs text-muted-foreground">구간</span>
              <div class="flex flex-wrap gap-x-3 gap-y-1">
                <label
                  v-for="s in td.sections"
                  :key="s.id"
                  class="flex items-center gap-1.5 text-sm cursor-pointer"
                >
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
                <label
                  v-for="u in td.usages"
                  :key="u.id"
                  class="flex items-center gap-1.5 text-sm cursor-pointer"
                >
                  <Checkbox
                    :model-value="td.editUsageIds.includes(u.id)"
                    class="h-4 w-4"
                    @update:model-value="td.toggleUsage(u.id)"
                  />
                  {{ u.name }}
                </label>
              </div>
            </div> -->
          </div>
        </div>

        <!-- 부재 타입 -->
        <div v-if="td.componentTypes.length" class="space-y-1.5">
          <label class="text-sm font-medium">부재</label>
          <div class="flex flex-wrap gap-x-4 gap-y-1.5">
            <label
              v-for="ct in td.componentTypes"
              :key="ct.id"
              class="flex items-center gap-1.5 text-sm cursor-pointer"
            >
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

/* 패스 관리 모드에서만 핸들 표시 */
.path-mode :deep(.vue-flow__handle) {
  opacity: 1;
  pointer-events: auto;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #1f2937;
  border: 1px solid white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.path-mode :deep(.vue-flow__handle:hover) {
  width: 9px;
  height: 9px;
  background-color: #111827;
}

/* 노드 선택 상태: 엣지 핸들 완전 비활성화 */
.work-selected :deep(.vue-flow__handle) {
  visibility: hidden !important;
  pointer-events: none !important;
  opacity: 0 !important;
}

/* 커스텀 노드 테두리 복구 (default 노드와 동일) */
:deep(.vue-flow__node-work) {
  border: 1px solid var(--vf-node-color, #1a192b);
  border-radius: 3px;
  background: var(--vf-node-bg, #fff);
  overflow: visible;
}

:deep(.vue-flow__node-work.selected) {
  box-shadow: 0 0 0 0.5px var(--vf-box-shadow, #1a192b);
}

/* 휴일 미작업 노드: 점선 테두리 (12px 선 + 12px 간격) */
:deep(.vue-flow__node-work.holiday-node) {
  border: none !important;
  background-image:
    repeating-linear-gradient(to right, #000 0, #000 12px, transparent 12px, transparent 24px),
    repeating-linear-gradient(to right, #000 0, #000 12px, transparent 12px, transparent 24px),
    repeating-linear-gradient(to bottom, #000 0, #000 12px, transparent 12px, transparent 24px),
    repeating-linear-gradient(to bottom, #000 0, #000 12px, transparent 12px, transparent 24px);
  background-size:
    100% 1.5px,
    100% 1.5px,
    1.5px 100%,
    1.5px 100%;
  background-position:
    0 0,
    0 100%,
    0 0,
    100% 0;
  background-repeat: no-repeat;
}

:deep(.vue-flow__node-work.holiday-node--highlight) {
  background-image:
    repeating-linear-gradient(to right, var(--holiday-highlight-color) 0, var(--holiday-highlight-color) 12px, transparent 12px, transparent 24px),
    repeating-linear-gradient(to right, var(--holiday-highlight-color) 0, var(--holiday-highlight-color) 12px, transparent 12px, transparent 24px),
    repeating-linear-gradient(to bottom, var(--holiday-highlight-color) 0, var(--holiday-highlight-color) 12px, transparent 12px, transparent 24px),
    repeating-linear-gradient(to bottom, var(--holiday-highlight-color) 0, var(--holiday-highlight-color) 12px, transparent 12px, transparent 24px);
  background-size:
    100% 1.5px,
    100% 1.5px,
    1.5px 100%,
    1.5px 100%;
}

/* 엣지(패스)가 노드 위에 렌더링되도록: SVG 컨테이너를 노드 위로 */
:deep(.vue-flow__edges) {
  z-index: 1000 !important;
  position: absolute;
}
</style>
