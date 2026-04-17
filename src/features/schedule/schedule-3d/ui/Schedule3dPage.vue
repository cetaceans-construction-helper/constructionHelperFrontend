<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { useEngine } from '@/features/schedule/schedule-3d/view-model/useEngine'
import { useDailyReport } from '@/features/schedule/schedule-3d/view-model/useDailyReport'
import Viewer3dArea from './components/Viewer3dArea.vue'
import { object3dApi } from '@/shared/network-core/apis/object3d'
import { useFloorPlanStore } from '@/features/floor-plan/public'
import { storeToRefs } from 'pinia'
import { taskApi } from '@/shared/network-core/apis/task'
import { workApi, type WorkResponse } from '@/shared/network-core/apis/work'
import { referenceApi, type IdNameResponse, type ComponentTypeResponse } from '@/shared/network-core/apis/reference'
import type { Object3d, Task } from '@/features/schedule/schedule-3d/model/object3d-types'

// 3D Engine
const canvasContainer = ref<HTMLDivElement | null>(null)
const {
  engine,
  isLoading,
  loadProgress,
  loadError,
  init,
  loadApiModel,
  loadAxisLines,
  setTopView,
  resetView,
  zoomIn,
  zoomOut,
  getEngine,
} = useEngine(canvasContainer)

// Object3d 데이터
const object3dMap = ref<Map<number, Object3d>>(new Map())

// 층/구역 필터
const floors = ref<IdNameResponse[]>([])
const zones = ref<IdNameResponse[]>([])
const selectedFloorIds = ref<number[]>([])
const selectedZoneIds = ref<number[]>([])


function toggleFloor(id: number) {
  selectedFloorIds.value = selectedFloorIds.value.includes(id)
    ? selectedFloorIds.value.filter(v => v !== id)
    : [...selectedFloorIds.value, id]
}

function toggleZone(id: number) {
  selectedZoneIds.value = selectedZoneIds.value.includes(id)
    ? selectedZoneIds.value.filter(v => v !== id)
    : [...selectedZoneIds.value, id]
}

// 부재 구조/비구조 필터
const componentTypesByStructure = ref<Map<string, ComponentTypeResponse[]>>(new Map())
const selectedIsStructure = ref<boolean | null>(null)
const selectedComponentTypeId = ref<number | null>(null)

function toggleIsStructure(value: boolean) {
  if (selectedIsStructure.value === value) {
    selectedIsStructure.value = null
    selectedComponentTypeId.value = null
  } else {
    selectedIsStructure.value = value
    selectedComponentTypeId.value = null
    const key = String(value)
    if (!componentTypesByStructure.value.has(key)) {
      referenceApi.getComponentTypeList(value).then(list => {
        componentTypesByStructure.value = new Map(componentTypesByStructure.value).set(key, list)
      })
    }
  }
}

function toggleComponentType(id: number) {
  selectedComponentTypeId.value = selectedComponentTypeId.value === id ? null : id
}

function applyFilter() {
  const eng = getEngine()
  if (!eng) return

  const hasFloorFilter = selectedFloorIds.value.length > 0
  const hasZoneFilter = selectedZoneIds.value.length > 0
  const hasStructureFilter = selectedIsStructure.value != null
  const hasTypeFilter = selectedComponentTypeId.value != null

  if (!hasFloorFilter && !hasZoneFilter && !hasStructureFilter && !hasTypeFilter) {
    eng.setObjectVisibility(null)
    return
  }

  const visibleIds = new Set<number>()
  for (const obj of object3dMap.value.values()) {
    const floorOk = !hasFloorFilter || (obj.floorId != null && selectedFloorIds.value.includes(obj.floorId))
    const zoneOk = !hasZoneFilter || (obj.zoneId != null && selectedZoneIds.value.includes(obj.zoneId))
    const structureOk = !hasStructureFilter || obj.isStructure === selectedIsStructure.value
    const typeOk = !hasTypeFilter || obj.componentTypeId === selectedComponentTypeId.value
    if (floorOk && zoneOk && structureOk && typeOk) visibleIds.add(obj.id)
  }
  eng.setObjectVisibility(visibleIds)
}

watch([selectedFloorIds, selectedZoneIds, selectedIsStructure, selectedComponentTypeId], applyFilter)

// 선택 상태
const selectedObject3d = ref<Object3d | null>(null)
const selectedObject3dIds = ref<number[]>([])
const selectedTasks = ref<Task[]>([])
const isLoadingTasks = ref(false)

// 축선 (floorPlan store 공유)
const floorPlanStore = useFloorPlanStore()
const { xAxes, yAxes } = storeToRefs(floorPlanStore)

// 세로모드 감지
const isPortrait = ref(false)
const portraitMql = window.matchMedia('(max-aspect-ratio: 1/1)')
let initialPortrait: boolean | null = null
const onPortraitChange = (e: MediaQueryListEvent | MediaQueryList) => {
  const newVal = e.matches
  if (initialPortrait !== null && initialPortrait !== newVal) {
    // 세로↔가로 전환 시 리프레시
    window.location.reload()
    return
  }
  isPortrait.value = newVal
  initialPortrait = newVal
}

// 작업 일보
const works = ref<WorkResponse[]>([])
const dailyReport = useDailyReport()

onMounted(async () => {
  init()

  try {
    // 층/구역 목록 로드
    const [floorList, zoneList] = await Promise.all([
      referenceApi.getFloorList(),
      referenceApi.getZoneList(),
    ])
    floors.value = floorList
    zones.value = zoneList

    // Object3d 목록 로드 (geometry + 메타데이터 통합)
    const object3dList = await object3dApi.getObject3dList()

    // Object3d 목록을 Map으로 변환 (id로 빠르게 조회)
    object3dMap.value = new Map(object3dList.map((obj) => [obj.id, obj]))

    // 3D 모델 렌더링 (Object3d는 기존 Model3dm과 동일한 형태의 geometry 포함)
    loadApiModel(object3dList)

    // 선택 콜백 설정
    const engineInstance = getEngine()
    if (engineInstance) {
      engineInstance.onObjectSelect(handleSelect)
      engineInstance.onObjectDeselect(handleDeselect)
    }

    // 축선 데이터 로드 (floorPlan store 경유)
    await floorPlanStore.loadAxes()
    renderAxisLines()

    // 세로모드면 자동 탑뷰
    onPortraitChange(portraitMql)
    portraitMql.addEventListener('change', onPortraitChange)
    if (isPortrait.value) setTopView()

    // 작업 목록 및 작업 일보 데이터 로드
    works.value = await workApi.getWorkList()
    await dailyReport.loadDailyData()
  } catch (error: unknown) {
    console.error('초기 데이터 로드 실패:', error)
  }
})

onUnmounted(() => {
  portraitMql.removeEventListener('change', onPortraitChange)
})

// 축선 렌더링 함수
function renderAxisLines() {
  const x = xAxes.value.map(a => ({ name: a.label, position: a.position }))
  const y = yAxes.value.map(a => ({ name: a.label, position: a.position }))
  loadAxisLines(x, y)
}

// 축선 변경 시 3D 씬 업데이트
watch([xAxes, yAxes], renderAxisLines, { deep: true })

// dailyReport 상태 변경 시 Engine 업데이트
watch(
  [
    () => dailyReport.showTodayOnly.value,
    () => dailyReport.dailyObject3dIds.value,
    () => dailyReport.selectedWorkId.value,
    () => dailyReport.workObject3dIds.value,
  ],
  () => {
    dailyReport.updateModelAppearance(engine.value)
  },
)

async function handleSelect(selected: THREE.Object3D[]) {
  // 다중 선택된 ID 추적
  selectedObject3dIds.value = selected
    .map((obj) => obj.userData?.dbId as number | undefined)
    .filter((id): id is number => id != null)

  if (selected.length === 0) return

  const lastSelected = selected[selected.length - 1]
  if (!lastSelected) return
  const dbId = lastSelected.userData?.dbId as number | undefined
  if (dbId == null) return

  const object3d = object3dMap.value.get(dbId)
  if (!object3d) {
    selectedObject3d.value = null
    selectedTasks.value = []
    return
  }

  selectedObject3d.value = object3d

  // 태스크 목록 조회 (object3dId 파라미터 사용)
  isLoadingTasks.value = true
  try {
    selectedTasks.value = await taskApi.getTaskList(dbId)
  } catch (error: unknown) {
    console.error('태스크 목록 조회 실패:', error)
    selectedTasks.value = []
  } finally {
    isLoadingTasks.value = false
  }
}

function handleDeselect() {
  selectedObject3d.value = null
  selectedObject3dIds.value = []
  selectedTasks.value = []
  isLoadingTasks.value = false
}

// 작업 일보 이벤트 핸들러
function handleDateChange(date: string) {
  dailyReport.setDate(date)
}

function handleToggleTodayOnly(checked: boolean) {
  dailyReport.toggleShowTodayOnly(checked)
  dailyReport.updateModelAppearance(engine.value)
}

async function handleWorkClick(workId: number) {
  await dailyReport.selectWork(workId)
  dailyReport.updateModelAppearance(engine.value)
}

async function handleUpdateObjects(updates: { id: number; zoneId?: number | null; floorId?: number | null; componentCodeId?: number | null }[]) {
  try {
    const results = await object3dApi.updateObject3dList(updates)
    const eng = getEngine()
    for (const obj of results) {
      object3dMap.value.set(obj.id, obj)
      // 3D 씬의 메시 색상 갱신
      if (eng && obj.layerColor) {
        const model = eng.getModel()
        if (model) {
          model.traverse((child: THREE.Object3D) => {
            if (child instanceof THREE.Mesh && child.userData.dbId === obj.id) {
              const mat = child.material as THREE.MeshStandardMaterial
              mat.color.setRGB(obj.layerColor.r / 255, obj.layerColor.g / 255, obj.layerColor.b / 255)
              mat.needsUpdate = true
            }
          })
        }
      }
    }
    // 선택 상태의 단일 객체도 갱신
    if (selectedObject3d.value) {
      const updated = object3dMap.value.get(selectedObject3d.value.id)
      if (updated) selectedObject3d.value = updated
    }
    // 필터 재적용
    applyFilter()
  } catch (error: any) {
    console.error('부재 정보 수정 실패:', error)
    const msg = error.response?.data?.message || error.message
    alert(msg)
  }
}

function handleTasksUpdated(updates: { taskId: number; quantity: number }[]) {
  for (const { taskId, quantity } of updates) {
    const task = selectedTasks.value.find((t) => t.id === taskId)
    if (task) task.planedQuantity = quantity
  }
}
</script>

<template>
  <div class="flex flex-col flex-1 min-h-0 p-2">
    <div class="flex-1 min-h-0">
      <Viewer3dArea
        :is-portrait="isPortrait"
        :floors="floors"
        :zones="zones"
        :selected-floor-ids="selectedFloorIds"
        :selected-zone-ids="selectedZoneIds"
        :component-types-by-structure="componentTypesByStructure"
        :selected-is-structure="selectedIsStructure"
        :selected-component-type-id="selectedComponentTypeId"
        @toggle-floor="toggleFloor"
        @toggle-zone="toggleZone"
        @toggle-is-structure="toggleIsStructure"
        @toggle-component-type="toggleComponentType"
        :is-loading="isLoading"
        :load-progress="loadProgress"
        :load-error="loadError"
        :selected-object3d="selectedObject3d"
        :selected-object3d-ids="selectedObject3dIds"
        :selected-tasks="selectedTasks"
        :is-loading-tasks="isLoadingTasks"
        :works="works"
        :daily-work-ids="dailyReport.dailyWorkIds.value"
        :daily-date="dailyReport.selectedDate.value"
        :show-today-only="dailyReport.showTodayOnly.value"
        :selected-work-id="dailyReport.selectedWorkId.value"
        :is-loading-daily="dailyReport.isLoadingDaily.value"
        @top-view="setTopView"
        @reset-view="resetView"
        @date-change="handleDateChange"
        @toggle-today-only="handleToggleTodayOnly"
        @work-click="handleWorkClick"
        @tasks-updated="handleTasksUpdated"
        @update-objects="handleUpdateObjects"
        @zoom-in="zoomIn"
        @zoom-out="zoomOut"
      >
        <template #canvas>
          <div ref="canvasContainer" class="w-full h-full" />
        </template>
      </Viewer3dArea>
    </div>
  </div>
</template>
