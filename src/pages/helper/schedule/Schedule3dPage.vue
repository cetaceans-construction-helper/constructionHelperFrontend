<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PageContainer from '@/components/helper/PageContainer.vue'
import AreaCard from '@/components/helper/AreaCard.vue'
import { useEngine } from '@/composables/useEngine'
import Viewer3dArea from './components/Viewer3dArea.vue'
import Viewer2dArea from './components/Viewer2dArea.vue'

// 3D Engine
const canvasContainer = ref<HTMLDivElement | null>(null)
const {
  isLoading,
  loadProgress,
  loadError,
  init,
  loadJsonModel,
  rotateLeft,
  rotateRight
} = useEngine(canvasContainer)

onMounted(async () => {
  init()
  await loadJsonModel('./test_objects.json')
})
</script>

<template>
  <PageContainer title="공정표">
    <!-- 3D 공정표 -->
    <AreaCard title="3D 공정표" height="flex-1" min-height="1100px">
      <Viewer3dArea
        :is-loading="isLoading"
        :load-progress="loadProgress"
        :load-error="loadError"
        @rotate-left="rotateLeft"
        @rotate-right="rotateRight"
      >
        <template #canvas>
          <div ref="canvasContainer" class="w-full h-full" />
        </template>
      </Viewer3dArea>
    </AreaCard>

    <!-- 2D 공정표 -->
    <AreaCard title="2D 공정표" height="flex-1" min-height="1100px">
      <Viewer2dArea />
    </AreaCard>
  </PageContainer>
</template>
