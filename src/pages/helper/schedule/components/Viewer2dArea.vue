<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
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
import { workApi, type WorkResponse } from '@/api/work'
import { workPathApi, type PathResponse } from '@/api/workPath'
import { useProjectStore } from '@/stores/project'
import { useCalendarStore } from '@/stores/calendarStore'
import { useChartConfigStore } from '@/stores/chartConfigStore'
import { worksToNodes, computeNodeX, computeNodeWidth } from '../nodeConfig'

// Composables
import { useDateHeader, ROW_HEIGHT, HEADER_HEIGHT } from '../composables/schedule2D/useDateHeader'
import { usePathEditor } from '../composables/schedule2D/usePathEditor'
import { useWorkEditor } from '../composables/schedule2D/useWorkEditor'

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

// 최적화 팝업 상태
const showOptimizeDialog = ref(false)
const optimizeType = ref<'single' | 'all'>('single')
const isOptimizing = ref(false)

// 삭제 팝업 상태
const showDeleteDialog = ref(false)
const deleteType = ref<'work' | 'path'>('work')
const isDeleting = ref(false)

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

// 최적화 팝업 열기
const openOptimizeDialog = (type: 'single' | 'all') => {
  optimizeType.value = type
  showOptimizeDialog.value = true
}

// 최적화 실행
const executeOptimize = async () => {
  isOptimizing.value = true
  try {
    if (optimizeType.value === 'single' && selectedPathId.value) {
      await workPathApi.optimizeWorkPath(selectedPathId.value)
    } else {
      await workPathApi.optimizeWorkPath('all')
    }
    // 최적화 후 work 목록 다시 조회
    await loadWorkData()
    showOptimizeDialog.value = false
  } catch (error: unknown) {
    console.error('최적화 실패:', error)
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    const errorMessage = err.response?.data?.message || err.message
    alert(errorMessage)
  } finally {
    isOptimizing.value = false
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
      await workApi.deleteWork(selectedWorkId.value)
      clearWorkSelection()
      tooltip.value.visible = false
    } else if (deleteType.value === 'path' && selectedPathId.value) {
      await workPathApi.deleteWorkPath(selectedPathId.value)
      cancelPathEdit()
    }
    await loadWorkData()
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
  isPathEditMode,
  selectedPathColor,
  pathNodeIds,
  deleteButtonNodes,
  styledEdges,
  togglePathSelection,
  cancelPathEdit,
  onConnect,
  removeNodeFromPath,
} = usePathEditor(nodes, edges, paths, loadWorkData)

// 패스 편집 모드에서 노드 하이라이트
watch(
  [isPathEditMode, selectedPathColor, pathNodeIds],
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
} = useWorkEditor(nodes, loadWorkData)

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

  // 패스 편집 모드일 때는 노드 연결용 클릭만 처리
  if (isPathEditMode.value) {
    // 패스 편집 모드에서는 노드 선택만 하고 말풍선은 표시하지 않음
    return
  }

  // 같은 노드 클릭 시 선택 해제
  if (selectedWorkId.value === work.workId) {
    clearWorkSelection()
    tooltip.value.visible = false
    return
  }

  // 노드 선택
  selectWork(work.workId)

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
    await workApi.updateWork(tooltip.value.workId, {
      startDate: tooltip.value.startDate,
      workLeadTime: tooltip.value.workLeadTime,
      isWorkingOnHoliday: tooltip.value.isWorkingOnHoliday
    })
    workEditForm.value.startDate = tooltip.value.startDate
    workEditForm.value.workLeadTime = tooltip.value.workLeadTime
    workEditForm.value.isWorkingOnHoliday = tooltip.value.isWorkingOnHoliday
    await loadWorkData()
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

// 엣지 클릭 시 해당 패스의 패스관리모드 진입
const onEdgeClick = (event: { edge: Edge }) => {
  const pathId = event.edge.data?.pathId as number | undefined
  if (!pathId) return
  handlePathToggle(pathId)
}

// 빈 영역 클릭 시 선택 해제
const onPaneClick = () => {
  tooltip.value.visible = false
  if (isPathEditMode.value) {
    cancelPathEdit()
  } else {
    clearWorkSelection()
  }
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
    const daysDelta = Math.trunc((event.node.position.x - originalX) / cfg.pixelPerDay)

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
      await workApi.updateWork(work.workId, {
        startDate: newStartDate,
        workLeadTime: work.workLeadTime
      })

      workEditForm.value.startDate = newStartDate
      // 연관 작업들의 위치도 갱신
      await loadWorkData()
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

// 리사이즈 드래그 중
const onResizeMove = (e: MouseEvent) => {
  if (!resizing.value) return
  const r = resizing.value
  const cfg = chartConfigStore.config
  const pixelDelta = e.clientX - r.startMouseX
  const flowDelta = pixelDelta / viewport.value.zoom
  const daysDelta = Math.trunc(flowDelta / cfg.pixelPerDay)

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
    await workApi.updateWork(r.workId, {
      startDate: newStartDate,
      workLeadTime: newLeadTime
    })
    workEditForm.value.startDate = newStartDate
    workEditForm.value.workLeadTime = newLeadTime
    await loadWorkData()
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

  if (isSelectedWork) {
    // 선택된 작업: Y축 고정, X축만 이동
    event.node.position.y = work.positionY
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

onMounted(async () => {
  await loadCalendarData()
  loadWorkData()
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
        :class="{ 'path-mode': isPathEditMode }"
        :style="{ paddingTop: `${HEADER_HEIGHT}px` }"
        fit-view-on-init
        :min-zoom="0.5"
        :zoom-on-scroll="false"
        :disable-keyboard-a11y="true"
        @node-click="onNodeClick"
        @node-drag="onNodeDrag"
        @node-drag-stop="onNodeDragStop"
        @pane-click="onPaneClick"
        @edge-click="onEdgeClick"
        @connect="onConnect"
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

        <!-- 말풍선 - VueFlow 내부에 배치, 뷰포트 반응형 바인딩 -->
        <div
          v-if="tooltip.visible"
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

            <!-- 시작일 -->
            <div class="space-y-0.5">
              <label class="text-[11px] text-muted-foreground">시작일</label>
              <div class="flex items-center gap-0.5">
                <button class="h-7 w-7 flex items-center justify-center rounded border border-border text-xs font-bold hover:bg-muted transition-colors" @click="adjustTooltipStartDate(-1)">−</button>
                <input
                  type="date"
                  :value="tooltip.startDate"
                  class="h-7 text-xs text-center flex-1 min-w-0 rounded border border-border bg-background px-1"
                  @change="updateTooltipWork({ startDate: ($event.target as HTMLInputElement).value })"
                />
                <button class="h-7 w-7 flex items-center justify-center rounded border border-border text-xs font-bold hover:bg-muted transition-colors" @click="adjustTooltipStartDate(1)">+</button>
              </div>
            </div>

            <!-- 작업기간 -->
            <div class="space-y-0.5">
              <label class="text-[11px] text-muted-foreground">작업기간</label>
              <div class="flex items-center gap-0.5">
                <button class="h-7 w-7 flex items-center justify-center rounded border border-border text-xs font-bold hover:bg-muted transition-colors" :disabled="tooltip.workLeadTime <= 1" @click="adjustTooltipLeadTime(-1)">−</button>
                <span class="h-7 flex-1 flex items-center justify-center text-xs font-medium rounded border border-border bg-background">{{ tooltip.workLeadTime }}일</span>
                <button class="h-7 w-7 flex items-center justify-center rounded border border-border text-xs font-bold hover:bg-muted transition-colors" @click="adjustTooltipLeadTime(1)">+</button>
              </div>
            </div>

            <!-- 완료일 (읽기전용) -->
            <p class="text-[11px] text-muted-foreground">완료일: <span class="font-medium text-foreground">{{ tooltip.completionDate }}</span></p>

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
        <template v-if="resizeHandles && !isPathEditMode">
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
            @click="removeNodeFromPath(btn.workId)"
          >
            <span class="text-xs font-bold">×</span>
          </button>
        </template>

        <Controls position="bottom-right" />
      </VueFlow>

      <!-- 패스 팝업 (우측 상단) -->
      <div
        v-if="selectedPathId"
        class="absolute top-[calc(var(--header-h)+8px)] right-3 z-30 bg-popover border border-border rounded-lg shadow-lg p-3 space-y-2 min-w-[200px]"
        :style="{ '--header-h': `${HEADER_HEIGHT}px` }"
      >
        <div class="flex items-center gap-2">
          <div
            class="w-3 h-3 rounded-full border border-border shrink-0"
            :style="{ backgroundColor: selectedPathColor }"
          />
          <span class="text-sm font-medium">
            {{ paths.find(p => p.workPathId === selectedPathId)?.workPathName }}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          class="w-full text-xs h-7"
          @click="openOptimizeDialog('single')"
        >
          현재 패스 최적화
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="w-full text-xs h-7"
          @click="openOptimizeDialog('all')"
        >
          모든 패스 최적화
        </Button>
      </div>

      <!-- 사용법 안내 -->
      <div class="absolute bottom-3 left-3 flex items-center gap-3 text-xs text-muted-foreground/60 bg-background/80 px-3 py-1.5 rounded z-10">
        <span>휠: 줌 | 드래그: 이동</span>
        <span v-if="selectedWork" class="flex items-center gap-1.5 text-primary/70">
          |
          <span class="inline-flex items-center gap-1 ml-1.5">
            <kbd class="px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 font-mono font-semibold text-[11px]">A</kbd>
            <span>◀ 1일</span>
          </span>
          <span class="inline-flex items-center gap-1">
            <kbd class="px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 font-mono font-semibold text-[11px]">D</kbd>
            <span>1일 ▶</span>
          </span>
          <span class="inline-flex items-center gap-1">
            <kbd class="px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 font-mono font-semibold text-[11px]">W</kbd>
            <span>▲</span>
          </span>
          <span class="inline-flex items-center gap-1">
            <kbd class="px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 font-mono font-semibold text-[11px]">S</kbd>
            <span>▼</span>
          </span>
        </span>
      </div>
    </div>

  </div>

  <!-- 최적화 확인 다이얼로그 -->
  <AlertDialog v-model:open="showOptimizeDialog">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>패스 최적화</AlertDialogTitle>
        <AlertDialogDescription>
          정말 최적화를 진행하시겠습니까?
          <br />
          패스 내 작업들 사이의 빈 날짜가 제거되어 연속으로 배치됩니다.
          <br />
          <span class="text-amber-600 font-medium">최적화는 오늘 이후의 날짜만 진행됩니다.</span>
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
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #1f2937;
  border: 1px solid white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.path-mode :deep(.vue-flow__handle:hover) {
  width: 8px;
  height: 8px;
  background-color: #111827;
}
</style>
