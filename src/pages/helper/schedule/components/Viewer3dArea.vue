<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Truck } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import SideTabBox from '@/components/helper/SideTabBox.vue'
import {
  referenceApi,
  type MaterialTypeResponse,
  type IdNameResponse,
  type WorkTypeResponse,
} from '@/api/reference'
import { materialOrderApi } from '@/api/materialOrder'
import { taskApi } from '@/api/task'
import type { Object3d, Task } from '@/types/object3d'
import type { WorkResponse } from '@/api/work'

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
}>()

const emit = defineEmits<{
  rotateLeft: []
  rotateRight: []
  'date-change': [date: string]
  'toggle-today-only': [checked: boolean]
  'work-click': [workId: number]
  'tasks-updated': [updates: { taskId: number; quantity: number }[]]
}>()

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
  } catch (error: unknown) {
    console.error('물량 업데이트 실패:', error)
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
  if (!selectedMaterialTypeId.value) {
    alert('자재유형을 선택해주세요')
    return
  }
  if (!selectedWorkTypeId.value) {
    alert('공종을 선택해주세요')
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
    router.push('/helper/material/invoice')
  } catch (error: unknown) {
    console.error('발주서 생성 실패:', error)
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
  <div class="flex gap-4 h-full">
    <!-- 3D 뷰어 영역 -->
    <div class="relative flex-1 min-w-0">
      <div class="border border-border rounded-lg overflow-hidden w-full h-full">
        <slot name="canvas" />
      </div>

      <!-- 로딩 상태 표시 -->
      <div
        v-if="isLoading"
        class="absolute top-4 left-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg"
      >
        <p class="text-sm font-medium">3D 모델 로딩 중...</p>
        <div class="mt-2 w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
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
        class="absolute top-4 left-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg shadow-lg"
      >
        <p class="text-sm font-medium text-red-600 dark:text-red-400">모델 로드 실패</p>
        <p class="mt-1 text-xs text-red-500 dark:text-red-300">{{ loadError }}</p>
      </div>

      <!-- 왼쪽 회전 버튼 -->
      <Button
        variant="outline"
        size="icon"
        class="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 h-16 w-16"
        @click="emit('rotateLeft')"
      >
        <ChevronLeft class="h-10 w-10" />
      </Button>

      <!-- 오른쪽 회전 버튼 -->
      <Button
        variant="outline"
        size="icon"
        class="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 h-16 w-16"
        @click="emit('rotateRight')"
      >
        <ChevronRight class="h-10 w-10" />
      </Button>

      <!-- 발주서 생성 버튼 -->
      <Button
        variant="outline"
        size="icon"
        class="absolute top-4 right-4 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 h-12 w-12"
        @click="handleTruckClick"
      >
        <Truck class="size-7" />
      </Button>

      <!-- 사용법 안내 -->
      <div class="absolute bottom-3 right-3 text-xs text-muted-foreground/60 bg-background/50 px-2 py-1 rounded">
        Ctrl + 휠: 줌
      </div>
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

    <!-- 우측 탭 박스 -->
    <SideTabBox
      :tabs="[
        { value: 'daily', label: '작업 일보' },
        { value: 'object3d', label: '부재 정보' },
        { value: 'schedule', label: '일정' },
        { value: 'material', label: '자재' }
      ]"
      default-tab="daily"
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
                        <span v-if="work.zone">{{ work.zone }}</span>
                        <span v-if="work.floor">{{ work.floor }}</span>
                        <span v-if="work.section">{{ work.section }}</span>
                        <span v-if="work.usage">{{ work.usage }}</span>
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
          <div v-if="!selectedObject3d" class="text-sm text-muted-foreground">
            객체를 선택하면 부재 정보가 표시됩니다.
          </div>
          <div v-else class="space-y-4">
            <!-- 부재 카드 -->
            <div class="border border-border rounded-lg p-4 space-y-2">
              <h4 class="text-sm font-semibold text-foreground">부재 정보</h4>
              <div class="grid grid-cols-2 gap-y-1.5 text-sm">
                <span class="text-muted-foreground">ID</span>
                <span class="text-foreground">{{ selectedObject3d.id }}</span>
                <span class="text-muted-foreground">구역</span>
                <span class="text-foreground">{{ selectedObject3d.zoneName ?? '-' }}</span>
                <span class="text-muted-foreground">층</span>
                <span class="text-foreground">{{ selectedObject3d.floorName ?? '-' }}</span>
                <span class="text-muted-foreground">구간</span>
                <span class="text-foreground">{{ selectedObject3d.sectionName ?? '-' }}</span>
                <span class="text-muted-foreground">용도</span>
                <span class="text-foreground">{{ selectedObject3d.usageName ?? '-' }}</span>
                <span class="text-muted-foreground">부재코드</span>
                <span class="text-foreground">{{ selectedObject3d.componentCode ?? '-' }}</span>
              </div>
            </div>

            <!-- 태스크 목록 -->
            <div>
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

        <!-- 일정 탭 -->
        <div v-else-if="activeTab === 'schedule'" class="text-sm text-muted-foreground">
          일정 정보가 표시됩니다.
        </div>

        <!-- 자재 탭 -->
        <div v-else-if="activeTab === 'material'" class="text-sm text-muted-foreground">
          자재 정보가 표시됩니다.
        </div>
      </template>
    </SideTabBox>
  </div>
</template>
