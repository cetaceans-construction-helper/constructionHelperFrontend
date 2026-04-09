<script setup lang="ts">
import { computed, ref } from 'vue'
import { useFloorPlanStore } from '@/features/floor-plan/view-model/useFloorPlanStore'
import { storeToRefs } from 'pinia'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog'
import { Plus, Minus, Grid3x3 } from 'lucide-vue-next'
import type { AxisLine } from '@/features/floor-plan/model/types'

const store = useFloorPlanStore()
const { sortedXAxes: currentXAxes, sortedYAxes: currentYAxes } = storeToRefs(store)

const dialogOpen = ref(false)

// 축간 거리 계산 (1번축은 0)
function getGap(axes: AxisLine[], index: number): number {
  if (index === 0) return 0
  const prev = axes[index - 1]
  const cur = axes[index]
  if (!prev || !cur) return 0
  return cur.position - prev.position
}

function onGapChange(type: 'x' | 'y', axisIndex: number, value: string) {
  const num = parseInt(value, 10)
  if (isNaN(num) || num < 0) return

  const axes = type === 'x' ? currentXAxes.value : currentYAxes.value
  if (axisIndex === 0) return // 1번축은 항상 0

  const prevPos = axes[axisIndex - 1]?.position ?? 0
  const targetAxis = axes[axisIndex]
  if (!targetAxis) return

  const newPos = prevPos + num
  const delta = newPos - targetAxis.position

  // 이 축 + 이후 축 모두 이동 (한번에 병렬 호출)
  const updates: { axisId: number; position: number }[] = []
  for (let i = axisIndex; i < axes.length; i++) {
    const a = axes[i]
    if (a) updates.push({ axisId: a.id, position: a.position + delta })
  }
  if (updates.length > 0) store.updateAxisValues(updates)
}

function onLabelChange(axisId: number, value: string) {
  if (value.trim()) store.updateAxisLabel(axisId, value.trim())
}

function addAxis(type: 'x' | 'y') {
  const axes = type === 'x' ? currentXAxes.value : currentYAxes.value
  if (axes.length === 0) {
    store.addAxis(type, 0)
  } else {
    const last = axes[axes.length - 1]!
    store.addAxis(type, last.position + 6000)
  }
}

function handleClose() {
  dialogOpen.value = false
  store.centerOnAxes()
}
</script>

<template>
  <Button variant="outline" size="sm" @click="dialogOpen = true" class="gap-1">
    <Grid3x3 class="h-4 w-4" />
    <span>축 설정</span>
  </Button>

  <Dialog :open="dialogOpen" @update:open="(v: boolean) => { if (!v) handleClose() }">
    <DialogContent class="sm:!max-w-lg">
      <DialogHeader>
        <DialogTitle>축선 설정</DialogTitle>
      </DialogHeader>

      <div class="flex gap-6 py-2">
        <!-- X축 -->
        <div class="flex-1 flex flex-col gap-1.5">
          <div class="text-sm font-semibold text-red-500 mb-1">X축 (수직선)</div>
          <div v-for="(axis, i) in currentXAxes" :key="axis.id" class="flex items-center gap-2">
            <Input
              :model-value="axis.label"
              @change="onLabelChange(axis.id, ($event.target as HTMLInputElement).value)"
              class="h-7 w-16 text-xs px-1 text-center font-medium shrink-0"
            />
            <Input
              v-if="i === 0"
              model-value="0"
              disabled
              class="h-7 flex-1 text-xs text-center bg-muted"
            />
            <Input
              v-else
              :model-value="getGap(currentXAxes, i).toString()"
              @change="onGapChange('x', i, ($event.target as HTMLInputElement).value)"
              class="h-7 flex-1 text-xs text-center"
              type="number"
              :min="0"
            />
            <Button v-if="i > 0" variant="ghost" size="sm" class="h-6 w-6 p-0 shrink-0" @click="store.removeAxis(axis.id)">
              <Minus class="h-3 w-3 text-muted-foreground" />
            </Button>
            <div v-else class="w-6 shrink-0" />
          </div>
          <Button variant="outline" size="sm" class="h-7 mt-1" @click="addAxis('x')">
            <Plus class="h-3 w-3 mr-1" />추가
          </Button>
        </div>

        <!-- Y축 -->
        <div class="flex-1 flex flex-col gap-1.5">
          <div class="text-sm font-semibold text-blue-500 mb-1">Y축 (수평선)</div>
          <div v-for="(axis, i) in currentYAxes" :key="axis.id" class="flex items-center gap-2">
            <Input
              :model-value="axis.label"
              @change="onLabelChange(axis.id, ($event.target as HTMLInputElement).value)"
              class="h-7 w-16 text-xs px-1 text-center font-medium shrink-0"
            />
            <Input
              v-if="i === 0"
              model-value="0"
              disabled
              class="h-7 flex-1 text-xs text-center bg-muted"
            />
            <Input
              v-else
              :model-value="getGap(currentYAxes, i).toString()"
              @change="onGapChange('y', i, ($event.target as HTMLInputElement).value)"
              class="h-7 flex-1 text-xs text-center"
              type="number"
              :min="0"
            />
            <Button v-if="i > 0" variant="ghost" size="sm" class="h-6 w-6 p-0 shrink-0" @click="store.removeAxis(axis.id)">
              <Minus class="h-3 w-3 text-muted-foreground" />
            </Button>
            <div v-else class="w-6 shrink-0" />
          </div>
          <Button variant="outline" size="sm" class="h-7 mt-1" @click="addAxis('y')">
            <Plus class="h-3 w-3 mr-1" />추가
          </Button>
        </div>
      </div>

      <DialogFooter>
        <Button @click="handleClose">확인</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
