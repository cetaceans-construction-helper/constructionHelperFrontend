<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import * as THREE from 'three'
import PageContainer from '@/components/helper/PageContainer.vue'
import AreaCard from '@/components/helper/AreaCard.vue'
import { useEngine } from '@/composables/useEngine'
import { useDailyReport } from '@/composables/useDailyReport'
import Viewer3dArea from './components/Viewer3dArea.vue'
import { object3dApi } from '@/api/object3d'
import { taskApi } from '@/api/task'
import { workApi, type WorkResponse } from '@/api/work'
import type { Object3d, Task } from '@/types/object3d'

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

// Object3d 데이터
const object3dMap = ref<Map<number, Object3d>>(new Map())

// 선택 상태
const selectedObject3d = ref<Object3d | null>(null)
const selectedTasks = ref<Task[]>([])
const isLoadingTasks = ref(false)

// 작업 일보
const works = ref<WorkResponse[]>([])
const dailyReport = useDailyReport()

onMounted(async () => {
  init()

  try {
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

    // 작업 목록 및 작업 일보 데이터 로드
    works.value = await workApi.getWorkList()
    await dailyReport.loadDailyData()
  } catch (error: unknown) {
    console.error('초기 데이터 로드 실패:', error)
  }
})

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
</script>

<template>
  <PageContainer title="3D공정표">
    <AreaCard height="flex-1" min-height="1100px">
      <Viewer3dArea
        :is-loading="isLoading"
        :load-progress="loadProgress"
        :load-error="loadError"
        :selected-object3d="selectedObject3d"
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
  </PageContainer>
</template>
