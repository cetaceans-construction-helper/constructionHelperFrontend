<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import * as THREE from 'three'
import PageContainer from '@/components/helper/PageContainer.vue'
import AreaCard from '@/components/helper/AreaCard.vue'
import { useEngine } from '@/composables/useEngine'
import { useDailyReport } from '@/composables/useDailyReport'
import Viewer3dArea from './components/Viewer3dArea.vue'
import Viewer2dArea from './components/Viewer2dArea.vue'
import { model3dmApi, componentApi, taskApi } from '@/api/model3dm'
import type { ComponentInfo, Task } from '@/types/model3dm'
import type { WorkResponse } from '@/api/work'

// 3D Engine
const canvasContainer = ref<HTMLDivElement | null>(null)
const {
  engine,
  isLoading,
  loadProgress,
  loadError,
  init,
  loadApiModel,
  rotateLeft,
  rotateRight,
  getEngine,
} = useEngine(canvasContainer)

// 부재 데이터
const componentMap = ref<Map<number, ComponentInfo>>(new Map())

// 선택 상태
const selectedComponent = ref<ComponentInfo | null>(null)
const selectedTasks = ref<Task[]>([])
const isLoadingTasks = ref(false)

// 작업 일보
const works = ref<WorkResponse[]>([])
const dailyReport = useDailyReport()

onMounted(async () => {
  init()

  try {
    // 모델과 부재 목록 병렬 로드
    const [model3dmList, componentList] = await Promise.all([
      model3dmApi.getModel3dmList(),
      componentApi.getComponentList(),
    ])

    // 부재 목록을 Map으로 변환 (id로 빠르게 조회)
    componentMap.value = new Map(componentList.map((c) => [c.id, c]))

    // 3D 모델 렌더링
    loadApiModel(model3dmList)

    // 선택 콜백 설정
    const engineInstance = getEngine()
    if (engineInstance) {
      engineInstance.onObjectSelect(handleSelect)
      engineInstance.onObjectDeselect(handleDeselect)
    }

    // 초기 작업 일보 데이터 로드
    await dailyReport.loadDailyData()
  } catch (error: unknown) {
    console.error('초기 데이터 로드 실패:', error)
  }
})

// dailyReport 상태 변경 시 Engine 업데이트
watch(
  [
    () => dailyReport.showTodayOnly.value,
    () => dailyReport.dailyComponentIds.value,
    () => dailyReport.selectedWorkId.value,
    () => dailyReport.workComponentIds.value,
  ],
  () => {
    dailyReport.updateModelAppearance(engine.value)
  },
)

async function handleSelect(selected: THREE.Object3D[]) {
  if (selected.length === 0) return

  const lastSelected = selected[selected.length - 1]
  if (!lastSelected) return
  const dbId = lastSelected.userData?.dbId as number | undefined
  if (dbId == null) return

  const component = componentMap.value.get(dbId)
  if (!component) {
    selectedComponent.value = null
    selectedTasks.value = []
    return
  }

  selectedComponent.value = component

  // 태스크 목록 조회
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
  selectedComponent.value = null
  selectedTasks.value = []
  isLoadingTasks.value = false
}

// Viewer2dArea에서 works 로드 완료 시
function onWorksLoaded(loadedWorks: WorkResponse[]) {
  works.value = loadedWorks
  dailyReport.refreshDaily()
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
</script>

<template>
  <PageContainer title="공정표">
    <!-- 3D 공정표 -->
    <AreaCard title="3D 공정표" height="flex-1" min-height="1100px">
      <Viewer3dArea
        :is-loading="isLoading"
        :load-progress="loadProgress"
        :load-error="loadError"
        :selected-component="selectedComponent"
        :selected-tasks="selectedTasks"
        :is-loading-tasks="isLoadingTasks"
        :works="works"
        :daily-work-ids="dailyReport.dailyWorkIds.value"
        :daily-date="dailyReport.selectedDate.value"
        :show-today-only="dailyReport.showTodayOnly.value"
        :selected-work-id="dailyReport.selectedWorkId.value"
        :is-loading-daily="dailyReport.isLoadingDaily.value"
        @rotate-left="rotateLeft"
        @rotate-right="rotateRight"
        @date-change="handleDateChange"
        @toggle-today-only="handleToggleTodayOnly"
        @work-click="handleWorkClick"
      >
        <template #canvas>
          <div ref="canvasContainer" class="w-full h-full" />
        </template>
      </Viewer3dArea>
    </AreaCard>

    <!-- 2D 공정표 -->
    <AreaCard title="2D 공정표" height="flex-1" min-height="1100px">
      <Viewer2dArea @works-loaded="onWorksLoaded" />
    </AreaCard>
  </PageContainer>
</template>
