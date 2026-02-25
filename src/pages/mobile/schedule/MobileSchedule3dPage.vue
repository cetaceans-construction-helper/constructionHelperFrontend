<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { useEngine } from '@/composables/useEngine'
import { object3dApi } from '@/api/object3d'
import { projectApi } from '@/api/project'
import { useProjectStore } from '@/stores/project'
import MobileViewer3dArea from './components/MobileViewer3dArea.vue'

let prevHtmlOverflow = ''
let prevBodyOverflow = ''
const projectStore = useProjectStore()

const canvasContainer = ref<HTMLDivElement | null>(null)
const isInitializing = ref(false)
const initError = ref<string | null>(null)
const modelCount = ref(0)

const { isLoading, loadProgress, loadError, init, loadApiModel, getEngine } = useEngine(canvasContainer, {
  enableShadows: false,
  backgroundColor: 0xe7f6ff,
})

function getErrorMessage(error: unknown): string {
  const err = error as { response?: { data?: { message?: string } }; message?: string }
  return err.response?.data?.message || err.message || '알 수 없는 오류가 발생했습니다.'
}

async function ensureProjectSelected() {
  if (projectStore.selectedProjectId) return

  const projects = await projectApi.getProjects()
  const firstProject = projects[0]
  if (!firstProject) {
    throw new Error('조회 가능한 프로젝트가 없습니다.')
  }
  projectStore.setProject(firstProject.id)
}

function enableMobileControls() {
  const engine = getEngine()
  const controls = engine?.getControls()
  if (!controls) return

  controls.enableRotate = true
  controls.enablePan = true
  controls.enableZoom = true
  controls.rotateSpeed = 0.8
  controls.panSpeed = 0.9
  controls.zoomSpeed = 0.9
  controls.touches.ONE = THREE.TOUCH.ROTATE
  controls.touches.TWO = THREE.TOUCH.DOLLY_PAN
  controls.update()
}

onMounted(() => {
  prevHtmlOverflow = document.documentElement.style.overflow
  prevBodyOverflow = document.body.style.overflow
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
})

onMounted(async () => {
  isInitializing.value = true
  initError.value = null

  try {
    await ensureProjectSelected()
    init()
    enableMobileControls()

    const object3dList = await object3dApi.getObject3dList()
    modelCount.value = object3dList.length
    loadApiModel(object3dList)
  } catch (error) {
    initError.value = getErrorMessage(error)
  } finally {
    isInitializing.value = false
  }
})

onUnmounted(() => {
  document.documentElement.style.overflow = prevHtmlOverflow
  document.body.style.overflow = prevBodyOverflow
})
</script>

<template>
  <div class="bg-background text-foreground flex flex-col overflow-hidden" style="height: 100dvh">
    <header class="shrink-0 px-4 py-3">
      <h1 class="text-base font-semibold">모바일 3D 공정표 (Gate 3)</h1>
    </header>

    <main class="flex-1 min-h-0 overflow-hidden">
      <div class="h-full min-h-0 flex flex-col">
        <section
          class="flex-[7] min-h-0 bg-sky-100 dark:bg-sky-950/40 flex items-center justify-center overflow-hidden"
        >
          <MobileViewer3dArea
            :is-initializing="isInitializing"
            :is-loading="isLoading"
            :load-progress="loadProgress"
            :error-message="initError || loadError"
          >
            <template #canvas>
              <div ref="canvasContainer" class="h-full w-full" />
            </template>
          </MobileViewer3dArea>
        </section>

        <section
          class="flex-[3] min-h-0 bg-amber-100 dark:bg-amber-950/40 px-4 py-3 flex flex-col gap-3 overflow-y-auto"
        >
          <p class="text-sm font-medium">하단 패널 영역</p>
          <p class="text-sm text-muted-foreground">
            Gate 3: 상단 패널 3D 모델이 연결되었습니다.
          </p>
          <p class="text-xs text-muted-foreground">로드된 부재 수: {{ modelCount }}</p>
        </section>
      </div>
    </main>
  </div>
</template>
