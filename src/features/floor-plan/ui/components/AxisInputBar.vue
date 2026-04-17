<script setup lang="ts">
import { ref, watch } from 'vue'
import { useFloorPlanStore } from '@/features/floor-plan/view-model/useFloorPlanStore'
import { drawingAxisApi } from '@/features/floor-plan/infra/drawing-axis-api'
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

interface LocalAxis {
  id: number | null // null = 새로 추가된 축
  label: string
  position: number
}

const store = useFloorPlanStore()
const { sortedXAxes, sortedYAxes } = storeToRefs(store)

const dialogOpen = ref(false)
const isSaving = ref(false)

// 로컬 편집용 복사본
const localX = ref<LocalAxis[]>([])
const localY = ref<LocalAxis[]>([])

// 다이얼로그 열 때 store → 로컬 복사
watch(dialogOpen, (open) => {
  if (open) {
    localX.value = sortedXAxes.value.map(a => ({ id: a.id, label: a.label, position: a.position }))
    localY.value = sortedYAxes.value.map(a => ({ id: a.id, label: a.label, position: a.position }))
  }
})

// 축간 거리 (1번째는 절대 위치)
function getGap(axes: LocalAxis[], index: number): number {
  if (index === 0) return axes[0]?.position ?? 0
  return (axes[index]?.position ?? 0) - (axes[index - 1]?.position ?? 0)
}

function onGapChange(axes: LocalAxis[], index: number, value: string) {
  const num = parseInt(value, 10)
  if (isNaN(num)) return

  if (index === 0) {
    const delta = num - axes[0]!.position
    for (const a of axes) a.position += delta
    return
  }

  const prevPos = axes[index - 1]?.position ?? 0
  const newPos = prevPos + num
  const delta = newPos - axes[index]!.position
  for (let i = index; i < axes.length; i++) {
    axes[i]!.position += delta
  }
}

function onLabelChange(axis: LocalAxis, value: string) {
  axis.label = value.trim() || axis.label
}

function addAxis(type: 'x' | 'y') {
  const axes = type === 'x' ? localX.value : localY.value
  const prefix = type === 'x' ? 'X' : 'Y'
  if (axes.length === 0) {
    axes.push({ id: null, label: `${prefix}1`, position: 0 })
  } else {
    const last = axes[axes.length - 1]!
    axes.push({ id: null, label: `${prefix}${axes.length + 1}`, position: last.position + 6000 })
  }
}

function insertAxis(type: 'x' | 'y', afterIndex: number) {
  const axes = type === 'x' ? localX.value : localY.value
  const prefix = type === 'x' ? 'X' : 'Y'
  const current = axes[afterIndex]!
  const next = axes[afterIndex + 1]
  const newPosition = next ? Math.round((current.position + next.position) / 2) : current.position + 6000
  axes.splice(afterIndex + 1, 0, { id: null, label: `${prefix}${axes.length + 1}`, position: newPosition })
}

// 삭제: 기존 축은 즉시 API 호출, 새 축(id=null)은 로컬에서만 제거
async function removeAxis(axes: LocalAxis[], index: number) {
  const axis = axes[index]
  if (axis?.id != null) {
    try {
      await drawingAxisApi.deleteDrawingAxis(axis.id)
    } catch (e: any) {
      console.error('축 삭제 실패:', e)
      const msg = e.response?.data?.message || e.message
      alert(msg)
      return
    }
  }
  axes.splice(index, 1)
}

async function handleConfirm() {
  isSaving.value = true
  try {
    const allLocal = [...localX.value.map(a => ({ ...a, isX: true })), ...localY.value.map(a => ({ ...a, isX: false }))]

    // create: id가 null인 항목
    const toCreate = allLocal
      .filter(a => a.id == null)
      .map(a => ({ isX: a.isX, name: a.label, position: Math.round(a.position) }))

    // update: id가 있는 항목
    const toUpdate = allLocal
      .filter(a => a.id != null)
      .map(a => ({ id: a.id!, name: a.label, position: Math.round(a.position) }))

    if (toCreate.length > 0) await drawingAxisApi.createDrawingAxis(toCreate)
    if (toUpdate.length > 0) await drawingAxisApi.updateDrawingAxis(toUpdate)

    // store 갱신
    await store.loadAxes()
    dialogOpen.value = false
    store.centerOnAxes()
  } catch (e: any) {
    console.error('축선 저장 실패:', e)
    const msg = e.response?.data?.message || e.message
    alert(msg)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Button variant="outline" size="sm" @click="dialogOpen = true" class="gap-1">
    <Grid3x3 class="h-4 w-4" />
    <span>축 설정</span>
  </Button>

  <Dialog :open="dialogOpen" @update:open="(v: boolean) => { if (!v) dialogOpen = false }">
    <DialogContent class="sm:!max-w-lg">
      <DialogHeader>
        <DialogTitle>축선 설정</DialogTitle>
      </DialogHeader>

      <div class="flex gap-6 py-2">
        <!-- X축 -->
        <div class="flex-1 flex flex-col gap-1.5">
          <div class="text-sm font-semibold text-red-500 mb-1">X축 (수직선)</div>
          <template v-for="(axis, i) in localX" :key="i">
            <div class="flex items-center gap-2">
              <Input
                :model-value="axis.label"
                @change="onLabelChange(axis, ($event.target as HTMLInputElement).value)"
                class="h-7 w-16 text-xs px-1 text-center font-medium shrink-0"
              />
              <Input
                :model-value="getGap(localX, i).toString()"
                @change="onGapChange(localX, i, ($event.target as HTMLInputElement).value)"
                class="h-7 flex-1 text-xs text-center"
                type="number"
              />
              <Button variant="ghost" size="sm" class="h-6 w-6 p-0 shrink-0" @click="insertAxis('x', i)" title="아래에 삽입">
                <Plus class="h-3 w-3 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="sm" class="h-6 w-6 p-0 shrink-0" @click="removeAxis(localX, i)">
                <Minus class="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          </template>
        </div>

        <!-- Y축 -->
        <div class="flex-1 flex flex-col gap-1.5">
          <div class="text-sm font-semibold text-blue-500 mb-1">Y축 (수평선)</div>
          <template v-for="(axis, i) in localY" :key="i">
            <div class="flex items-center gap-2">
              <Input
                :model-value="axis.label"
                @change="onLabelChange(axis, ($event.target as HTMLInputElement).value)"
                class="h-7 w-16 text-xs px-1 text-center font-medium shrink-0"
              />
              <Input
                :model-value="getGap(localY, i).toString()"
                @change="onGapChange(localY, i, ($event.target as HTMLInputElement).value)"
                class="h-7 flex-1 text-xs text-center"
                type="number"
              />
              <Button variant="ghost" size="sm" class="h-6 w-6 p-0 shrink-0" @click="insertAxis('y', i)" title="아래에 삽입">
                <Plus class="h-3 w-3 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="sm" class="h-6 w-6 p-0 shrink-0" @click="removeAxis(localY, i)">
                <Minus class="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          </template>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="dialogOpen = false">취소</Button>
        <Button @click="handleConfirm" :disabled="isSaving">
          {{ isSaving ? '저장 중...' : '확인' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
