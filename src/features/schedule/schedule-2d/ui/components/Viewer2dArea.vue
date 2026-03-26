<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted, markRaw } from 'vue'
import { VueFlow, useVueFlow, type Node, type Edge } from '@vue-flow/core'

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
import { DateStepper } from '@/shared/ui/date-stepper'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/shared/ui/context-menu'
import {
  workApi,
  type WorkResponse,
  type MutationResponse,
  type UpdateWorkPayload,
} from '@/shared/network-core/apis/work'
import { workDepApi, type WorkDepResponse } from '@/shared/network-core/apis/workDep'
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
  dateToDayIndex,
} from '@/features/schedule/schedule-2d/use-cases/nodeConfig'
import {
  computeRowLayout,
  computeWeeklyRowLayout,
  LEFT_HEADER_WIDTH,
  type RowLayout,
  type RefWorkType,
} from '@/features/schedule/schedule-2d/use-cases/rowLayout'
import { buildWorkBlocks, workBlockToNode } from '@/features/schedule/schedule-2d/use-cases/workBlockBuilder'
import { referenceApi } from '@/shared/network-core/apis/reference'
import WorkNode from './WorkNode.vue'
import WorkBlockNode from './WorkBlockNode.vue'
import LeftHeader from './LeftHeader.vue'
import ReferenceEditTrigger from '@/shared/helper-ui/ReferenceEditTrigger.vue'
import ReferenceEditDialog from '@/shared/helper-ui/ReferenceEditDialog.vue'
import { Settings } from 'lucide-vue-next'
import { appConfig } from '@/app/bootstrap/config'
import { analyticsClient } from '@/shared/analytics/analyticsClient'
import { scheduleApi } from '@/shared/network-core/apis/schedule'
import ExcludeSubWorkTypeDialog from './ExcludeSubWorkTypeDialog.vue'

// Composables
import {
  useDateHeader,
  ROW_HEIGHT,
  HEADER_HEIGHT,
  WEEKLY_HEADER_HEIGHT,
} from '@/features/schedule/schedule-2d/view-model/useDateHeader'
import { useDependencyEditor } from '@/features/schedule/schedule-2d/view-model/useDependencyEditor'
import { useScheduleVersion } from '@/features/schedule/schedule-2d/view-model/useScheduleVersion'
import { useWorkEditor } from '@/features/schedule/schedule-2d/view-model/useWorkEditor'
import { useWorkTooltipData } from '@/features/schedule/schedule-2d/view-model/useWorkTooltipData'

const emit = defineEmits<{
  'works-loaded': [works: WorkResponse[]]
}>()

// VueFlow
const nodes = ref<Node[]>([])
const edges = ref<Edge[]>([])
const { viewport, setViewport, onViewportChange } = useVueFlow()

// 위쪽 공백 방지: viewport.y > 0 이면 0으로 클램핑
onViewportChange(({ y, x, zoom }) => {
  if (y > 0) {
    setViewport({ x, y: 0, zoom })
  }
})

// 의존관계 상태
const deps = ref<WorkDepResponse[]>([])

// 버전 관리
const {
  versions,
  activeVersion,
  loadVersions,
  createVersion,
  duplicateVersion,
  updateVersionName,
  deleteVersion,
  setMainVersion,
  canCreate,
} = useScheduleVersion()
const editingVersionId = ref<number | null>(null)
const editingVersionName = ref('')
const pendingDeleteVersionId = ref<number | null>(null)

// workType → 팔레트 인덱스 맵 (nodes와 독립적으로 관리, groupBoxes와 공유)
const workTypePaletteMap = ref<Map<string, number>>(new Map())
const isLoadingWorks = ref(false)

// Reference tree (API 순서 보존)
const refTree = ref<RefWorkType[]>([])
const cornerDialogOpen = ref(false)
const zoneDialogOpen = ref(false)
const floorDialogOpen = ref(false)

function handleCornerDialogClose() {
  loadRefTree()
  td.loadReferenceData()
}

const loadRefTree = async () => {
  try {
    // 1라운드: divisions
    const divisions = await referenceApi.getDivisionList()

    // 2라운드: 모든 division의 workTypes 병렬
    const workTypesByDiv = await Promise.all(
      divisions.map((div) => referenceApi.getWorkTypeList(div.id)),
    )

    // 3라운드: 모든 workType의 subWorkTypes 병렬
    const allWorkTypes = workTypesByDiv.flat()
    const subsByWorkType = await Promise.all(
      allWorkTypes.map((wt) => referenceApi.getSubWorkTypeList(wt.id)),
    )

    // 순서 유지하며 트리 재구성
    refTree.value = allWorkTypes.map((wt, idx) => ({
      name: wt.name,
      subWorkTypes: subsByWorkType[idx]!.map((s) => ({ id: s.id, name: s.name })),
    }))
  } catch (error) {
    console.error('Reference tree 로드 실패:', error)
  }
}

// 행 배치용 ROW_UNIT (nodeHeight + 2 * nodePaddingY)
const ROW_UNIT = CHART_CONFIG.nodeHeight + 2 * CHART_CONFIG.nodePaddingY
// 노드를 행 내 수직 중앙에 배치하기 위한 오프셋
const NODE_OFFSET_Y = CHART_CONFIG.nodePaddingY

// 주단위화면 (Weekly View) — 행 높이·노드 높이 2배, 텍스트 2배
const WEEKLY_ROW_UNIT = ROW_UNIT * 2
const WEEKLY_NODE_HEIGHT = CHART_CONFIG.nodeHeight * 2
const WEEKLY_THRESHOLD = 0.4
const isWeeklyMode = ref(false)
const activeHeaderHeight = computed(() => isWeeklyMode.value ? WEEKLY_HEADER_HEIGHT : HEADER_HEIGHT)
const activeRowUnit = computed(() => isWeeklyMode.value ? WEEKLY_ROW_UNIT : ROW_UNIT)

// 우클릭으로 강조된 행 인덱스
const highlightedRowIndex = ref<number | null>(null)

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

// 주단위화면: row layout + work block nodes
const weeklyRowLayout = computed(() => {
  if (!isWeeklyMode.value) return null
  const works = nodes.value
    .filter((n) => n.id.startsWith('work-'))
    .map((n) => n.data.work as WorkResponse)
  return computeWeeklyRowLayout(works, refTree.value.length > 0 ? refTree.value : undefined)
})

// 주단위 화면용 workType → 팔레트 인덱스 (weeklyRowLayout.sections 순서 = LeftHeader BG_COLORS 순서)
const weeklyPaletteMap = computed(() => {
  const map = new Map<string, number>()
  if (!weeklyRowLayout.value) return map
  weeklyRowLayout.value.sections.forEach((section, idx) => {
    map.set(section.workType, idx)
  })
  return map
})

const weeklyNodes = computed(() => {
  if (!weeklyRowLayout.value) return []
  const works = nodes.value
    .filter((n) => n.id.startsWith('work-'))
    .map((n) => n.data.work as WorkResponse)
  const blocks = buildWorkBlocks(works, weeklyRowLayout.value)
  return blocks.map((block) => {
    const node = workBlockToNode(block, WEEKLY_ROW_UNIT, WEEKLY_NODE_HEIGHT)
    const wtIdx = weeklyPaletteMap.value.get(block.workType)
    if (wtIdx !== undefined) {
      const palette = GROUP_PALETTE[wtIdx % GROUP_PALETTE.length]!
      node.style = {
        ...node.style as Record<string, string>,
        backgroundColor: palette.nodeBg,
        borderColor: palette.nodeBorder,
      }
    }
    return node
  })
})

const activeNodes = computed({
  get: () => isWeeklyMode.value ? weeklyNodes.value : nodes.value,
  set: (val) => {
    if (!isWeeklyMode.value) nodes.value = val
  },
})

// 삭제 팝업 상태
const showDeleteDialog = ref(false)
const isDeleting = ref(false)


/** 노드 스타일을 단일 CSS 변수 --node-border 기반으로 빌드 */
function buildNodeStyle(
  work: WorkResponse,
  computedWidth: number,
  computedHeight: number,
  palette: (typeof GROUP_PALETTE)[number] | undefined,
  highlight?: { color: string },
): { style: Record<string, string>; class: string | undefined } {
  const borderColor = highlight?.color ?? palette?.nodeBorder ?? '#d1d5db'
  const isHoliday = !work.isWorkingOnHoliday

  const style: Record<string, string> = {
    width: `${computedWidth}px`,
    height: `${computedHeight}px`,
    overflow: 'visible',
    whiteSpace: 'nowrap',
    backgroundColor: palette?.nodeBg ?? '#ffffff',
  }

  // holiday(점선) 노드: gradient에서 색상을 CSS 변수로 참조해야 하므로 --node-border 사용
  // solid(실선) 노드: inline border 직접 설정 (CSS cascade 의존 제거)
  if (isHoliday) {
    style['--node-border'] = borderColor
  } else {
    style.border = `1px solid ${borderColor}`
  }

  if (highlight) {
    style.boxShadow = `0 0 8px ${highlight.color}50`
  }
  return {
    style,
    class: isHoliday ? 'holiday-node' : undefined,
  }
}

/** workToNode + 스타일 적용을 한 번에 처리 */
function styledWorkToNode(work: WorkResponse, yOverride?: number): Node {
  const node = workToNode(work, yOverride)
  const wtIdx = workTypePaletteMap.value.get(work.workType || '미분류')
  const palette = wtIdx !== undefined ? GROUP_PALETTE[wtIdx % GROUP_PALETTE.length]! : undefined
  const result = buildNodeStyle(
    work,
    node.data.computedWidth as number,
    node.data.computedHeight as number,
    palette,
  )
  node.style = result.style
  node.class = result.class
  return node
}

/** 날짜 겹침 + Y 위치를 판단하여 엣지 연결 Handle을 결정 */
function getEdgeHandles(
  sourceWorkId: number,
  targetWorkId: number,
): { sourceHandle: string; targetHandle: string } {
  const sourceNode = nodes.value.find((n) => n.id === `work-${sourceWorkId}`)
  const targetNode = nodes.value.find((n) => n.id === `work-${targetWorkId}`)
  if (!sourceNode || !targetNode)
    return { sourceHandle: 'source-right', targetHandle: 'target-left' }

  const sourceEnd = dateToDayIndex((sourceNode.data.work as WorkResponse).completionDate)
  const targetStart = dateToDayIndex((targetNode.data.work as WorkResponse).startDate)
  const overlap = targetStart <= sourceEnd

  if (!overlap) {
    return { sourceHandle: 'source-right', targetHandle: 'target-left' }
  }

  // 수직 연결: source가 target보다 아래에 있으면 위로 올라감
  const sourceBelow = sourceNode.position.y > targetNode.position.y
  return sourceBelow
    ? { sourceHandle: 'source-top', targetHandle: 'target-bottom' }
    : { sourceHandle: 'source-bottom', targetHandle: 'target-top' }
}


const GROUP_PALETTE = [
  {
    bg: 'rgba(59, 130, 246, 0.06)',
    border: 'rgba(59, 130, 246, 0.25)',
    subBg: 'rgba(59, 130, 246, 0.08)',
    subBorder: 'rgba(59, 130, 246, 0.35)',
    nodeBg: '#e8f0fe',
    nodeBorder: 'rgba(59, 130, 246, 0.7)',
  },
  {
    bg: 'rgba(16, 185, 129, 0.06)',
    border: 'rgba(16, 185, 129, 0.25)',
    subBg: 'rgba(16, 185, 129, 0.08)',
    subBorder: 'rgba(16, 185, 129, 0.35)',
    nodeBg: '#e2f5ec',
    nodeBorder: 'rgba(16, 185, 129, 0.7)',
  },
  {
    bg: 'rgba(245, 158, 11, 0.06)',
    border: 'rgba(245, 158, 11, 0.25)',
    subBg: 'rgba(245, 158, 11, 0.08)',
    subBorder: 'rgba(245, 158, 11, 0.35)',
    nodeBg: '#fdf5dc',
    nodeBorder: 'rgba(245, 158, 11, 0.7)',
  },
  {
    bg: 'rgba(168, 85, 247, 0.06)',
    border: 'rgba(168, 85, 247, 0.25)',
    subBg: 'rgba(168, 85, 247, 0.08)',
    subBorder: 'rgba(168, 85, 247, 0.35)',
    nodeBg: '#f0edfe',
    nodeBorder: 'rgba(168, 85, 247, 0.7)',
  },
  {
    bg: 'rgba(236, 72, 153, 0.06)',
    border: 'rgba(236, 72, 153, 0.25)',
    subBg: 'rgba(236, 72, 153, 0.08)',
    subBorder: 'rgba(236, 72, 153, 0.35)',
    nodeBg: '#fceef6',
    nodeBorder: 'rgba(236, 72, 153, 0.7)',
  },
  {
    bg: 'rgba(6, 182, 212, 0.06)',
    border: 'rgba(6, 182, 212, 0.25)',
    subBg: 'rgba(6, 182, 212, 0.08)',
    subBorder: 'rgba(6, 182, 212, 0.35)',
    nodeBg: '#e4f8fb',
    nodeBorder: 'rgba(6, 182, 212, 0.7)',
  },
]


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

// 작업 및 의존관계 데이터 로드
const loadWorkData = async (centerToday = false) => {
  isLoadingWorks.value = true
  try {
    const [works, depList] = await Promise.all([
      workApi.getWorkListByVersion(activeVersion.value),
      workDepApi.getWorkDepListByVersion(activeVersion.value),
    ])

    const layout = computeRowLayout(works, refTree.value.length > 0 ? refTree.value : undefined)

    // workType → 팔레트 인덱스 맵 구축 (rowLayout.sections 순서 = LeftHeader 순서)
    const paletteMap = new Map<string, number>()
    layout.sections.forEach((section, idx) => {
      paletteMap.set(section.workType, idx)
    })
    workTypePaletteMap.value = paletteMap
    nodes.value = works.map((w) => {
      const y = (layout.workRowMap.get(w.workId) ?? 0) * ROW_UNIT + NODE_OFFSET_Y
      return styledWorkToNode(w, y)
    })
    deps.value = depList

    // 의존관계 → 엣지 변환
    edges.value = depList.map((dep) => {
      const handles = getEdgeHandles(dep.sourceWorkId, dep.targetWorkId)
      return {
        id: `dep-${dep.id}`,
        source: `work-${dep.sourceWorkId}`,
        target: `work-${dep.targetWorkId}`,
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
        type: 'smoothstep',
        pathOptions: { borderRadius: 20, offset: 15 },
        style: { stroke: '#3b82f6' },
        data: {
          depId: dep.id,
          offset: 0,
          isFollowing: dep.lagDays !== null,
          lagDays: dep.lagDays,
        },
      }
    })

    // 오늘 날짜가 화면 중앙에 오도록 뷰포트 설정
    if (centerToday) {
      const container = containerRef.value
      if (container) {
        const containerWidth = container.clientWidth
        const zoom = 0.6
        const todayX = 0 // dayIndex=0이 오늘
        const centerX = (containerWidth / 2 - LEFT_HEADER_WIDTH / 2)
        setViewport({ x: -todayX * zoom + centerX, y: 0, zoom })
      }
    }

    emit('works-loaded', works)
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
      const updated = styledWorkToNode(work)
      return { ...updated, position: { ...updated.position, y: n.position.y } }
    })
    // rowLayout 기반으로 Y 재배치
    const layout = rowLayout.value
    nodes.value.forEach((n) => {
      const work = n.data.work as WorkResponse
      const row = layout.workRowMap.get(work.workId)
      if (row !== undefined) n.position.y = row * ROW_UNIT + NODE_OFFSET_Y
    })
    emit(
      'works-loaded',
      nodes.value.map((n) => n.data.work as WorkResponse),
    )
  }

  // 2) updatedWorkDeps 반영 → 의존관계 및 엣지 갱신
  if (mutation.updatedWorkDeps.length > 0) {
    const updatedDepIds = new Set(mutation.updatedWorkDeps.map((d) => d.id))
    // deps 배열 갱신
    const depMap = new Map(mutation.updatedWorkDeps.map((d) => [d.id, d]))
    // 기존 dep 업데이트 + 신규 dep 추가
    const existingIds = new Set(deps.value.map(d => d.id))
    deps.value = [
      ...deps.value.map((d) => depMap.get(d.id) ?? d),
      ...mutation.updatedWorkDeps.filter(d => !existingIds.has(d.id)),
    ]
    // 삭제된 dep 제거 (updatedWorkDeps에 없으면서 edges에서 사라진 것)
    // 해당 dep의 기존 엣지 제거 후 새로 생성
    edges.value = edges.value.filter((e) => !updatedDepIds.has(e.data?.depId))
    const newEdges = mutation.updatedWorkDeps.map((dep) => {
      const handles = getEdgeHandles(dep.sourceWorkId, dep.targetWorkId)
      return {
        id: `dep-${dep.id}`,
        source: `work-${dep.sourceWorkId}`,
        target: `work-${dep.targetWorkId}`,
        sourceHandle: handles.sourceHandle,
        targetHandle: handles.targetHandle,
        type: 'smoothstep',
        pathOptions: { borderRadius: 20, offset: 15 },
        style: { stroke: '#3b82f6' },
        data: {
          depId: dep.id,
          offset: 0,
          isFollowing: dep.lagDays !== null,
          lagDays: dep.lagDays,
        },
      }
    })
    edges.value = [...edges.value, ...newEdges]
  }
}

// 삭제 팝업 열기
const openDeleteDialog = () => {
  showDeleteDialog.value = true
}

// 삭제 실행
const executeDelete = async () => {
  isDeleting.value = true
  try {
    if (selectedWorkId.value) {
      const mutation = await workApi.deleteWork(selectedWorkId.value)
      const deletedNodeId = `work-${selectedWorkId.value}`
      edges.value = edges.value.filter(
        (e) => e.source !== deletedNodeId && e.target !== deletedNodeId,
      )
      // 관련 deps도 제거
      deps.value = deps.value.filter(
        (d) => d.sourceWorkId !== selectedWorkId.value && d.targetWorkId !== selectedWorkId.value,
      )
      nodes.value = nodes.value.filter((n) => n.id !== deletedNodeId)
      applyMutation(mutation)
      clearWorkSelection()
      emit(
        'works-loaded',
        nodes.value.map((n) => n.data.work as WorkResponse),
      )
      analyticsClient.trackAction('schedule_2d', 'delete_work', 'success')
    }
    showDeleteDialog.value = false
  } catch (error: unknown) {
    console.error('삭제 실패:', error)
    analyticsClient.trackAction('schedule_2d', 'delete_work', 'fail')
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
  styledEdges,
  createDep,
  updateLagDays,
  updateLagDaysLocal,
  deleteDep,
} = useDependencyEditor(edges, deps, activeVersion, applyMutation)

// 의존관계 연결 모드 상태
const connectingFrom = ref<{
  workId: number
  lagDays: number | null // null=후행작업추가, 0=따라가기추가
} | null>(null)

// 연결 모드에서 노드 하이라이트
watch(
  [connectingFrom],
  ([connecting]) => {
    nodes.value = nodes.value.map((node) => {
      const work = node.data.work as WorkResponse
      const workId = parseInt(node.id.replace('work-', ''))
      const wtIdx = workTypePaletteMap.value.get(work.workType || '미분류')
      const palette = wtIdx !== undefined ? GROUP_PALETTE[wtIdx % GROUP_PALETTE.length]! : undefined
      let highlight: { color: string } | undefined
      if (connecting && connecting.workId === workId) {
        highlight = { color: '#3b82f6' }
      }
      const result = buildNodeStyle(
        work,
        node.data.computedWidth as number,
        node.data.computedHeight as number,
        palette,
        highlight,
      )
      return { ...node, style: result.style, class: result.class }
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
const td = reactive(useWorkTooltipData(() => activeVersion.value))


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

// hover된 노드 추적 (지연 클리어로 노드→핸들 이동 시 DOM 소멸 방지)
const hoveredNodeId = ref<string | null>(null)
let hoverClearTimer: ReturnType<typeof setTimeout> | null = null

const setHoveredNode = (nodeId: string) => {
  if (hoverClearTimer) {
    clearTimeout(hoverClearTimer)
    hoverClearTimer = null
  }
  hoveredNodeId.value = nodeId
}

const cancelHoverClear = () => {
  if (hoverClearTimer) {
    clearTimeout(hoverClearTimer)
    hoverClearTimer = null
  }
}

const scheduleHoverClear = () => {
  cancelHoverClear()
  hoverClearTimer = setTimeout(() => {
    hoveredNodeId.value = null
    hoverClearTimer = null
  }, 100)
}

// hover 또는 선택된 노드의 양쪽 핸들 위치 computed (모서리 중앙)
const resizeHandles = computed(() => {
  const targetId =
    hoveredNodeId.value ?? (selectedWorkId.value ? `work-${selectedWorkId.value}` : null)
  if (!targetId) return null
  const node = nodes.value.find((n) => n.id === targetId)
  if (!node) return null
  const w = node.data.computedWidth as number
  const h = node.data.computedHeight as number
  return {
    left: { x: node.position.x, y: node.position.y + h / 2 },
    right: { x: node.position.x + w, y: node.position.y + h / 2 },
    halfH: h / 2,
  }
})

// 노드 클릭 핸들러 - 패스 연결 모드 또는 작업 선택 + 말풍선 표시
const onNodeClick = async (event: { node: Node; event: MouseEvent | TouchEvent }) => {
  const work = event.node.data.work as WorkResponse | undefined
  if (!work) return

  // 의존관계 연결 모드
  if (connectingFrom.value) {
    if (work.workId === connectingFrom.value.workId) return
    const result = await createDep(connectingFrom.value.workId, work.workId, connectingFrom.value.lagDays)
    connectingFrom.value = null
    if (result) loadWorkData()
    return
  }

  // 같은 노드 클릭 시 선택 해제
  if (selectedWorkId.value === work.workId) {
    clearWorkSelection()
    return
  }

  // 노드 선택
  selectWork(work.workId)
}

// 로컬 날짜를 YYYY-MM-DD 문자열로 변환
const formatLocalDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 컨텍스트 메뉴에서 휴일 작업 토글
const toggleHolidayFromContextMenu = async (work: WorkResponse) => {
  const newValue = !work.isWorkingOnHoliday
  try {
    const mutation = await workApi.updateWork(work.workId, { isWorkingOnHoliday: newValue })
    // 노드 갱신
    const directWork = mutation.updatedWorks.find((w) => w.workId === work.workId)
    if (directWork) {
      const updated = styledWorkToNode(directWork)
      const row = rowLayout.value.workRowMap.get(directWork.workId)
      const y = row !== undefined ? row * ROW_UNIT + NODE_OFFSET_Y : NODE_OFFSET_Y
      nodes.value = nodes.value.map((n) =>
        n.id === `work-${directWork.workId}`
          ? { ...updated, position: { ...updated.position, y } }
          : n,
      )
    }
    // cascade
    const cascadeMutation = {
      updatedWorks: mutation.updatedWorks.filter((w) => w.workId !== work.workId),
      updatedWorkDeps: mutation.updatedWorkDeps,
    }
    if (cascadeMutation.updatedWorks.length > 0 || cascadeMutation.updatedWorkDeps.length > 0) {
      applyMutation(cascadeMutation)
    }
    emit('works-loaded', nodes.value.map((n) => n.data.work as WorkResponse))
    analyticsClient.trackAction('schedule_2d', 'update_work', 'success')
  } catch (error: unknown) {
    console.error('휴일 설정 변경 실패:', error)
    analyticsClient.trackAction('schedule_2d', 'update_work', 'fail')
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  }
}

// 컨텍스트 메뉴 상태
const contextMenu = ref<{
  visible: boolean
  x: number
  y: number
  type: 'pane' | 'node'
  flowX?: number
  flowY?: number
  work?: WorkResponse
  nodeId?: string
} | null>(null)

// 연결 중 마우스 위치 (flow 좌표)
const connectingMousePos = ref<{ x: number; y: number } | null>(null)

const onConnectingMouseMove = (e: MouseEvent) => {
  const container = containerRef.value
  if (!container) return
  const rect = container.getBoundingClientRect()
  connectingMousePos.value = {
    x: (e.clientX - rect.left - LEFT_HEADER_WIDTH - viewport.value.x) / viewport.value.zoom,
    y: (e.clientY - rect.top - activeHeaderHeight.value - viewport.value.y) / viewport.value.zoom,
  }
}

watch(connectingFrom, (val) => {
  if (val) {
    document.addEventListener('mousemove', onConnectingMouseMove)
  } else {
    document.removeEventListener('mousemove', onConnectingMouseMove)
    connectingMousePos.value = null
  }
})

// 연결 중인 베지어 곡선 좌표 (source 노드 우측 중앙 → 커서)
const connectingLine = computed(() => {
  if (!connectingFrom.value || !connectingMousePos.value) return null
  const node = nodes.value.find((n) => n.id === `work-${connectingFrom.value!.workId}`)
  if (!node) return null
  const w = node.data.computedWidth as number
  const h = node.data.computedHeight as number
  const x1 = node.position.x + w
  const y1 = node.position.y + h / 2
  const x2 = connectingMousePos.value.x
  const y2 = connectingMousePos.value.y
  // 수평 오프셋으로 부드러운 커브 생성
  const dx = Math.abs(x2 - x1) * 0.5
  return {
    x1,
    y1,
    x2,
    y2,
    cx1: x1 + dx,
    cy1: y1,
    cx2: x2 - dx,
    cy2: y2,
  }
})

// 연결 중인 선 색상
const connectingColor = computed(() => '#3b82f6')

// 노드 우클릭 → 컨텍스트 메뉴
const onNodeContextMenu = (event: { node: Node; event: MouseEvent | TouchEvent }) => {
  event.event.preventDefault()
  if (isWeeklyMode.value) return
  const work = event.node.data.work as WorkResponse | undefined
  if (!work) return

  const mouseEvent = event.event as MouseEvent
  contextMenu.value = {
    visible: true,
    x: mouseEvent.clientX,
    y: mouseEvent.clientY,
    type: 'node',
    work,
    nodeId: event.node.id,
  }
}

// 다이얼로그 제출 → 생성 or 수정
const handleWorkEditSubmit = async () => {
  if (td.isCreateMode) {
    // 생성 모드
    const result = await td.submitCreate()
    if (!result) return

    const response = result.updatedWorks[0]!
    const newNode = styledWorkToNode(response)
    nodes.value = [...nodes.value, newNode]
    // rowLayout will recompute and place the node at the correct Y

    selectWork(response.workId)
  } else {
    // 수정 모드
    const editingId = td.editingWorkId
    const result = await td.submitEdit()
    if (!result) return

    const response = result.updatedWorks.find((w) => w.workId === editingId)!
    const updatedNode = styledWorkToNode(response)
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
        const updated = styledWorkToNode(w)
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

    // updatedWorkDeps도 반영
    if (result.updatedWorkDeps.length > 0) {
      applyMutation({ updatedWorks: [], updatedWorkDeps: result.updatedWorkDeps })
    }

  }

  emit(
    'works-loaded',
    nodes.value.map((n) => n.data.work as WorkResponse),
  )
}

// 빈 영역 클릭 시 — 선택 해제
const onPaneClick = () => {
  contextMenu.value = null
  highlightedRowIndex.value = null
  if (connectingFrom.value) {
    connectingFrom.value = null
    return
  }
  clearWorkSelection()
}

// 컨테이너 mousedown capture
const onContainerMouseDown = (event: MouseEvent) => {
  if (event.button !== 0) return
  const target = event.target as HTMLElement
  // 노드·컨트롤 위 mousedown은 해당 요소가 처리
  if (
    target.closest('.vue-flow__node') ||
    target.closest('.vue-flow__panel')
  )
    return
}

// 컨테이너 우클릭 → 배경 컨텍스트 메뉴 (작업 생성) — 주단위화면에서 비활성
const onContainerContextMenu = (event: MouseEvent) => {
  if (isWeeklyMode.value) { event.preventDefault(); return }
  // 노드/엣지 위에서 발생한 건 무시 (노드 우클릭은 별도 처리)
  const target = event.target as HTMLElement
  if (target.closest('.vue-flow__node') || target.closest('.vue-flow__edge')) return

  event.preventDefault()

  const container = containerRef.value
  if (!container) return
  const rect = container.getBoundingClientRect()
  const flowX =
    (event.clientX - rect.left - LEFT_HEADER_WIDTH - viewport.value.x) / viewport.value.zoom
  const flowY = (event.clientY - rect.top - activeHeaderHeight.value - viewport.value.y) / viewport.value.zoom

  // 우클릭한 행 강조
  const rowIndex = Math.floor(flowY / ROW_UNIT)
  if (rowIndex >= 0 && rowIndex < rowLayout.value.totalRows) {
    highlightedRowIndex.value = rowIndex
  } else {
    highlightedRowIndex.value = null
  }

  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    type: 'pane',
    flowX,
    flowY,
  }
}

// 컨텍스트 메뉴 액션: 작업 생성
const handleContextMenuCreate = () => {
  if (!contextMenu.value || contextMenu.value.type !== 'pane') return
  const { flowX, flowY } = contextMenu.value
  contextMenu.value = null
  if (flowX === undefined || flowY === undefined) return

  const resolved = resolveSubWorkTypeFromY(flowY)
  if (!resolved) return

  const dayIndex = Math.floor(flowX / appConfig.chart.pixelPerDay)
  const startDate = dayIndexToDate(dayIndex)

  const cfg = chartConfigStore.config
  const rowUnit = cfg.nodeHeight + 2 * cfg.nodePaddingY
  const snappedY = Math.floor(flowY / rowUnit) * rowUnit

  td.openCreateDialog(startDate, snappedY, resolved.subWorkTypeId, resolved.subWorkTypeName)
}

// 컨텍스트 메뉴 액션: 작업 수정
const handleContextMenuEdit = () => {
  if (!contextMenu.value?.work) return
  const work = contextMenu.value.work
  contextMenu.value = null
  td.openDialog(work)
}

// 컨텍스트 메뉴 액션: 후행작업추가
const handleContextMenuAddSuccessor = () => {
  if (!contextMenu.value?.work) return
  const workId = contextMenu.value.work.workId
  contextMenu.value = null
  connectingFrom.value = { workId, lagDays: 0 }
}

// 컨텍스트 메뉴 액션: 작업 삭제
const handleContextMenuDelete = () => {
  if (!contextMenu.value?.work) return
  const work = contextMenu.value.work
  contextMenu.value = null
  selectWork(work.workId)
  openDeleteDialog()
}

// 엣지 컨텍스트 메뉴 (우클릭 → 연결 삭제)
const edgeContextMenu = ref<{
  x: number
  y: number
  depId: number
  lagDays: number | null
  isFollowing: boolean
} | null>(null)

const onEdgeContextMenu = (event: { edge: Edge; event: MouseEvent | TouchEvent }) => {
  event.event.preventDefault()
  const depId = event.edge.data?.depId as number | undefined
  if (!depId) return
  const e = event.event as MouseEvent
  const lagDays = (event.edge.data?.lagDays as number | null) ?? null
  const isFollowing = lagDays !== null
  edgeContextMenu.value = {
    x: e.clientX,
    y: e.clientY,
    depId,
    lagDays: lagDays ?? 0,
    isFollowing,
  }
}

const edgeMenuSetLagDays = async (lagDays: number | null) => {
  if (!edgeContextMenu.value) return
  const depId = edgeContextMenu.value.depId
  edgeContextMenu.value = null
  await updateLagDays(depId, lagDays)
  loadWorkData()
}

const edgeMenuUpdateLocalLagDays = (delta: number) => {
  if (!edgeContextMenu.value) return
  const newDays = edgeContextMenu.value.lagDays + delta
  edgeContextMenu.value.lagDays = newDays
  updateLagDaysLocal(edgeContextMenu.value.depId, newDays)
}

const edgeMenuSaveLagDays = async () => {
  if (!edgeContextMenu.value) return
  const depId = edgeContextMenu.value.depId
  const lagDays = edgeContextMenu.value.lagDays
  edgeContextMenu.value = null
  await updateLagDays(depId, lagDays)
  loadWorkData()
}

const handleEdgeDelete = async () => {
  if (!edgeContextMenu.value) return
  const depId = edgeContextMenu.value.depId
  edgeContextMenu.value = null
  await deleteDep(depId)
  loadWorkData()
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
const onResizeStart = (side: 'left' | 'right', e: PointerEvent | MouseEvent) => {
  const targetId =
    hoveredNodeId.value ?? (selectedWorkId.value ? `work-${selectedWorkId.value}` : null)
  if (!targetId) return
  const node = nodes.value.find((n) => n.id === targetId)
  const work = node?.data.work as WorkResponse
  if (!node || !work) return
  e.stopPropagation()
  e.preventDefault()
  // 리사이즈 중 노드 드래그 방지
  node.draggable = false
  resizing.value = {
    side,
    workId: work.workId,
    startMouseX: e.clientX,
    origStartDate: work.startDate,
    origLeadTime: work.workLeadTime,
    origNodeX: node.position.x,
    origNodeWidth: node.data.computedWidth as number,
  }
  document.addEventListener('pointermove', onResizeMove)
  document.addEventListener('pointerup', onResizeEnd)
}

// 리사이즈 드래그 중 (날짜 단위 실시간 스냅)
const onResizeMove = (e: PointerEvent | MouseEvent) => {
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
  document.removeEventListener('pointermove', onResizeMove)
  document.removeEventListener('pointerup', onResizeEnd)
  if (!resizing.value) return

  const r = resizing.value
  const cfg = chartConfigStore.config
  const node = nodes.value.find((n) => n.id === `work-${r.workId}`)
  resizing.value = null
  if (!node) return
  // 리사이즈 종료 → 드래그 다시 활성화
  node.draggable = true

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
  // 리사이즈 중이면 드래그 차단
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

  const cfg = chartConfigStore.config

  // X축: 날짜 단위 스냅
  if (originalX !== undefined) {
    const daysDelta = Math.round((event.node.position.x - (originalX as number)) / cfg.pixelPerDay)
    event.node.position.x = (originalX as number) + daysDelta * cfg.pixelPerDay
  }

}

const ZOOM_MIN = 0.25
const ZOOM_MAX = 2
const ZOOM_FACTOR = 0.04

const handleVueFlowWheel = (e: WheelEvent) => {
  e.preventDefault()

  const zoomingOut = e.deltaY > 0
  const oldZoom = viewport.value.zoom

  // 화면 변경지점에서 첫 스크롤은 확대값 변경 없이 모드만 전환
  // 부동소수점 오차 허용 (0.04 단위 계산 시 정확히 0.4에 안 떨어질 수 있음)
  const EPS = 0.005
  if (zoomingOut && !isWeeklyMode.value && oldZoom <= WEEKLY_THRESHOLD + EPS) {
    analyticsClient.trackLayoutChangeByScroll('daily', 'weekly')
    isWeeklyMode.value = true
    return
  }
  if (!zoomingOut && isWeeklyMode.value && oldZoom >= WEEKLY_THRESHOLD - EPS) {
    analyticsClient.trackLayoutChangeByScroll('weekly', 'daily')
    isWeeklyMode.value = false
    return
  }

  const newZoom = Math.min(
    ZOOM_MAX,
    Math.max(ZOOM_MIN, oldZoom + (zoomingOut ? -ZOOM_FACTOR : ZOOM_FACTOR)),
  )
  if (newZoom === oldZoom) return

  // 마우스 커서 위치를 VueFlow wrapper 기준으로 계산
  const container = containerRef.value
  if (!container) return
  const rect = container.getBoundingClientRect()
  const mouseX = e.clientX - rect.left - LEFT_HEADER_WIDTH
  // Y축 확대/축소 기준점을 헤더 바로 아래(차트 최상단)로 고정
  const anchorY = 0

  // 커서 아래의 flow 좌표가 줌 후에도 동일 화면 위치에 유지되도록 viewport 보정
  const newX = mouseX - (mouseX - viewport.value.x) * (newZoom / oldZoom)
  const newY = anchorY - (anchorY - viewport.value.y) * (newZoom / oldZoom)

  setViewport({ x: newX, y: Math.min(0, newY), zoom: newZoom })
}

// ESC 키 처리
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    contextMenu.value = null
    connectingFrom.value = null
  }
}

// 어디든 클릭 시 컨텍스트 메뉴 닫기
const onDocumentClick = () => {
  contextMenu.value = null
  edgeContextMenu.value = null
}

// 버전 변경 시 데이터 재로드
watch(activeVersion, () => {
  loadWorkData(true)
})

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  document.addEventListener('click', onDocumentClick)
  await Promise.all([loadCalendarData(), loadRefTree(), td.loadReferenceData(), loadVersions()])
  loadWorkData(true)
  setupResizeObserver()
})

onUnmounted(() => {
  if (hoverClearTimer) clearTimeout(hoverClearTimer)
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('mousemove', onConnectingMouseMove)
  cleanupResizeObserver()
})

// ── 3주/3개월 공정표 생성 ──
const exportMenuOpen = ref(false)
const showExcludeDialog = ref(false)
const excludeDialogTitle = ref('')
const excludeDialogType = ref<'3week' | '3month'>('3week')

function openExcludeDialog(type: '3week' | '3month') {
  excludeDialogType.value = type
  excludeDialogTitle.value = type === '3week' ? '3주 공정표' : '3개월 공정표'
  showExcludeDialog.value = true
}

async function handleExcludeConfirm(excludedIds: number[]) {
  const type = excludeDialogType.value
  const actionName = type === '3week' ? 'create_3week_schedule' : 'create_3month_schedule'
  try {
    const excluded = excludedIds.length > 0 ? excludedIds : undefined
    const url =
      type === '3week'
        ? await scheduleApi.create3WeekSchedule(activeVersion.value, excluded)
        : await scheduleApi.create3MonthSchedule(activeVersion.value, excluded)
    const a = document.createElement('a')
    a.href = url
    a.download = type === '3week' ? '3주공정표.xlsx' : '3개월공정표.xlsx'
    a.click()
    URL.revokeObjectURL(url)
    analyticsClient.trackAction('schedule_2d', actionName, 'success')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.error('공정표 생성 실패:', e)
    const errorMessage = e.response?.data?.message || e.message
    alert(errorMessage)
    analyticsClient.trackAction('schedule_2d', actionName, 'fail')
  }
}
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 버전 탭 (엑셀 시트 스타일) -->
    <div class="flex items-center gap-1 pl-2 shrink-0 relative">
      <ContextMenu v-for="ver in versions" :key="ver.id">
        <ContextMenuTrigger as-child>
          <button
            class="px-4 py-2 text-sm rounded-t-md border border-b-0 transition-colors relative"
            :class="[
              activeVersion === ver.id
                ? 'bg-muted border-border -mb-px z-10'
                : 'bg-background border-transparent hover:bg-muted/50',
              ver.isMain ? 'text-blue-500 font-bold' : (activeVersion === ver.id ? 'text-foreground font-medium' : 'text-muted-foreground font-medium'),
            ]"
            @click="activeVersion = ver.id"
            @dblclick="editingVersionId = ver.id; editingVersionName = ver.versionName"
          >
            <template v-if="editingVersionId === ver.id">
              <input
                v-model="editingVersionName"
                class="w-24 bg-transparent border-none outline-none text-sm text-center"
                @blur="updateVersionName(ver.id, editingVersionName); editingVersionId = null"
                @keydown.enter="($event.target as HTMLInputElement).blur()"
                @keydown.escape="editingVersionId = null"
                @click.stop
                autofocus
              />
            </template>
            <template v-else>
              {{ ver.versionName }}
            </template>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem :disabled="ver.isMain" @select="setMainVersion(ver.id)">메인공정표로 지정</ContextMenuItem>
          <ContextMenuItem :disabled="!canCreate()" @select="duplicateVersion(ver.id)">공정표 복제</ContextMenuItem>
          <ContextMenuItem class="text-destructive focus:text-destructive" @select="pendingDeleteVersionId = ver.id">공정표 삭제</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <button
        v-if="canCreate()"
        class="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-t-md transition-colors"
        @click="createVersion()"
      >
        +
      </button>
      <div class="ml-auto pr-2 relative">
        <Button variant="outline" size="sm" class="bg-green-50 border-green-500 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900" @click="exportMenuOpen = !exportMenuOpen">엑셀 내보내기</Button>
        <div
          v-if="exportMenuOpen"
          class="absolute right-0 top-full mt-1 bg-popover border border-border rounded-md shadow-md py-1 min-w-[140px] z-50"
        >
          <button
            class="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
            @click="exportMenuOpen = false; openExcludeDialog('3week')"
          >
            3주 공정표
          </button>
          <button
            class="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
            @click="exportMenuOpen = false; openExcludeDialog('3month')"
          >
            3개월 공정표
          </button>
        </div>
      </div>
    </div>

    <!-- VueFlow 영역 -->
    <div
      ref="containerRef"
      class="relative flex-1 min-w-0 border border-border rounded-lg overflow-hidden"
      @wheel="handleVueFlowWheel"
      @mousedown.capture="onContainerMouseDown"
      @contextmenu="onContainerContextMenu"
    >
      <!-- 코너 셀 -->
      <div
        class="absolute z-30 bg-muted border-b border-r border-border flex flex-col items-center justify-center text-xs font-medium"
        :style="{ width: `${LEFT_HEADER_WIDTH}px`, height: `${activeHeaderHeight}px` }"
      >
        <!-- 일단위화면: 공종/세부공종 -->
        <template v-if="!isWeeklyMode">
          <span>공종 / 세부공종</span>
          <button
            class="mt-1 flex items-center gap-0.5 px-2 py-0.5 rounded text-[13px] text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
            @click="cornerDialogOpen = true"
          >
            <Settings class="w-3 h-3" />
            공종 편집
          </button>
        </template>
        <!-- 주단위화면: 공종/구역/층 -->
        <template v-else>
          <span>공종 / 구역 / 층</span>
          <div class="mt-0.5 flex items-center gap-1">
            <button
              class="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
              @click="cornerDialogOpen = true"
            >
              <Settings class="w-3 h-3" />
              공종
            </button>
            <button
              class="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
              @click="zoneDialogOpen = true"
            >
              <Settings class="w-3 h-3" />
              구역
            </button>
            <button
              class="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
              @click="floorDialogOpen = true"
            >
              <Settings class="w-3 h-3" />
              층
            </button>
          </div>
        </template>
      </div>
      <ReferenceEditDialog
        v-model:open="cornerDialogOpen"
        type="work-classification"
        @close="handleCornerDialogClose"
      />
      <ReferenceEditDialog
        v-model:open="zoneDialogOpen"
        type="zone"
        @close="handleCornerDialogClose"
      />
      <ReferenceEditDialog
        v-model:open="floorDialogOpen"
        type="floor"
        @close="handleCornerDialogClose"
      />

      <!-- 날짜 헤더 바 -->
      <div
        class="absolute top-0 right-0 bg-muted/80 border-b border-border z-20 overflow-hidden"
        :style="{ left: `${LEFT_HEADER_WIDTH}px`, height: `${activeHeaderHeight}px` }"
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

          <!-- Row 4~5: 날짜/요일 — 주단위화면에서 숨김 -->
          <template v-if="!isWeeklyMode">
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
          </template>
        </div>
      </div>

      <!-- 왼쪽 헤더 -->
      <LeftHeader
        :row-layout="rowLayout"
        :weekly-row-layout="weeklyRowLayout"
        :weekly-mode="isWeeklyMode"
        :viewport-y="viewport.y"
        :zoom="viewport.zoom"
        :header-height="activeHeaderHeight"
      />

      <!-- VueFlow wrapper: 헤더/좌측 패널 아래 영역에만 배치 (좌표계 정렬) -->
      <div
        class="absolute right-0 bottom-0"
        :style="{ top: `${activeHeaderHeight}px`, left: `${LEFT_HEADER_WIDTH}px` }"
      >
        <VueFlow
          v-model:nodes="activeNodes"
          :edges="isWeeklyMode ? [] : styledEdges"
          :node-types="{ work: markRaw(WorkNode), workblock: markRaw(WorkBlockNode) }"
          class="w-full h-full"
          :class="{
            'connecting-mode': !!connectingFrom,
          }"
          fit-view-on-init
          :min-zoom="0.01"
          :zoom-on-scroll="false"
          :zoom-on-pinch="false"
          :zoom-on-double-click="false"
          :disable-keyboard-a11y="true"
          :nodes-connectable="false"
          @node-click="onNodeClick"
          @node-context-menu="onNodeContextMenu"
          @edge-context-menu="onEdgeContextMenu"
          @node-mouse-enter="setHoveredNode($event.node.id)"
          @node-mouse-leave="scheduleHoverClear"
          @node-drag="onNodeDrag"
          @node-drag-stop="onNodeDragStop"
          @pane-click="onPaneClick"
        >
          <!-- 세로 줄 패턴 - 프로젝트 기간 내에서만 -->
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
              <!-- 비활성일 배경 (회색) — 주단위화면에서 숨김 -->
              <template v-if="!isWeeklyMode">
                <rect
                  v-for="dayIndex in deactivatedIndices"
                  :key="`deactivated-bg-${dayIndex}`"
                  :x="dayIndex * DAY_WIDTH"
                  y="-50000"
                  :width="DAY_WIDTH"
                  height="100000"
                  fill="rgba(107, 114, 128, 0.2)"
                />
              </template>
              <!-- 휴일 배경 (붉은색) — 주단위화면에서 숨김 -->
              <template v-if="!isWeeklyMode">
                <rect
                  v-for="dayIndex in holidayIndices"
                  :key="`holiday-bg-${dayIndex}`"
                  :x="dayIndex * DAY_WIDTH"
                  y="-50000"
                  :width="DAY_WIDTH"
                  height="100000"
                  fill="rgba(239, 68, 68, 0.1)"
                />
              </template>
              <!-- 오늘 배경 (파란색) -->
              <rect
                v-if="todayInProject !== null"
                :x="todayInProject * DAY_WIDTH"
                y="-50000"
                :width="DAY_WIDTH"
                height="100000"
                fill="rgba(59, 130, 246, 0.3)"
              />
              <!-- 세로선 그리드: 일별(기본) / 주별(주단위화면) -->
              <template v-if="isWeeklyMode">
                <line
                  v-for="cell in weekCells"
                  :key="`week-vline-${cell.startIndex}`"
                  :x1="cell.startIndex * DAY_WIDTH"
                  y1="-50000"
                  :x2="cell.startIndex * DAY_WIDTH"
                  y2="50000"
                  stroke="#888"
                  stroke-opacity="0.7"
                  stroke-width="2"
                />
              </template>
              <rect
                v-else
                :x="projectGridBounds.startX"
                y="-50000"
                :width="projectGridBounds.width"
                height="100000"
                fill="url(#vertical-lines)"
              />
              <!-- 우클릭 행 강조 -->
              <rect
                v-if="highlightedRowIndex !== null"
                x="-50000"
                :y="highlightedRowIndex * activeRowUnit"
                width="100000"
                :height="activeRowUnit"
                fill="rgba(255, 255, 0, 0.15)"
              />
              <!-- 가로 구분선 (행 경계) -->
              <line
                v-for="ri in (isWeeklyMode ? (weeklyRowLayout?.totalRows ?? 0) : rowLayout.totalRows) + 1"
                :key="`hline-${ri}`"
                x1="-50000"
                :y1="(ri - 1) * activeRowUnit"
                x2="50000"
                :y2="(ri - 1) * activeRowUnit"
                :stroke="isWeeklyMode ? '#aaa' : '#d1d5db'"
                :stroke-opacity="isWeeklyMode ? 0.8 : 0.4"
                :stroke-width="isWeeklyMode ? 1 : 1"
              />
              <!-- 휴일명/비활성일 사유 세로 텍스트 — 주단위화면에서 숨김 -->
              <template v-if="!isWeeklyMode">
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
              </template>

              <!-- 패스 연결 중인 베지어 곡선 (source → 커서) -->
              <path
                v-if="connectingLine"
                :d="`M ${connectingLine.x1} ${connectingLine.y1} C ${connectingLine.cx1} ${connectingLine.cy1}, ${connectingLine.cx2} ${connectingLine.cy2}, ${connectingLine.x2} ${connectingLine.y2}`"
                :stroke="connectingColor"
                stroke-width="2"
                stroke-dasharray="8 4"
                fill="none"
              />
              <!-- 연결 중 source 노드 강조 원 -->
              <circle
                v-if="connectingLine"
                :cx="connectingLine.x1"
                :cy="connectingLine.y1"
                r="4"
                :fill="connectingColor"
              />
            </g>
          </svg>

        </VueFlow>
      </div>

      <!-- 리사이즈 핸들 (VueFlow 바깥, 컨테이너 직속 — 노드 드래그 이벤트 간섭 방지) -->
      <template v-if="resizeHandles && !connectingFrom">
        <!-- 왼쪽 모서리 ◀▶ — scale 중심: 노드 왼쪽 모서리 중앙 -->
        <div
          class="absolute z-40 cursor-col-resize flex items-center justify-center"
          style="pointer-events: auto; background: transparent"
          :style="{
            left: `${LEFT_HEADER_WIDTH + resizeHandles.left.x * viewport.zoom + viewport.x}px`,
            top: `${activeHeaderHeight + resizeHandles.left.y * viewport.zoom + viewport.y}px`,
            width: '16px',
            height: `${resizeHandles.halfH * 2}px`,
            transform: `translate(-50%, -50%) scale(${viewport.zoom})`,
            transformOrigin: 'center center',
          }"
          @pointerdown.stop.prevent="onResizeStart('left', $event)"
          @mouseenter="cancelHoverClear"
          @mouseleave="scheduleHoverClear"
        >
          <div style="display: flex; align-items: center; gap: 5px">
            <div
              style="width: 0; height: 0; border-top: 5px solid transparent; border-bottom: 5px solid transparent; border-right: 6px solid #1f2937"
            />
            <div
              style="width: 0; height: 0; border-top: 5px solid transparent; border-bottom: 5px solid transparent; border-left: 6px solid #1f2937"
            />
          </div>
        </div>
        <!-- 오른쪽 모서리 ◀▶ — scale 중심: 노드 오른쪽 모서리 중앙 -->
        <div
          class="absolute z-40 cursor-col-resize flex items-center justify-center"
          style="pointer-events: auto; background: transparent"
          :style="{
            left: `${LEFT_HEADER_WIDTH + resizeHandles.right.x * viewport.zoom + viewport.x}px`,
            top: `${activeHeaderHeight + resizeHandles.right.y * viewport.zoom + viewport.y}px`,
            width: '16px',
            height: `${resizeHandles.halfH * 2}px`,
            transform: `translate(-50%, -50%) scale(${viewport.zoom})`,
            transformOrigin: 'center center',
          }"
          @pointerdown.stop.prevent="onResizeStart('right', $event)"
          @mouseenter="cancelHoverClear"
          @mouseleave="scheduleHoverClear"
        >
          <div style="display: flex; align-items: center; gap: 5px">
            <div
              style="width: 0; height: 0; border-top: 5px solid transparent; border-bottom: 5px solid transparent; border-right: 6px solid #1f2937"
            />
            <div
              style="width: 0; height: 0; border-top: 5px solid transparent; border-bottom: 5px solid transparent; border-left: 6px solid #1f2937"
            />
          </div>
        </div>
      </template>

      <!-- 패스 연결 모드 안내 -->
      <div
        v-if="connectingFrom"
        class="absolute top-2 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg shadow-lg"
      >
        연결할 작업을 클릭하세요 (ESC: 취소)
      </div>

      <!-- 컨텍스트 메뉴 -->
      <Teleport to="body">
        <div
          v-if="contextMenu?.visible"
          class="fixed z-[9999] min-w-[160px] py-1 bg-popover border border-border rounded-lg shadow-xl"
          :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
          @click.stop
        >
          <!-- 배경 메뉴 -->
          <template v-if="contextMenu.type === 'pane'">
            <button
              type="button"
              class="w-full px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors"
              @click="handleContextMenuCreate"
            >
              작업 생성
            </button>
          </template>

          <!-- 노드 메뉴 -->
          <template v-if="contextMenu.type === 'node'">
            <div class="px-3 py-1 text-xs text-muted-foreground border-b border-border mb-1">
              ID: {{ contextMenu.work?.workId }}
            </div>
            <button
              type="button"
              class="w-full px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors"
              @click="handleContextMenuEdit"
            >
              작업 수정
            </button>
            <button
              type="button"
              class="w-full px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors"
              @click="handleContextMenuAddSuccessor"
            >
              후행작업 추가
            </button>
            <button
              v-if="contextMenu.work"
              type="button"
              class="w-full px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors"
              @click="toggleHolidayFromContextMenu(contextMenu.work!); contextMenu = null"
            >
              {{ contextMenu.work.isWorkingOnHoliday ? '휴일휴무로 변경' : '휴일작업으로 변경' }}
            </button>
            <div class="my-1 border-t border-border" />
            <button
              type="button"
              class="w-full px-3 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors"
              @click="handleContextMenuDelete"
            >
              작업 삭제
            </button>
          </template>
        </div>
      </Teleport>

      <!-- 엣지 컨텍스트 메뉴 -->
      <Teleport to="body">
        <template v-if="edgeContextMenu">
          <div class="fixed inset-0 z-[9998]" @click="edgeContextMenu = null" />
          <div
            class="fixed z-[9999] min-w-[180px] rounded-md border border-border bg-popover py-1 shadow-lg"
            :style="{ left: `${edgeContextMenu.x}px`, top: `${edgeContextMenu.y}px` }"
          >
            <div class="px-3 py-1 text-xs text-muted-foreground border-b border-border mb-1">
              ID: {{ edgeContextMenu.depId }}
            </div>
            <!-- 따라가기로 변경 (현재 따라가기가 아닐 때) -->
            <button
              v-if="!edgeContextMenu.isFollowing"
              type="button"
              class="w-full px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors"
              @click="edgeMenuSetLagDays(0)"
            >
              따라가기로 변경
            </button>

            <!-- 따라가기 날짜 변경 (현재 따라가기일 때) -->
            <template v-if="edgeContextMenu.isFollowing">
              <div class="px-3 py-1.5 flex items-center gap-1.5">
                <span class="text-sm text-muted-foreground shrink-0">따라가기</span>
                <button
                  type="button"
                  class="flex items-center justify-center w-5 h-5 text-xs font-medium rounded border border-border bg-background hover:bg-muted transition-colors"
                  @click.stop="edgeMenuUpdateLocalLagDays(-1)"
                >
                  −
                </button>
                <span class="text-xs text-center select-none min-w-[24px]">{{ edgeContextMenu.lagDays }}일</span>
                <button
                  type="button"
                  class="flex items-center justify-center w-5 h-5 text-xs font-medium rounded border border-border bg-background hover:bg-muted transition-colors"
                  @click.stop="edgeMenuUpdateLocalLagDays(1)"
                >
                  +
                </button>
                <span class="text-xs" :class="edgeContextMenu.lagDays < 0 ? 'text-blue-500' : edgeContextMenu.lagDays > 0 ? 'text-orange-500' : 'text-muted-foreground'">
                  {{ edgeContextMenu.lagDays < 0 ? `${Math.abs(edgeContextMenu.lagDays)}일 겹치기` : edgeContextMenu.lagDays === 0 ? '다음날' : `${edgeContextMenu.lagDays}일 벌리기` }}
                </span>
                <button
                  type="button"
                  class="ml-auto px-1.5 py-0.5 text-[10px] font-medium rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                  @click.stop="edgeMenuSaveLagDays()"
                >
                  저장
                </button>
              </div>

              <!-- 따라가기 해제 -->
              <button
                type="button"
                class="w-full px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors"
                @click="edgeMenuSetLagDays(null)"
              >
                따라가기 해제
              </button>
            </template>

            <div class="my-1 border-t border-border" />
            <button
              type="button"
              class="w-full px-3 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors"
              @click="handleEdgeDelete"
            >
              연결 삭제
            </button>
          </div>
        </template>
      </Teleport>

    </div>
  </div>

  <!-- 세부공종 제외 다이얼로그 -->
  <ExcludeSubWorkTypeDialog
    :open="showExcludeDialog"
    :title="excludeDialogTitle"
    @update:open="showExcludeDialog = $event"
    @confirm="handleExcludeConfirm"
  />

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

  <!-- 공정표 삭제 확인 다이얼로그 -->
  <AlertDialog :open="pendingDeleteVersionId != null">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>공정표 삭제</AlertDialogTitle>
        <AlertDialogDescription>
          <template v-if="versions.find(v => v.id === pendingDeleteVersionId)?.isMain">
            <span class="text-destructive font-bold">이 공정표는 주 공정표입니다.</span> 정말 삭제하시겠습니까?
          </template>
          <template v-else>
            '{{ versions.find(v => v.id === pendingDeleteVersionId)?.versionName }}' 공정표를 삭제하시겠습니까?
          </template>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="pendingDeleteVersionId = null">취소</AlertDialogCancel>
        <Button variant="destructive" @click="() => { const id = pendingDeleteVersionId!; pendingDeleteVersionId = null; deleteVersion(id) }">
          삭제
        </Button>
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
            <DateStepper v-model="td.editStartDate" />
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
          <div class="flex items-center gap-1">
            <label class="text-sm font-medium">세부공종</label>
            <ReferenceEditTrigger type="work-classification" @refresh="td.loadReferenceData" />
          </div>
          <div class="h-8 flex items-center text-sm rounded-md border border-border bg-muted px-3">
            {{ td.createSubWorkTypeName }}
          </div>
        </div>
        <div v-else>
          <div class="flex items-center gap-1 mb-1.5">
            <label class="text-sm font-medium">공종</label>
            <ReferenceEditTrigger type="work-classification" @refresh="td.loadReferenceData" />
          </div>
          <div class="grid grid-cols-[1fr_2fr_2fr] gap-2">
            <Select
              :model-value="td.editDivisionId"
              @update:model-value="td.handleTooltipDivisionChange($event)"
            >
              <SelectTrigger class="h-8 text-sm">
                <SelectValue placeholder="분류" />
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
                <SelectValue :placeholder="td.isLoadingTooltipWorkTypes ? '로딩...' : '공종'" />
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
                  :placeholder="td.isLoadingTooltipSubWorkTypes ? '로딩...' : '세부공종'"
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="s in td.tooltipSubWorkTypes" :key="s.id" :value="String(s.id)">{{
                  s.name
                }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <!-- 위치 (Zone, Floor, Section, Usage) — 다중 선택 -->
        <div class="space-y-1.5">
          <div class="flex items-center gap-1">
            <label class="text-sm font-medium">위치</label>
            <ReferenceEditTrigger type="location" @refresh="td.loadReferenceData" />
          </div>
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
        <div class="space-y-1.5">
          <div class="flex items-center gap-1">
            <label class="text-sm font-medium">부재</label>
            <ReferenceEditTrigger type="component" @refresh="td.loadReferenceData" />
          </div>
          <div v-if="!td.componentTypes.length" class="text-sm text-muted-foreground">
            등록된 부재 타입 없음
          </div>
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
/* 엣지 핸들 숨김 (위치 계산용으로 렌더링은 유지) */
:deep(.vue-flow__handle) {
  opacity: 0 !important;
  width: 1px !important;
  height: 1px !important;
  min-width: 0 !important;
  min-height: 0 !important;
  pointer-events: none !important;
}

/* 패스 연결 모드: 커서 변경 */
.connecting-mode :deep(.vue-flow__pane) {
  cursor: crosshair;
}
.connecting-mode :deep(.vue-flow__node) {
  cursor: crosshair;
}

/* 커스텀 노드 테두리 — 단일 CSS 변수 --node-border로 제어 */
:deep(.vue-flow__node-work) {
  border-radius: 3px;
  overflow: visible;
}

:deep(.vue-flow__node-work.selected) {
  box-shadow: 0 0 0 0.5px var(--vf-box-shadow, #1a192b);
}

/* 휴일 미작업 노드: 점선 테두리 (12px 선 + 12px 간격) — --node-border 사용 */
:deep(.vue-flow__node-work.holiday-node) {
  border: none !important;
  background-image:
    repeating-linear-gradient(
      to right,
      var(--node-border, #d1d5db) 0,
      var(--node-border, #d1d5db) 12px,
      transparent 12px,
      transparent 24px
    ),
    repeating-linear-gradient(
      to right,
      var(--node-border, #d1d5db) 0,
      var(--node-border, #d1d5db) 12px,
      transparent 12px,
      transparent 24px
    ),
    repeating-linear-gradient(
      to bottom,
      var(--node-border, #d1d5db) 0,
      var(--node-border, #d1d5db) 12px,
      transparent 12px,
      transparent 24px
    ),
    repeating-linear-gradient(
      to bottom,
      var(--node-border, #d1d5db) 0,
      var(--node-border, #d1d5db) 12px,
      transparent 12px,
      transparent 24px
    );
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

/* 엣지(패스)가 노드 위에 렌더링되도록: SVG 컨테이너를 노드 위로 */
:deep(.vue-flow__edges) {
  z-index: 1000 !important;
  position: absolute;
}
</style>
