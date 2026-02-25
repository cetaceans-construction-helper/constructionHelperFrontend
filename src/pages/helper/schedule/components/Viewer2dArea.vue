<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { VueFlow, useVueFlow, type Node, type Edge } from '@vue-flow/core'
import { Controls } from '@vue-flow/controls'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
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
import SideTabBox from '@/components/helper/SideTabBox.vue'
import { workApi, type WorkResponse } from '@/api/work'
import { workPathApi, type PathResponse } from '@/api/workPath'
import { useProjectStore } from '@/stores/project'
import { useCalendarStore } from '@/stores/calendarStore'
import { worksToNodes } from '../nodeConfig'

// Composables
import { useWorkForm } from '../composables/schedule2D/useWorkForm'
import { useDateHeader, DAY_WIDTH, ROW_HEIGHT, HEADER_HEIGHT } from '../composables/schedule2D/useDateHeader'
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
const pathFormState = ref({ pathName: '', pathColor: '#3b82f6' })
const isCreatingPath = ref(false)
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
  startDate: string
  workLeadTime: number
  completionDate: string
}>({
  visible: false,
  nodeX: 0,
  nodeY: 0,
  workId: null,
  startDate: '',
  workLeadTime: 0,
  completionDate: ''
})

// 작업 생성 폼 접기/펼치기
const isWorkFormExpanded = ref(false)
const isPathFormExpanded = ref(false)

// 사이드바 탭 상태
const sidebarTab = ref('manage')

// 프로젝트 및 캘린더 데이터
const projectStore = useProjectStore()
const calendarStore = useCalendarStore()

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
  } catch (error: any) {
    console.error('최적화 실패:', error)
    // 백엔드에서 전달한 에러 메시지 사용
    const errorMessage = error.response?.data?.message || error.message
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
  } catch (error: any) {
    console.error('삭제 실패:', error)
    const errorMessage = error.response?.data?.message || error.message
    alert(errorMessage)
  } finally {
    isDeleting.value = false
  }
}

// Composables 초기화
const {
  workFormState,
  divisions,
  workTypes,
  subWorkTypes,
  componentTypes,
  locationOptions,
  projects,
  isCreatingWork,
  isLoadingWorkTypes,
  isLoadingSubWorkTypes,
  createWork,
  loadInitialData
} = useWorkForm(loadWorkData)

const currentProject = computed(() =>
  projects.value.find(p => p.id === projectStore.selectedProjectId)
)

const {
  containerRef,
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
  isUpdatingPath,
  isPathEditMode,
  selectedPathColor,
  orderedChainNodes,
  pathNodeIds,
  deleteButtonNodes,
  styledEdges,
  togglePathSelection,
  submitPathUpdate,
  cancelPathEdit,
  onConnect,
  removeNodeFromPath,
  clearPathEditMode
} = usePathEditor(nodes, edges, paths, loadWorkData)

// 탭 변경 시 패스 선택 해제
watch(sidebarTab, (newTab) => {
  if (newTab !== 'path') {
    cancelPathEdit()
  }
})

// 패스 편집 모드에서 노드 하이라이트
watch(
  [isPathEditMode, selectedPathColor, pathNodeIds],
  ([editMode, pathColor, nodeIds]) => {
    nodes.value = nodes.value.map(node => {
      const workId = parseInt(node.id.replace('work-', ''))
      const work = node.data.work as WorkResponse

      // 기본 스타일 (휴일 휴무 여부 반영)
      const baseStyle: Record<string, string> = {
        width: `${work.width}px`,
        height: `${work.height}px`,
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
  isUpdatingWork,
  workEditForm,
  selectedWork,
  submitWorkUpdate,
  clearSelection: clearWorkSelection,
  selectWork
} = useWorkEditor(nodes, loadWorkData)

// 패스 생성
const createPath = async () => {
  if (!pathFormState.value.pathName.trim()) {
    alert('패스 이름을 입력해주세요.')
    return
  }
  isCreatingPath.value = true
  try {
    await workPathApi.createPath({
      workPathName: pathFormState.value.pathName,
      workPathColor: pathFormState.value.pathColor
    })
    pathFormState.value.pathName = ''
    pathFormState.value.pathColor = '#3b82f6'
    await loadWorkData()
  } catch (error: any) {
    console.error('패스 생성 실패:', error)
    const errorMessage = error.response?.data?.message || error.message
    alert(errorMessage)
  } finally {
    isCreatingPath.value = false
  }
}

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
    nodeX: event.node.position.x + work.width / 2,
    nodeY: event.node.position.y - 8,
    workId: work.workId,
    startDate: work.startDate,
    workLeadTime: work.workLeadTime,
    completionDate: work.completionDate
  }
}

// 로컬 날짜를 YYYY-MM-DD 문자열로 변환
const formatLocalDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 날짜 조절 함수 (작업 생성 폼용)
const adjustStartDate = (form: { start_date: string }, days: number) => {
  if (!form.start_date) return
  const date = new Date(form.start_date)
  date.setDate(date.getDate() + days)
  form.start_date = formatLocalDate(date)
}

// 날짜 조절 함수 (작업 수정 폼용)
const adjustEditStartDate = (days: number) => {
  if (!workEditForm.value.startDate) return
  const date = new Date(workEditForm.value.startDate)
  date.setDate(date.getDate() + days)
  workEditForm.value.startDate = formatLocalDate(date)
}

// 작업 생성 래퍼 (성공 시 폼 접기)
const handleWorkCreate = async () => {
  const success = await createWork()
  if (success) {
    isWorkFormExpanded.value = false
  }
}

// 작업 수정 제출 래퍼 (말풍선 닫기 포함)
const handleWorkUpdate = async () => {
  await submitWorkUpdate()
  tooltip.value.visible = false
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

// 빈 영역 클릭 시 선택 해제
const onPaneClick = () => {
  tooltip.value.visible = false
  // 패스 편집 모드가 아닐 때만 작업 선택 해제
  if (!isPathEditMode.value) {
    clearWorkSelection()
  }
}

// 노드 드래그 종료 시 Y 위치 저장
const onNodeDragStop = async (event: { node: Node }) => {
  const work = event.node.data.work as WorkResponse | undefined
  if (!work) return

  const newY = event.node.position.y

  // Y 위치가 변경되지 않았으면 저장하지 않음
  if (newY === work.positionY) return

  try {
    await workApi.updateWorkPositionY(work.workId, newY)
    // 단일 work 새로고침
    const updatedWork = await workApi.getWork(work.workId)
    // 해당 노드만 업데이트
    const nodeIndex = nodes.value.findIndex(n => n.id === `work-${work.workId}`)
    if (nodeIndex !== -1) {
      const oldNode = nodes.value[nodeIndex]!
      nodes.value[nodeIndex] = {
        ...oldNode,
        position: { x: oldNode.position.x, y: updatedWork.positionY },
        data: { ...oldNode.data, work: updatedWork }
      }
    }
  } catch (error) {
    console.error('위치 저장 실패:', error)
    // 실패 시 원래 위치로 복구
    event.node.position.y = work.positionY
  }
}

// 노드 드래그 핸들러 (Y축만 이동 가능)
const onNodeDrag = (event: { node: Node }) => {
  const originalX = event.node.data.originalX
  if (originalX !== undefined && event.node.position.x !== originalX) {
    event.node.position.x = originalX
  }

  // 드래그 중인 노드에 말풍선이 열려있으면 위치 갱신
  const work = event.node.data.work as WorkResponse | undefined
  if (work && tooltip.value.visible && tooltip.value.workId === work.workId) {
    tooltip.value.nodeX = event.node.position.x + work.width / 2
    tooltip.value.nodeY = event.node.position.y - 8  // 삼각형 높이만큼 위로
  }
}

const handleVueFlowWheel = (e: WheelEvent) => {
  if (e.ctrlKey) {
    e.preventDefault()
    if (e.deltaY < 0) {
      zoomIn()
    } else {
      zoomOut()
    }
  }
}

onMounted(async () => {
  loadInitialData()
  await loadCalendarData()
  loadWorkData()
  setupResizeObserver()
})

onUnmounted(() => {
  cleanupResizeObserver()
})
</script>

<template>
  <div class="flex gap-4 h-full">
    <!-- VueFlow 영역 -->
    <div
      ref="containerRef"
      class="relative flex-1 min-w-0 border border-border rounded-lg overflow-hidden"
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
        :class="{ 'path-mode': sidebarTab === 'path' }"
        :style="{ paddingTop: `${HEADER_HEIGHT}px` }"
        fit-view-on-init
        :min-zoom="0.5"
        :zoom-on-scroll="false"
        @node-click="onNodeClick"
        @node-drag="onNodeDrag"
        @node-drag-stop="onNodeDragStop"
        @pane-click="onPaneClick"
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
          class="absolute z-10 pointer-events-none"
          :style="{
            left: `${tooltip.nodeX * viewport.zoom + viewport.x}px`,
            top: `${tooltip.nodeY * viewport.zoom + viewport.y}px`,
            transform: `translateX(-50%) translateY(-100%) scale(${viewport.zoom})`,
            transformOrigin: 'bottom center'
          }"
        >
          <div class="px-3 py-2 text-sm bg-popover border border-border rounded-lg shadow-lg">
            <div class="absolute left-1/2 -bottom-2 -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-transparent border-t-border"></div>
            <div class="absolute left-1/2 -bottom-[7px] -translate-x-1/2 border-l-[7px] border-r-[7px] border-t-[7px] border-transparent border-t-popover"></div>
            <p class="text-muted-foreground">ID: <span class="font-medium">{{ tooltip.workId }}</span></p>
            <p>시작일: <span class="font-medium">{{ tooltip.startDate }}</span></p>
            <p>작업일: <span class="font-medium">{{ tooltip.workLeadTime }}일</span></p>
            <p>종료일: <span class="font-medium">{{ tooltip.completionDate }}</span></p>
          </div>
        </div>

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

      <!-- 사용법 안내 -->
      <div class="absolute bottom-3 right-16 text-xs text-muted-foreground/60 bg-background/50 px-2 py-1 rounded">
        Ctrl + 휠: 줌 | 드래그: 이동
      </div>
    </div>

    <!-- 우측 탭 박스 -->
    <SideTabBox
      v-model="sidebarTab"
      :tabs="[
        { value: 'manage', label: '작업 관리' },
        { value: 'path', label: '패스 관리' }
      ]"
    >
      <template #default="{ activeTab }">
        <!-- 작업 관리 탭 -->
        <div v-if="activeTab === 'manage'" class="space-y-4">
          <!-- 작업 생성 (접기/펼치기) -->
          <div class="border border-border rounded-lg overflow-hidden">
            <button
              class="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50 transition-colors"
              @click="isWorkFormExpanded = !isWorkFormExpanded"
            >
              <span>작업 생성</span>
              <svg
                class="w-4 h-4 transition-transform"
                :class="{ 'rotate-180': isWorkFormExpanded }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div v-show="isWorkFormExpanded" class="p-3 pt-0 space-y-3">
              <!-- 공종 분류 -->
              <div class="space-y-2">
                <p class="text-xs font-medium text-muted-foreground">공종 분류</p>

                <Select v-model="workFormState.division_id">
                  <SelectTrigger class="w-full h-8 text-sm">
                    <SelectValue placeholder="분류" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="div in divisions"
                      :key="div.id"
                      :value="String(div.id)"
                    >
                      {{ div.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  v-model="workFormState.work_type_id"
                  :disabled="!workFormState.division_id || isLoadingWorkTypes"
                >
                  <SelectTrigger class="w-full h-8 text-sm">
                    <SelectValue :placeholder="isLoadingWorkTypes ? '로딩중...' : '공종'" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="wt in workTypes"
                      :key="wt.id"
                      :value="String(wt.id)"
                    >
                      {{ wt.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  v-model="workFormState.sub_work_type_id"
                  :disabled="!workFormState.work_type_id || isLoadingSubWorkTypes"
                >
                  <SelectTrigger class="w-full h-8 text-sm">
                    <SelectValue :placeholder="isLoadingSubWorkTypes ? '로딩중...' : '세부공종'" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="swt in subWorkTypes"
                      :key="swt.id"
                      :value="String(swt.id)"
                    >
                      {{ swt.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <!-- 부재 타입 (복수 선택) -->
              <div class="space-y-2">
                <p class="text-xs font-medium text-muted-foreground">부재 타입</p>

                <div class="border border-input rounded-md p-2 max-h-32 overflow-y-auto space-y-1.5">
                  <label
                    v-for="ct in componentTypes"
                    :key="ct.id"
                    class="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      :model-value="workFormState.component_type_ids.includes(String(ct.id))"
                      @update:model-value="(checked: boolean | 'indeterminate') => {
                        const id = String(ct.id)
                        if (checked === true) {
                          workFormState.component_type_ids.push(id)
                        } else {
                          workFormState.component_type_ids = workFormState.component_type_ids.filter(v => v !== id)
                        }
                      }"
                    />
                    <span class="text-sm">{{ ct.name }}</span>
                  </label>
                </div>
              </div>

              <!-- 위치 분류 -->
              <div class="space-y-2">
                <p class="text-xs font-medium text-muted-foreground">위치 분류</p>

                <Select v-model="workFormState.zone_id">
                  <SelectTrigger class="w-full h-8 text-sm">
                    <SelectValue placeholder="Zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">선택안함</SelectItem>
                    <SelectItem
                      v-for="opt in locationOptions.zone"
                      :key="opt.id"
                      :value="String(opt.id)"
                    >
                      {{ opt.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select v-model="workFormState.floor_id">
                  <SelectTrigger class="w-full h-8 text-sm">
                    <SelectValue placeholder="Floor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">선택안함</SelectItem>
                    <SelectItem
                      v-for="opt in locationOptions.floor"
                      :key="opt.id"
                      :value="String(opt.id)"
                    >
                      {{ opt.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select v-model="workFormState.section_id">
                  <SelectTrigger class="w-full h-8 text-sm">
                    <SelectValue placeholder="Section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">선택안함</SelectItem>
                    <SelectItem
                      v-for="opt in locationOptions.section"
                      :key="opt.id"
                      :value="String(opt.id)"
                    >
                      {{ opt.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select v-model="workFormState.usage_id">
                  <SelectTrigger class="w-full h-8 text-sm">
                    <SelectValue placeholder="Usage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">선택안함</SelectItem>
                    <SelectItem
                      v-for="opt in locationOptions.usage"
                      :key="opt.id"
                      :value="String(opt.id)"
                    >
                      {{ opt.name }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <!-- 일정 정보 -->
              <div class="space-y-2">
                <p class="text-xs font-medium text-muted-foreground">일정 정보</p>

                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">시작일</label>
                  <div class="flex items-center gap-1">
                    <Button
                      variant="outline"
                      class="h-10 w-10 text-xl font-bold p-0"
                      :disabled="!workFormState.start_date"
                      @click="adjustStartDate(workFormState, -1)"
                    >
                      −
                    </Button>
                    <Input
                      v-model="workFormState.start_date"
                      type="date"
                      class="h-10 text-sm text-center flex-1"
                    />
                    <Button
                      variant="outline"
                      class="h-10 w-10 text-xl font-bold p-0"
                      :disabled="!workFormState.start_date"
                      @click="adjustStartDate(workFormState, 1)"
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">작업일수</label>
                  <div class="flex items-center gap-1">
                    <Button
                      variant="outline"
                      class="h-10 w-10 text-xl font-bold p-0"
                      :disabled="workFormState.work_days <= 1"
                      @click="workFormState.work_days = Math.max(1, workFormState.work_days - 1)"
                    >
                      −
                    </Button>
                    <Input
                      v-model="workFormState.work_days"
                      type="number"
                      min="1"
                      class="h-10 text-sm text-center flex-1"
                    />
                    <Button
                      variant="outline"
                      class="h-10 w-10 text-xl font-bold p-0"
                      @click="workFormState.work_days++"
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">휴일 작업 여부</label>
                  <div class="flex rounded-lg border border-border overflow-hidden">
                    <button
                      type="button"
                      class="flex-1 py-2 text-sm font-medium transition-colors"
                      :class="workFormState.isWorkingOnHoliday
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-muted'"
                      @click="workFormState.isWorkingOnHoliday = true"
                    >
                      휴일 작업
                    </button>
                    <button
                      type="button"
                      class="flex-1 py-2 text-sm font-medium transition-colors border-l border-border"
                      :class="!workFormState.isWorkingOnHoliday
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-muted'"
                      @click="workFormState.isWorkingOnHoliday = false"
                    >
                      휴일 휴무
                    </button>
                  </div>
                </div>
              </div>

              <!-- 생성 버튼 -->
              <Button
                class="w-full"
                :disabled="isCreatingWork"
                @click="handleWorkCreate"
              >
                {{ isCreatingWork ? '생성 중...' : '작업 생성' }}
              </Button>
            </div>
          </div>

          <!-- 작업 수정 카드 (노드 선택 시) -->
          <div v-if="selectedWork" class="border border-primary rounded-lg p-3 space-y-3 bg-primary/5">
            <div class="flex justify-between items-center">
              <span class="font-medium text-sm">{{ selectedWork.workName }}</span>
              <button
                @click="clearWorkSelection(); tooltip.visible = false"
                class="text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>

            <div class="space-y-2">
              <div class="space-y-1">
                <label class="text-xs text-muted-foreground">시작일</label>
                <div class="flex items-center gap-1">
                  <Button
                    variant="outline"
                    class="h-10 w-10 text-xl font-bold p-0"
                    :disabled="!workEditForm.startDate"
                    @click="adjustEditStartDate(-1)"
                  >
                    −
                  </Button>
                  <Input
                    v-model="workEditForm.startDate"
                    type="date"
                    class="h-10 text-sm text-center flex-1"
                  />
                  <Button
                    variant="outline"
                    class="h-10 w-10 text-xl font-bold p-0"
                    :disabled="!workEditForm.startDate"
                    @click="adjustEditStartDate(1)"
                  >
                    +
                  </Button>
                </div>
              </div>
              <div class="space-y-1">
                <label class="text-xs text-muted-foreground">작업일수</label>
                <div class="flex items-center gap-1">
                  <Button
                    variant="outline"
                    class="h-10 w-10 text-xl font-bold p-0"
                    :disabled="workEditForm.workLeadTime <= 1"
                    @click="workEditForm.workLeadTime = Math.max(1, workEditForm.workLeadTime - 1)"
                  >
                    −
                  </Button>
                  <Input
                    v-model="workEditForm.workLeadTime"
                    type="number"
                    min="1"
                    class="h-10 text-sm text-center flex-1"
                  />
                  <Button
                    variant="outline"
                    class="h-10 w-10 text-xl font-bold p-0"
                    @click="workEditForm.workLeadTime++"
                  >
                    +
                  </Button>
                </div>
              </div>
              <div class="space-y-1">
                <label class="text-xs text-muted-foreground">휴일 작업 여부</label>
                <div class="flex rounded-lg border border-border overflow-hidden">
                  <button
                    type="button"
                    class="flex-1 py-2 text-sm font-medium transition-colors"
                    :class="workEditForm.isWorkingOnHoliday
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-muted'"
                    @click="workEditForm.isWorkingOnHoliday = true"
                  >
                    휴일 작업
                  </button>
                  <button
                    type="button"
                    class="flex-1 py-2 text-sm font-medium transition-colors border-l border-border"
                    :class="!workEditForm.isWorkingOnHoliday
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background hover:bg-muted'"
                    @click="workEditForm.isWorkingOnHoliday = false"
                  >
                    휴일 휴무
                  </button>
                </div>
              </div>
            </div>

            <Button
              class="w-full"
              :disabled="isUpdatingWork"
              @click="handleWorkUpdate"
            >
              {{ isUpdatingWork ? '수정 중...' : '수정하기' }}
            </Button>

            <Button
              variant="destructive"
              class="w-full"
              @click="openDeleteDialog('work')"
            >
              삭제
            </Button>
          </div>

          <!-- 노드 선택 안내 -->
          <div v-else class="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
            노드를 클릭하여 작업을 선택하세요
          </div>
        </div>

        <!-- 패스관리 탭 -->
        <div v-else-if="activeTab === 'path'" class="space-y-4">
          <!-- 패스 생성 (접기/펼치기) -->
          <div class="border border-border rounded-lg overflow-hidden">
            <button
              class="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/50 transition-colors"
              @click="isPathFormExpanded = !isPathFormExpanded"
            >
              <span>패스 생성</span>
              <svg
                class="w-4 h-4 transition-transform"
                :class="{ 'rotate-180': isPathFormExpanded }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div v-show="isPathFormExpanded" class="p-3 pt-0 space-y-3">
              <div class="space-y-1">
                <label class="text-xs text-muted-foreground">패스 이름</label>
                <Input
                  v-model="pathFormState.pathName"
                  placeholder="패스 이름 입력"
                  class="h-8 text-sm"
                />
              </div>
              <div class="space-y-1">
                <label class="text-xs text-muted-foreground">패스 색상</label>
                <div class="flex items-center gap-2">
                  <input
                    v-model="pathFormState.pathColor"
                    type="color"
                    class="w-10 h-8 rounded border border-border cursor-pointer"
                  />
                  <Input
                    v-model="pathFormState.pathColor"
                    placeholder="#3b82f6"
                    class="h-8 text-sm flex-1"
                  />
                </div>
              </div>
              <Button
                class="w-full"
                :disabled="isCreatingPath"
                @click="createPath"
              >
                {{ isCreatingPath ? '생성 중...' : '패스 생성' }}
              </Button>
            </div>
          </div>

          <!-- 모든 패스 최적화 -->
          <Button
            variant="outline"
            class="w-full"
            :disabled="paths.length === 0"
            @click="openOptimizeDialog('all')"
          >
            모든 패스 최적화
          </Button>

          <!-- 패스 편집 UI (패스 선택 시) -->
          <div v-if="selectedPathId" class="border border-primary rounded-lg p-3 space-y-3 bg-primary/5">
            <div class="flex justify-between items-center">
              <span class="font-medium text-sm">
                {{ paths.find(p => p.workPathId === selectedPathId)?.workPathName }}
              </span>
              <button
                @click="cancelPathEdit"
                class="text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕
              </button>
            </div>

            <!-- 연결 순서 표시 -->
            <div class="space-y-1">
              <p class="text-xs text-muted-foreground">연결 순서</p>
              <div v-if="orderedChainNodes.length > 0" class="text-sm flex flex-wrap items-center gap-1">
                <template v-for="(node, index) in orderedChainNodes" :key="node.workId">
                  <span class="font-medium bg-background px-1.5 py-0.5 rounded border border-border">
                    {{ node.workName }}
                  </span>
                  <span v-if="index < orderedChainNodes.length - 1" class="text-muted-foreground">→</span>
                </template>
              </div>
              <p v-else class="text-xs text-muted-foreground/70">
                연결된 노드가 없습니다. 노드 핸들을 드래그하여 연결하세요.
              </p>
            </div>

            <div class="flex gap-2">
              <Button
                variant="outline"
                class="flex-1"
                @click="cancelPathEdit"
              >
                취소
              </Button>
              <Button
                class="flex-1"
                :disabled="isUpdatingPath"
                @click="submitPathUpdate"
              >
                {{ isUpdatingPath ? '저장 중...' : '저장' }}
              </Button>
            </div>

            <Button
              variant="outline"
              class="w-full"
              @click="openOptimizeDialog('single')"
            >
              현재 패스 최적화
            </Button>

            <Button
              variant="destructive"
              class="w-full"
              @click="openDeleteDialog('path')"
            >
              패스 삭제
            </Button>
          </div>

          <!-- 패스 목록 -->
          <div class="space-y-2">
            <p class="text-xs font-medium text-muted-foreground">
              패스 목록 ({{ paths.length }}개)
            </p>
            <div class="space-y-2 max-h-64 overflow-y-auto">
              <div
                v-for="path in paths"
                :key="path.workPathId"
                class="p-3 border rounded-lg cursor-pointer transition-colors"
                :class="{
                  'border-primary bg-primary/10': selectedPathId === path.workPathId,
                  'border-border hover:bg-muted/50': selectedPathId !== path.workPathId
                }"
                @click="handlePathToggle(path.workPathId)"
              >
                <div class="flex items-center gap-2">
                  <div
                    class="w-3 h-3 rounded-full"
                    :style="{ backgroundColor: path.workPathColor }"
                  />
                  <span class="font-medium text-sm">{{ path.workPathName }}</span>
                </div>
                <p class="text-xs text-muted-foreground mt-1">
                  연결: {{ path.edges.length }}개
                </p>
              </div>
              <p
                v-if="paths.length === 0"
                class="text-sm text-muted-foreground text-center py-4"
              >
                생성된 패스가 없습니다.
              </p>
            </div>
          </div>

          <!-- 사용법 안내 -->
          <div v-if="!selectedPathId" class="text-xs text-muted-foreground text-center py-2 border border-dashed border-border rounded-lg">
            패스를 선택하여 편집하세요
          </div>
        </div>
      </template>
    </SideTabBox>
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
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #1f2937;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.path-mode :deep(.vue-flow__handle:hover) {
  width: 16px;
  height: 16px;
  background-color: #111827;
}
</style>
