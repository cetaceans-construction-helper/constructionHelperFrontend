<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Checkbox } from '@/shared/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Truck, ArrowDown, RotateCcw, Plus, Minus } from 'lucide-vue-next'
import { useFloorPlanStore, drawingAxisApi } from '@/features/floor-plan/public'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import SideTabBox from '@/shared/helper-ui/SideTabBox.vue'
import {
  referenceApi,
  type ComponentTypeResponse,
  type MaterialTypeResponse,
  type IdNameResponse,
  type WorkTypeResponse,
} from '@/shared/network-core/apis/reference'
import {
  materialOrderApi,
  validateMaterialOrderCreationInput,
} from '@/features/material/public'
import { taskApi } from '@/shared/network-core/apis/task'
import type { Object3d, Task } from '@/features/schedule/schedule-3d/model/object3d-types'
import type { WorkResponse } from '@/shared/network-core/apis/work'
import { analyticsClient } from '@/shared/analytics/analyticsClient'

const router = useRouter()

const props = defineProps<{
  isLoading: boolean
  loadProgress: number
  loadError: string | null
  selectedObject3d: Object3d | null
  selectedObject3dIds: number[]
  selectedTasks: Task[]
  isLoadingTasks: boolean
  works: WorkResponse[]
  dailyWorkIds: number[]
  dailyDate: string
  showTodayOnly: boolean
  selectedWorkId: number | null
  isLoadingDaily: boolean
  isPortrait: boolean
  floors: { id: number; name: string }[]
  zones: { id: number; name: string }[]
  selectedFloorIds: number[]
  selectedZoneIds: number[]
  componentTypesByStructure: Map<string, ComponentTypeResponse[]>
  selectedIsStructure: boolean | null
  selectedComponentTypeId: number | null
}>()

const emit = defineEmits<{
  'top-view': []
  'reset-view': []
  'date-change': [date: string]
  'toggle-today-only': [checked: boolean]
  'work-click': [workId: number]
  'tasks-updated': [updates: { taskId: number; quantity: number }[]]
  'toggle-floor': [id: number]
  'toggle-zone': [id: number]
  'zoom-in': []
  'zoom-out': []
  'update-objects': [updates: { id: number; zoneId?: number | null; floorId?: number | null; componentCodeId?: number | null }[]]
  'toggle-is-structure': [value: boolean]
  'toggle-component-type': [id: number]
}>()

const isTopView = ref(false)

function toggleTopView() {
  isTopView.value = !isTopView.value
  if (isTopView.value) {
    emit('top-view')
  } else {
    emit('reset-view')
  }
}

// 부재 편집 상태
const editZoneId = ref<number | null>(null)
const editFloorId = ref<number | null>(null)
const editIsStructure = ref<boolean | null>(null)
const editTypeId = ref<number | null>(null)
const editColor = ref<string>('')
const isSavingEdit = ref(false)

// 부재코드 캐스케이드: isStructure → type → code
const componentTypes = ref<ComponentTypeResponse[]>([])
const componentCodes = ref<{ id: number; code: string }[]>([])

async function selectIsStructure(value: boolean) {
  editIsStructure.value = editIsStructure.value === value ? null : value
  editTypeId.value = null
  componentTypes.value = []
  componentCodes.value = []
  if (editIsStructure.value != null) {
    try {
      componentTypes.value = await referenceApi.getComponentTypeList(editIsStructure.value)
    } catch { /* silent */ }
  }
}

async function selectType(id: number) {
  editTypeId.value = editTypeId.value === id ? null : id
  componentCodes.value = []
  if (editTypeId.value) {
    try {
      componentCodes.value = await referenceApi.getComponentCodeList(editTypeId.value)
    } catch { /* silent */ }
  }
}

const editComponentCodeId = ref<number | null>(null)

function toggleZone(id: number) { editZoneId.value = editZoneId.value === id ? null : id }
function toggleFloor(id: number) { editFloorId.value = editFloorId.value === id ? null : id }
function toggleComponentCode(id: number) { editComponentCodeId.value = editComponentCodeId.value === id ? null : id }

const hasEditChanges = computed(() =>
  editZoneId.value != null || editFloorId.value != null || editComponentCodeId.value != null || editColor.value !== '',
)

async function handleSaveEdit() {
  if (props.selectedObject3dIds.length === 0) return
  isSavingEdit.value = true
  try {
    const updates = props.selectedObject3dIds.map(id => {
      const update: Record<string, unknown> = { id }
      if (editZoneId.value != null) update.zoneId = editZoneId.value
      if (editFloorId.value != null) update.floorId = editFloorId.value
      if (editComponentCodeId.value != null) update.componentCodeId = editComponentCodeId.value
      if (editColor.value) {
        const hex = editColor.value
        update.layerColor = {
          r: parseInt(hex.slice(1, 3), 16),
          g: parseInt(hex.slice(3, 5), 16),
          b: parseInt(hex.slice(5, 7), 16),
          a: 255,
        }
      }
      return update
    })
    emit('update-objects', updates as any)
  } finally {
    isSavingEdit.value = false
    editZoneId.value = null
    editFloorId.value = null
    editIsStructure.value = null
    editTypeId.value = null
    editComponentCodeId.value = null
    editColor.value = ''
    componentTypes.value = []
    componentCodes.value = []
  }
}

// ========== 축설정 ==========
interface LocalAxis { id: number | null; label: string; position: number }

const axisStore = useFloorPlanStore()
const { sortedXAxes, sortedYAxes } = storeToRefs(axisStore)
const axisLocalX = ref<LocalAxis[]>([])
const axisLocalY = ref<LocalAxis[]>([])
const axisExpanded = ref(true)
const axisSaving = ref(false)

function axisLoadLocal() {
  axisLocalX.value = sortedXAxes.value.map(a => ({ id: a.id, label: a.label, position: a.position }))
  axisLocalY.value = sortedYAxes.value.map(a => ({ id: a.id, label: a.label, position: a.position }))
}
// 탭 전환 시 로드
watch(() => sortedXAxes.value.length + sortedYAxes.value.length, axisLoadLocal, { immediate: true })

function axisGetGap(axes: LocalAxis[], i: number): number {
  if (i === 0) return axes[0]?.position ?? 0
  return (axes[i]?.position ?? 0) - (axes[i - 1]?.position ?? 0)
}

function axisOnGapChange(axes: LocalAxis[], i: number, value: string) {
  const num = parseInt(value, 10)
  if (isNaN(num)) return
  if (i === 0) {
    const delta = num - axes[0]!.position
    for (const a of axes) a.position += delta
    return
  }
  const prevPos = axes[i - 1]?.position ?? 0
  const delta = prevPos + num - axes[i]!.position
  for (let j = i; j < axes.length; j++) axes[j]!.position += delta
}

function axisInsert(type: 'x' | 'y', afterIndex: number) {
  const axes = type === 'x' ? axisLocalX.value : axisLocalY.value
  const prefix = type === 'x' ? 'X' : 'Y'
  const cur = axes[afterIndex]!
  const next = axes[afterIndex + 1]
  const pos = next ? Math.round((cur.position + next.position) / 2) : cur.position + 6000
  axes.splice(afterIndex + 1, 0, { id: null, label: `${prefix}${axes.length + 1}`, position: pos })
}

function axisAddFirst(type: 'x' | 'y') {
  const axes = type === 'x' ? axisLocalX.value : axisLocalY.value
  const prefix = type === 'x' ? 'X' : 'Y'
  if (axes.length === 0) axes.push({ id: null, label: `${prefix}1`, position: 0 })
  else axes.push({ id: null, label: `${prefix}${axes.length + 1}`, position: axes[axes.length - 1]!.position + 6000 })
}

async function axisRemove(axes: LocalAxis[], i: number) {
  const axis = axes[i]
  if (axis?.id != null) {
    try { await drawingAxisApi.deleteDrawingAxis(axis.id) }
    catch (e: any) { alert(e.response?.data?.message || e.message); return }
  }
  axes.splice(i, 1)
}

async function axisSave() {
  axisSaving.value = true
  try {
    const all = [...axisLocalX.value.map(a => ({ ...a, isX: true })), ...axisLocalY.value.map(a => ({ ...a, isX: false }))]
    const toCreate = all.filter(a => a.id == null).map(a => ({ isX: a.isX, name: a.label, position: Math.round(a.position) }))
    const toUpdate = all.filter(a => a.id != null).map(a => ({ id: a.id!, name: a.label, position: Math.round(a.position) }))
    if (toCreate.length > 0) await drawingAxisApi.createDrawingAxis(toCreate)
    if (toUpdate.length > 0) await drawingAxisApi.updateDrawingAxis(toUpdate)
    await axisStore.loadAxes()
  } catch (e: any) { alert(e.response?.data?.message || e.message) }
  finally { axisSaving.value = false }
}

// 물량설정 다이얼로그 상태
const showQuantityDialog = ref(false)
const editQuantities = ref<Map<number, string>>(new Map())
const isUpdatingQuantity = ref(false)

function openQuantityDialog() {
  editQuantities.value = new Map(
    props.selectedTasks.map((t) => [t.id, String(t.planedQuantity ?? '')]),
  )
  showQuantityDialog.value = true
}

async function handleUpdateQuantity() {
  const updates: { taskId: number; quantity: number }[] = []
  for (const task of props.selectedTasks) {
    const raw = editQuantities.value.get(task.id) ?? ''
    const quantity = Number(raw)
    if (isNaN(quantity)) {
      alert(`세부작업 ID ${task.id}: 유효한 숫자를 입력해주세요`)
      return
    }
    if (quantity !== task.planedQuantity) {
      updates.push({ taskId: task.id, quantity })
    }
  }

  if (updates.length === 0) {
    showQuantityDialog.value = false
    return
  }

  isUpdatingQuantity.value = true
  try {
    await Promise.all(
      updates.map((u) => taskApi.updateTaskQuantity(u.taskId, u.quantity)),
    )
    emit('tasks-updated', updates)
    showQuantityDialog.value = false
    analyticsClient.trackAction('schedule_3d', 'update_task_quantity', 'success')
  } catch (error: unknown) {
    console.error('물량 업데이트 실패:', error)
    analyticsClient.trackAction('schedule_3d', 'update_task_quantity', 'fail')
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  } finally {
    isUpdatingQuantity.value = false
  }
}

// 발주서 생성 다이얼로그 상태
const showOrderDialog = ref(false)
const materialTypes = ref<MaterialTypeResponse[]>([])
const selectedMaterialTypeId = ref<string>('')
const divisions = ref<IdNameResponse[]>([])
const workTypes = ref<WorkTypeResponse[]>([])
const selectedDivisionId = ref<string>('')
const selectedWorkTypeId = ref<string>('')
const isCreatingOrder = ref(false)
const isLoadingWorkTypes = ref(false)

async function handleTruckClick() {
  if (props.selectedObject3dIds.length === 0) {
    alert('부재를 선택해주세요')
    return
  }

  try {
    const [mtList, divList] = await Promise.all([
      referenceApi.getMaterialTypeList(),
      referenceApi.getDivisionList(),
    ])
    materialTypes.value = mtList
    divisions.value = divList
    selectedMaterialTypeId.value = ''
    selectedDivisionId.value = ''
    selectedWorkTypeId.value = ''
    workTypes.value = []
    showOrderDialog.value = true
  } catch (error: unknown) {
    console.error('목록 로드 실패:', error)
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  }
}

async function handleDivisionChange(divisionId: string | number | bigint | Record<string, unknown> | null) {
  selectedDivisionId.value = String(divisionId ?? '')
  selectedWorkTypeId.value = ''
  workTypes.value = []
  if (!selectedDivisionId.value) return

  isLoadingWorkTypes.value = true
  try {
    workTypes.value = await referenceApi.getWorkTypeList(Number(selectedDivisionId.value))
  } catch (error: unknown) {
    console.error('공종 목록 로드 실패:', error)
  } finally {
    isLoadingWorkTypes.value = false
  }
}

async function handleCreateOrder() {
  const validationError = validateMaterialOrderCreationInput({
    materialTypeId: selectedMaterialTypeId.value,
    workTypeId: selectedWorkTypeId.value,
  })
  if (validationError) {
    alert(validationError)
    return
  }

  isCreatingOrder.value = true
  try {
    await materialOrderApi.createMaterialOrder(
      props.selectedObject3dIds,
      Number(selectedMaterialTypeId.value),
      Number(selectedWorkTypeId.value),
    )
    showOrderDialog.value = false
    analyticsClient.trackAction('schedule_3d', 'create_material_order', 'success')
    router.push('/helper/material/order')
  } catch (error: unknown) {
    console.error('발주서 생성 실패:', error)
    analyticsClient.trackAction('schedule_3d', 'create_material_order', 'fail')
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  } finally {
    isCreatingOrder.value = false
  }
}

// 날짜 조절
function adjustDate(days: number) {
  const date = new Date(props.dailyDate)
  date.setDate(date.getDate() + days)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  emit('date-change', `${y}-${m}-${d}`)
}

// dailyWorkIds로 필터된 works를 division > workType으로 2단계 그루핑
type GroupedWorks = Map<string, Map<string, WorkResponse[]>>

const groupedDailyWorks = computed<GroupedWorks>(() => {
  const dailySet = new Set(props.dailyWorkIds)
  const filtered = props.works.filter((w) => dailySet.has(w.workId))

  const result: GroupedWorks = new Map()
  for (const work of filtered) {
    const div = work.division || '미분류'
    const wt = work.workType || '미분류'

    if (!result.has(div)) {
      result.set(div, new Map())
    }
    const divMap = result.get(div)!
    if (!divMap.has(wt)) {
      divMap.set(wt, [])
    }
    divMap.get(wt)!.push(work)
  }
  return result
})
</script>

<template>
  <div class="viewer3d-layout">
    <!-- 3D 뷰어 영역 -->
    <div class="relative flex-1 min-w-0">
      <div class="border border-border rounded-lg overflow-hidden w-full h-full">
        <slot name="canvas" />
      </div>

      <!-- 로딩 상태 표시 -->
      <div
        v-if="isLoading"
        class="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg"
      >
        <p class="text-sm font-medium">3D 모델 로딩 중...</p>
        <div class="mt-2 w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            class="h-full bg-blue-500 transition-all duration-300"
            :style="{ width: `${loadProgress}%` }"
          />
        </div>
        <p class="mt-1 text-xs text-gray-500">{{ loadProgress.toFixed(1) }}%</p>
      </div>

      <!-- 에러 표시 -->
      <div
        v-if="loadError"
        class="absolute top-4 left-4 bg-red-50 border border-red-200 p-4 rounded-lg shadow-lg"
      >
        <p class="text-sm font-medium text-red-600">모델 로드 실패</p>
        <p class="mt-1 text-xs text-red-500">{{ loadError }}</p>
      </div>

      <!-- 구역/층 필터 (하단) -->
      <div class="absolute bottom-3 left-3 z-10 flex flex-col gap-1">
        <div v-if="zones.length > 0" class="flex items-center gap-1">
          <span class="text-xs text-muted-foreground font-medium mr-0.5">구역</span>
          <Button
            v-for="zone in zones"
            :key="zone.id"
            size="sm"
            :variant="selectedZoneIds.includes(zone.id) ? 'default' : 'outline'"
            :class="['h-7 px-2 text-xs', selectedZoneIds.includes(zone.id) ? '' : 'bg-white/80']"
            @click="emit('toggle-zone', zone.id)"
          >
            {{ zone.name }}
          </Button>
        </div>
        <div v-if="floors.length > 0" class="flex items-center gap-1">
          <span class="text-xs text-muted-foreground font-medium mr-0.5">층</span>
          <Button
            v-for="floor in floors"
            :key="floor.id"
            size="sm"
            :variant="selectedFloorIds.includes(floor.id) ? 'default' : 'outline'"
            :class="['h-7 px-2 text-xs', selectedFloorIds.includes(floor.id) ? '' : 'bg-white/80']"
            @click="emit('toggle-floor', floor.id)"
          >
            {{ floor.name }}
          </Button>
        </div>
        <div class="flex items-center gap-1">
          <span class="text-xs text-muted-foreground font-medium mr-0.5">부재</span>
          <Button
            size="sm"
            :variant="selectedIsStructure === true ? 'default' : 'outline'"
            :class="['h-7 px-2 text-xs', selectedIsStructure === true ? '' : 'bg-white/80']"
            @click="emit('toggle-is-structure', true)"
          >
            구조
          </Button>
          <Button
            size="sm"
            :variant="selectedIsStructure === false ? 'default' : 'outline'"
            :class="['h-7 px-2 text-xs', selectedIsStructure === false ? '' : 'bg-white/80']"
            @click="emit('toggle-is-structure', false)"
          >
            비구조
          </Button>
        </div>
        <div v-if="selectedIsStructure != null && (componentTypesByStructure.get(String(selectedIsStructure))?.length ?? 0) > 0" class="flex items-center gap-1 flex-wrap">
          <span class="text-xs text-muted-foreground font-medium mr-0.5">타입</span>
          <Button
            v-for="ct in componentTypesByStructure.get(String(selectedIsStructure))"
            :key="ct.id"
            size="sm"
            :variant="selectedComponentTypeId === ct.id ? 'default' : 'outline'"
            :class="['h-7 px-2 text-xs', selectedComponentTypeId === ct.id ? '' : 'bg-white/80']"
            @click="emit('toggle-component-type', ct.id)"
          >
            {{ ct.name }}
          </Button>
        </div>
      </div>

      <!-- 세로모드 줌 버튼 (우하단) -->
      <div v-if="isPortrait" class="absolute bottom-3 right-3 z-10 flex flex-col gap-1">
        <Button variant="outline" size="icon" class="h-10 w-10 bg-white/80" @click="emit('zoom-in')">
          <Plus class="h-5 w-5" />
        </Button>
        <Button variant="outline" size="icon" class="h-10 w-10 bg-white/80" @click="emit('zoom-out')">
          <Minus class="h-5 w-5" />
        </Button>
      </div>

      <!-- 탑뷰 토글 버튼 (세로모드에서는 숨김 — 항상 탑뷰) -->
      <Button
        v-if="!isPortrait"
        variant="outline"
        size="icon"
        class="absolute top-4 right-20 bg-white/80 hover:bg-white h-12 w-12"
        :class="isTopView ? 'ring-2 ring-primary' : ''"
        @click="toggleTopView"
        :title="isTopView ? '기본 뷰' : '탑뷰'"
      >
        <component :is="isTopView ? RotateCcw : ArrowDown" class="size-7" />
      </Button>

      <!-- 발주서 생성 버튼 -->
      <Button
        variant="outline"
        size="icon"
        class="absolute top-4 right-4 bg-white/80 hover:bg-white h-12 w-12"
        @click="handleTruckClick"
      >
        <Truck class="size-7" />
      </Button>

    </div>

    <!-- 발주서 생성 다이얼로그 -->
    <Dialog v-model:open="showOrderDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>발주서 생성</DialogTitle>
          <DialogDescription>
            선택된 부재: {{ selectedObject3dIds.length }}개
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <div class="space-y-2">
            <label class="text-sm font-medium">자재유형</label>
            <Select v-model="selectedMaterialTypeId">
              <SelectTrigger>
                <SelectValue placeholder="자재유형을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="mt in materialTypes"
                  :key="mt.id"
                  :value="String(mt.id)"
                >
                  {{ mt.name }} ({{ mt.unit }})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium">공종</label>
            <Select :model-value="selectedDivisionId" @update:model-value="handleDivisionChange">
              <SelectTrigger>
                <SelectValue placeholder="분류 선택" />
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
            <Select v-model="selectedWorkTypeId" :disabled="!selectedDivisionId || isLoadingWorkTypes">
              <SelectTrigger>
                <SelectValue :placeholder="isLoadingWorkTypes ? '로딩중...' : '공종 선택'" />
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
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" @click="showOrderDialog = false">취소</Button>
          <Button :disabled="!selectedMaterialTypeId || !selectedWorkTypeId || isCreatingOrder" @click="handleCreateOrder">
            {{ isCreatingOrder ? '생성 중...' : '발주서 생성' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 물량설정 다이얼로그 -->
    <Dialog v-model:open="showQuantityDialog">
      <DialogContent class="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>물량설정</DialogTitle>
          <DialogDescription>
            세부작업 {{ selectedTasks.length }}건의 계획 수량을 설정합니다.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-3 py-4 max-h-80 overflow-y-auto">
          <div
            v-for="task in selectedTasks"
            :key="task.id"
            class="flex items-center gap-3 border border-border rounded-lg p-3"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-foreground truncate">
                {{ task.divisionName }} &gt; {{ task.workTypeName }} &gt; {{ task.subWorkTypeName }}
              </p>
              <span class="text-xs text-muted-foreground">ID: {{ task.id }}</span>
            </div>
            <Input
              :model-value="editQuantities.get(task.id) ?? ''"
              type="number"
              step="any"
              class="w-28 h-8 text-sm"
              placeholder="수량"
              @update:model-value="(val: string | number) => editQuantities.set(task.id, String(val))"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" @click="showQuantityDialog = false">취소</Button>
          <Button :disabled="isUpdatingQuantity" @click="handleUpdateQuantity">
            {{ isUpdatingQuantity ? '저장 중...' : '저장' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 탭 박스 -->
    <SideTabBox
      :tabs="[
        { value: 'object3d', label: '부재 정보' },
        { value: 'daily', label: '작업 일보' },
        { value: 'schedule', label: '일정' },
        { value: 'material', label: '자재' },
        { value: 'setting', label: '부재설정' },
        { value: 'axis', label: '축설정' }
      ]"
      default-tab="object3d"
    >
      <template #default="{ activeTab }">
        <!-- 작업 일보 탭 -->
        <div v-if="activeTab === 'daily'" class="space-y-3">
          <!-- 날짜 선택기 -->
          <div class="flex items-center gap-1">
            <Button
              variant="outline"
              class="h-10 w-10 text-xl font-bold p-0 flex-shrink-0"
              @click="adjustDate(-1)"
            >
              −
            </Button>
            <Input
              :model-value="dailyDate"
              type="date"
              class="h-10 text-sm text-center flex-1"
              @update:model-value="(val: string | number) => emit('date-change', String(val))"
            />
            <Button
              variant="outline"
              class="h-10 w-10 text-xl font-bold p-0 flex-shrink-0"
              @click="adjustDate(1)"
            >
              +
            </Button>
          </div>

          <!-- 오늘 작업할 부재만 보기 체크박스 -->
          <label class="flex items-center gap-2 cursor-pointer">
            <Checkbox
              :model-value="showTodayOnly"
              @update:model-value="(val) => emit('toggle-today-only', val === true)"
            />
            <span class="text-sm">오늘 작업할 부재만 보기</span>
          </label>

          <!-- 로딩 -->
          <div v-if="isLoadingDaily" class="text-sm text-muted-foreground text-center py-4">
            작업 일보 로딩 중...
          </div>

          <!-- 작업 카드 목록 (그루핑) -->
          <div v-else-if="groupedDailyWorks.size > 0" class="space-y-2">
            <details
              v-for="[divisionName, workTypeMap] in groupedDailyWorks"
              :key="divisionName"
              open
              class="group"
            >
              <summary class="cursor-pointer text-sm font-semibold text-foreground py-1 list-none flex items-center gap-1">
                <svg
                  class="w-3 h-3 transition-transform group-open:rotate-90"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
                {{ divisionName }}
              </summary>
              <div class="pl-2 space-y-1.5 mt-1">
                <details
                  v-for="[workTypeName, workList] in workTypeMap"
                  :key="workTypeName"
                  open
                  class="group/sub"
                >
                  <summary class="cursor-pointer text-xs font-medium text-muted-foreground py-0.5 list-none flex items-center gap-1">
                    <svg
                      class="w-2.5 h-2.5 transition-transform group-open/sub:rotate-90"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                    {{ workTypeName }}
                  </summary>
                  <div class="pl-2 space-y-1 mt-1">
                    <div
                      v-for="work in workList"
                      :key="work.workId"
                      class="border rounded-lg p-2.5 cursor-pointer transition-colors text-sm"
                      :class="selectedWorkId === work.workId
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted/50'"
                      @click="emit('work-click', work.workId)"
                    >
                      <p class="font-medium text-foreground truncate">{{ work.workName }}</p>
                      <div class="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-1">
                        <span v-if="work.zoneNames?.length">{{ work.zoneNames.join(', ') }}</span>
                        <span v-if="work.floorNames?.length">{{ work.floorNames.join(', ') }}</span>
                        <!-- TODO: section/usage 임시 비활성화 -->
                        <!-- <span v-if="work.sectionNames?.length">{{ work.sectionNames.join(', ') }}</span>
                        <span v-if="work.usageNames?.length">{{ work.usageNames.join(', ') }}</span> -->
                      </div>
                      <p class="text-xs text-muted-foreground mt-0.5">
                        {{ work.startDate }} ~ {{ work.completionDate }}
                      </p>
                    </div>
                  </div>
                </details>
              </div>
            </details>
          </div>

          <!-- 빈 상태 -->
          <div v-else class="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
            해당 날짜에 작업이 없습니다.
          </div>
        </div>

        <!-- 부재 정보 탭 -->
        <div v-else-if="activeTab === 'object3d'">
          <div v-if="selectedObject3dIds.length === 0" class="text-sm text-muted-foreground">
            객체를 선택하면 부재 정보가 표시됩니다.
          </div>
          <div v-else class="space-y-4">
            <!-- 선택 요약 -->
            <div class="text-sm font-medium text-foreground">
              {{ selectedObject3dIds.length }}개 부재 선택됨
            </div>

            <!-- 단일 선택 시 상세 정보 -->
            <div v-if="selectedObject3d" class="border border-border rounded-lg p-3 space-y-2">
              <h4 class="text-sm font-semibold text-foreground">상세 정보</h4>
              <div class="grid grid-cols-2 gap-y-1.5 text-sm">
                <span class="text-muted-foreground">ID</span>
                <span class="text-foreground">{{ selectedObject3d.id }}</span>
                <span class="text-muted-foreground">구역</span>
                <span class="text-foreground">{{ selectedObject3d.zoneName ?? '-' }}</span>
                <span class="text-muted-foreground">층</span>
                <span class="text-foreground">{{ selectedObject3d.floorName ?? '-' }}</span>
                <span class="text-muted-foreground">부재코드</span>
                <span class="text-foreground">{{ selectedObject3d.componentCode ?? '-' }}</span>
                <span class="text-muted-foreground">축선</span>
                <span class="text-foreground">{{ selectedObject3d.axisLabel ?? '-' }}</span>
              </div>
            </div>

            <!-- 태스크 목록 -->
            <div v-if="selectedObject3d">
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-semibold text-foreground">세부작업</h4>
                <Button
                  v-if="selectedTasks.length > 0"
                  variant="outline"
                  size="sm"
                  class="h-6 px-2 text-xs"
                  @click="openQuantityDialog()"
                >
                  물량설정
                </Button>
              </div>
              <div v-if="isLoadingTasks" class="text-sm text-muted-foreground">
                작업 목록 로딩 중...
              </div>
              <div v-else-if="selectedTasks.length === 0" class="text-sm text-muted-foreground">
                세부작업이 없습니다.
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="task in selectedTasks"
                  :key="task.id"
                  class="border border-border rounded-lg p-3 space-y-1"
                >
                  <p class="text-sm font-medium text-foreground">
                    {{ task.divisionName }} &gt; {{ task.workTypeName }} &gt; {{ task.subWorkTypeName }}
                  </p>
                  <div class="flex justify-between text-xs text-muted-foreground">
                    <span>ID: {{ task.id }}</span>
                    <span>계획 수량: {{ task.planedQuantity }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 설정 탭 -->
        <div v-else-if="activeTab === 'setting'">
          <div v-if="selectedObject3dIds.length === 0" class="text-sm text-muted-foreground">
            객체를 선택하면 정보를 변경할 수 있습니다.
          </div>
          <div v-else class="space-y-3">
            <div class="text-sm font-medium text-foreground">
              {{ selectedObject3dIds.length }}개 부재 선택됨
            </div>

            <!-- 구역 -->
            <div class="space-y-1">
              <label class="text-xs text-muted-foreground">구역</label>
              <div class="flex flex-wrap gap-1">
                <Button
                  size="sm"
                  :variant="editZoneId === -1 ? 'default' : 'outline'"
                  class="h-7 px-2 text-xs"
                  @click="toggleZone(-1)"
                >선택안함</Button>
                <Button
                  v-for="z in zones"
                  :key="z.id"
                  size="sm"
                  :variant="editZoneId === z.id ? 'default' : 'outline'"
                  class="h-7 px-2 text-xs"
                  @click="toggleZone(z.id)"
                >{{ z.name }}</Button>
              </div>
            </div>

            <!-- 층 -->
            <div class="space-y-1">
              <label class="text-xs text-muted-foreground">층</label>
              <div class="flex flex-wrap gap-1">
                <Button
                  v-for="f in floors"
                  :key="f.id"
                  size="sm"
                  :variant="editFloorId === f.id ? 'default' : 'outline'"
                  class="h-7 px-2 text-xs"
                  @click="toggleFloor(f.id)"
                >{{ f.name }}</Button>
              </div>
            </div>

            <!-- 부재 구분 -->
            <div class="space-y-1">
              <label class="text-xs text-muted-foreground">부재구분</label>
              <div class="flex gap-1">
                <Button
                  size="sm"
                  :variant="editIsStructure === true ? 'default' : 'outline'"
                  class="h-7 px-2 text-xs"
                  @click="selectIsStructure(true)"
                >구조</Button>
                <Button
                  size="sm"
                  :variant="editIsStructure === false ? 'default' : 'outline'"
                  class="h-7 px-2 text-xs"
                  @click="selectIsStructure(false)"
                >비구조</Button>
              </div>
            </div>

            <!-- 부위타입 -->
            <div v-if="componentTypes.length > 0" class="space-y-1">
              <label class="text-xs text-muted-foreground">부위타입</label>
              <div class="flex flex-wrap gap-1">
                <Button
                  v-for="t in componentTypes"
                  :key="t.id"
                  size="sm"
                  :variant="editTypeId === t.id ? 'default' : 'outline'"
                  class="h-7 px-2 text-xs"
                  @click="selectType(t.id)"
                >{{ t.name }}</Button>
              </div>
            </div>

            <!-- 부재코드 -->
            <div v-if="componentCodes.length > 0" class="space-y-1">
              <label class="text-xs text-muted-foreground">부재코드</label>
              <div class="flex flex-wrap gap-1">
                <Button
                  v-for="cc in componentCodes"
                  :key="cc.id"
                  size="sm"
                  :variant="editComponentCodeId === cc.id ? 'default' : 'outline'"
                  class="h-7 px-2 text-xs"
                  @click="toggleComponentCode(cc.id)"
                >{{ cc.code }}</Button>
              </div>
            </div>

            <!-- 색상 -->
            <div class="space-y-1">
              <label class="text-xs text-muted-foreground">색상</label>
              <div class="flex items-center gap-2">
                <input
                  type="color"
                  :value="editColor || '#cccccc'"
                  class="h-8 w-10 rounded border border-border cursor-pointer"
                  @input="editColor = ($event.target as HTMLInputElement).value"
                />
                <span class="text-xs text-muted-foreground">{{ editColor || '변경 안함' }}</span>
                <Button v-if="editColor" variant="ghost" size="sm" class="h-6 px-1 text-xs" @click="editColor = ''">초기화</Button>
              </div>
            </div>

            <Button
              size="sm"
              class="w-full"
              :disabled="!hasEditChanges || isSavingEdit"
              @click="handleSaveEdit"
            >
              {{ isSavingEdit ? '저장 중...' : '일괄 적용' }}
            </Button>
          </div>
        </div>

        <!-- 일정 탭 -->
        <div v-else-if="activeTab === 'schedule'" class="text-sm text-muted-foreground">
          일정 정보가 표시됩니다.
        </div>

        <!-- 자재 탭 -->
        <div v-else-if="activeTab === 'material'" class="text-sm text-muted-foreground">
          자재 정보가 표시됩니다.
        </div>

        <!-- 부재설정 탭 (기존 설정) -->
        <!-- 이미 위에 v-else-if="activeTab === 'setting'" 으로 존재 -->

        <!-- 축설정 탭 -->
        <div v-else-if="activeTab === 'axis'" class="space-y-3">
          <!-- X축 -->
          <div class="border border-border rounded-lg overflow-hidden">
            <button class="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-red-500 bg-muted/50 hover:bg-muted" @click="axisExpanded = !axisExpanded">
              축선 편집
              <span class="text-xs text-muted-foreground">{{ axisExpanded ? '접기' : '펼치기' }}</span>
            </button>
            <div v-if="axisExpanded" class="p-3 space-y-4">
              <div>
                <div class="mb-1.5">
                  <span class="text-xs font-semibold text-red-500">X축 (수직선)</span>
                </div>
                <div class="space-y-1">
                  <div v-for="(axis, i) in axisLocalX" :key="i" class="flex items-center gap-1.5">
                    <Input :model-value="axis.label" @change="axis.label = ($event.target as HTMLInputElement).value.trim() || axis.label" class="h-7 w-14 text-xs px-1 text-center font-medium shrink-0" />
                    <Input :model-value="axisGetGap(axisLocalX, i).toString()" @change="axisOnGapChange(axisLocalX, i, ($event.target as HTMLInputElement).value)" class="h-7 flex-1 text-xs text-center" type="number" />
                    <Button variant="ghost" size="sm" class="h-6 w-6 p-0 shrink-0" @click="axisInsert('x', i)" title="아래에 삽입"><Plus class="h-3 w-3 text-muted-foreground" /></Button>
                    <Button variant="ghost" size="sm" class="h-6 w-6 p-0 shrink-0" @click="axisRemove(axisLocalX, i)"><Minus class="h-3 w-3 text-muted-foreground" /></Button>
                  </div>
                </div>
              </div>

              <div>
                <div class="mb-1.5">
                  <span class="text-xs font-semibold text-blue-500">Y축 (수평선)</span>
                </div>
                <div class="space-y-1">
                  <div v-for="(axis, i) in axisLocalY" :key="i" class="flex items-center gap-1.5">
                    <Input :model-value="axis.label" @change="axis.label = ($event.target as HTMLInputElement).value.trim() || axis.label" class="h-7 w-14 text-xs px-1 text-center font-medium shrink-0" />
                    <Input :model-value="axisGetGap(axisLocalY, i).toString()" @change="axisOnGapChange(axisLocalY, i, ($event.target as HTMLInputElement).value)" class="h-7 flex-1 text-xs text-center" type="number" />
                    <Button variant="ghost" size="sm" class="h-6 w-6 p-0 shrink-0" @click="axisInsert('y', i)" title="아래에 삽입"><Plus class="h-3 w-3 text-muted-foreground" /></Button>
                    <Button variant="ghost" size="sm" class="h-6 w-6 p-0 shrink-0" @click="axisRemove(axisLocalY, i)"><Minus class="h-3 w-3 text-muted-foreground" /></Button>
                  </div>
                </div>
              </div>

              <Button size="sm" class="w-full" :disabled="axisSaving" @click="axisSave">
                {{ axisSaving ? '저장 중...' : '저장' }}
              </Button>
            </div>
          </div>
        </div>
      </template>
    </SideTabBox>
  </div>
</template>

<style scoped>
.viewer3d-layout {
  display: flex;
  gap: 1rem;
  height: 100%;
}

@media (max-aspect-ratio: 1/1) {
  .viewer3d-layout {
    flex-direction: column;
  }

  .viewer3d-layout :deep(.w-\[30rem\]) {
    width: 100%;
  }
}
</style>
