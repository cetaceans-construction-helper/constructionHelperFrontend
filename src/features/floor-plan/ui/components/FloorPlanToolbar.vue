<script setup lang="ts">
import { Button } from '@/shared/ui/button'
import { useFloorPlanStore } from '@/features/floor-plan/view-model/useFloorPlanStore'
import { storeToRefs } from 'pinia'
import { Square, MousePointer, Upload, ImageIcon } from 'lucide-vue-next'
import type { ToolMode } from '@/features/floor-plan/model/types'
import AxisInputBar from './AxisInputBar.vue'

const store = useFloorPlanStore()
const { activeMode } = storeToRefs(store)

const tools: { mode: ToolMode; label: string; icon: typeof Square }[] = [
  { mode: 'adjust-image', label: '도면 조정', icon: ImageIcon },
  { mode: 'add-box', label: '부재생성', icon: Square },
  { mode: 'select', label: '선택', icon: MousePointer },
]

function handleUpload() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    await store.uploadDrawingImage(file)
  }
  input.click()
}
</script>

<template>
  <div class="flex items-center gap-1 p-2 border-b border-border bg-muted/30 flex-wrap">
    <Button variant="outline" size="sm" @click="handleUpload" class="gap-1">
      <Upload class="h-4 w-4" />
      <span>도면 업로드</span>
    </Button>

    <div class="w-px h-6 bg-border mx-1" />

    <Button
      v-for="tool in tools"
      :key="tool.mode"
      :variant="activeMode === tool.mode ? 'default' : 'ghost'"
      size="sm"
      @click="activeMode = activeMode === tool.mode ? 'select' : tool.mode"
      class="gap-1"
    >
      <component :is="tool.icon" class="h-4 w-4" />
      <span>{{ tool.label }}</span>
    </Button>

    <div class="w-px h-6 bg-border mx-1" />

    <AxisInputBar />
  </div>
</template>
