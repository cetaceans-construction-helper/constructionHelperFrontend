<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import PageContainer from '@/shared/helper-ui/PageContainer.vue'
import AreaCard from '@/shared/helper-ui/AreaCard.vue'
import DrawingSelector from './components/DrawingSelector.vue'
import FloorPlanCanvas from './components/FloorPlanCanvas.vue'
import FloorPlanToolbar from './components/FloorPlanToolbar.vue'
import ObjectInfoPanel from './components/ObjectInfoPanel.vue'
import { useFloorPlanStore } from '@/features/floor-plan/view-model/useFloorPlanStore'
import { storeToRefs } from 'pinia'
import { Button } from '@/shared/ui/button'
import { Pencil, X } from 'lucide-vue-next'

const store = useFloorPlanStore()
const { currentDrawing, currentObjects } = storeToRefs(store)

// 초기 데이터 로딩 + 저장된 선택 복원
onMounted(async () => {
  await store.loadAxes()
  await store.loadDrawingList()
  if (store.currentFloorId != null) {
    store.switchDrawing(store.currentZoneId, store.currentFloorId)
  }
})

const editing = ref(false)
const objectCount = computed(() => currentObjects.value.length)

function startEdit() {
  editing.value = true
}

function stopEdit() {
  editing.value = false
  store.activeMode = 'select'
  store.clearSelection()
}

// Delete/Escape 키 처리
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
    if (!editing.value) return
    for (const id of store.selectedBoxIds) {
      store.removeObject(id)
    }
  }
  if (e.key === 'Escape') {
    if (editing.value) {
      store.clearSelection()
    }
  }
}

onMounted(() => window.addEventListener('keydown', onKeyDown))
onUnmounted(() => window.removeEventListener('keydown', onKeyDown))
</script>

<template>
  <PageContainer title="도면 관리">
    <div class="flex items-center gap-4 mb-2">
      <DrawingSelector />
      <Button
        v-if="!editing"
        @click="startEdit"
        class="gap-1"
      >
        <Pencil class="h-4 w-4" />
        <span>편집</span>
      </Button>
      <Button
        v-else
        variant="outline"
        @click="stopEdit"
        class="gap-1"
      >
        <X class="h-4 w-4" />
        <span>편집 종료</span>
      </Button>
    </div>

    <!-- 편집 모드일 때 툴바 표시 -->
    <FloorPlanToolbar v-if="editing" class="mb-2" />

    <AreaCard height="flex-1" min-height="0px">
      <div v-if="!currentDrawing" class="flex items-center justify-center h-full text-muted-foreground">
        Zone과 Floor를 선택하세요
      </div>
      <div v-else class="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div class="relative flex-1 min-h-0">
          <FloorPlanCanvas class="absolute inset-0" :editing="editing" />
          <ObjectInfoPanel v-if="editing" />
        </div>
        <div class="text-sm text-muted-foreground p-2 border-t border-border shrink-0">
          Object2D: {{ objectCount }}개
        </div>
      </div>
    </AreaCard>
  </PageContainer>
</template>
