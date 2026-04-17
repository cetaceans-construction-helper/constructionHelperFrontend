<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import AreaCard from '@/shared/helper-ui/AreaCard.vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { DateStepper } from '@/shared/ui/date-stepper'
import { Plus, Pencil, Check, X, Camera } from 'lucide-vue-next'
import WorkPhotoDialog from '@/features/dashboard/ui/components/WorkPhotoDialog.vue'
import type { ActualWorkPhotoResponse } from '@/shared/network-core/apis/actualWork'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import DailyReportExcludeDialog from '@/features/dashboard/ui/components/DailyReportExcludeDialog.vue'
import { LaborInputDialog, EquipmentInputDialog } from '@/features/attendance/public'
import { useDashboardPage } from '@/features/dashboard/view-model/useDashboardPage'
import { referenceApi } from '@/shared/network-core/apis/reference'
import type { ActualWorkGroup } from '@/features/dashboard/model/dashboard-types'
import type { ActualWorkResponse } from '@/shared/network-core/apis/actualWork'

const {
  attendanceByGroup,
  confirmExcludeAndCreate,
  deliveryByWorkType,
  equipmentByGroup,
  generateHomepageDailyReport,
  isCreatingHomepageDailyReport,
  generateDailyReport,
  isCreatingDailyReport,
  isLoading,
  loadData,
  selectedDateString,
  showExcludeDialog,
  todayWeather,
  todayDayName,
  todayWorksByType,
  todayActualWorks,
  tomorrowWorksByType,
  tomorrowDateString,
  tomorrowMinDateString,
  createActualWork,
  updateActualWork,
  deleteActualWork,
  validateResult,
  photoObjectUrls,
  uploadPhotos,
  onPhotoUpdated,
} = useDashboardPage()

const isToday = computed(() => {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return selectedDateString.value === `${y}-${m}-${d}`
})

// 새로운 공종 섹션 추가 (유사도 검색으로 workType 해결 → 빈 섹션으로 UI 에 삽입)
// 클라이언트 상태로만 존재. 날짜 변경 시 초기화.
interface ExtraSection {
  id: number
  name: string
}

const quickAddOpen = ref(false)
const quickAddName = ref('')
const quickAddTarget = ref<'today' | 'tomorrow'>('today')
const isResolvingWorkType = ref(false)

const extraTodayWorkTypes = ref<ExtraSection[]>([])
const extraTomorrowWorkTypes = ref<ExtraSection[]>([])

watch(selectedDateString, () => {
  extraTodayWorkTypes.value = []
  extraTomorrowWorkTypes.value = []
  closeAllInputs()
})

function addExtraSection(target: 'today' | 'tomorrow', workType: ExtraSection) {
  const list = target === 'today' ? extraTodayWorkTypes : extraTomorrowWorkTypes
  if (!list.value.some((x) => x.id === workType.id)) {
    list.value = [...list.value, workType]
  }
}

function removeExtraSection(target: 'today' | 'tomorrow', workTypeId: number) {
  if (target === 'today') {
    extraTodayWorkTypes.value = extraTodayWorkTypes.value.filter((x) => x.id !== workTypeId)
  } else {
    extraTomorrowWorkTypes.value = extraTomorrowWorkTypes.value.filter((x) => x.id !== workTypeId)
  }
}

// 실제 works + extras 병합 (Map<workTypeId, ActualWorkGroup>)
function mergeWithExtras(
  base: Map<number, ActualWorkGroup>,
  extras: ExtraSection[],
): Map<number, ActualWorkGroup> {
  const merged = new Map(base)
  for (const ex of extras) {
    if (!merged.has(ex.id)) {
      merged.set(ex.id, { workTypeName: ex.name, items: [] })
    }
  }
  return merged
}

const mergedTodayWorksByType = computed(() =>
  mergeWithExtras(todayWorksByType.value, extraTodayWorkTypes.value),
)

const mergedTomorrowWorksByType = computed(() =>
  mergeWithExtras(tomorrowWorksByType.value, extraTomorrowWorkTypes.value),
)

function isEmptyExtraSection(target: 'today' | 'tomorrow', workTypeId: number, items: ActualWorkResponse[]): boolean {
  if (items.length > 0) return false
  const list = target === 'today' ? extraTodayWorkTypes : extraTomorrowWorkTypes
  return list.value.some((x) => x.id === workTypeId)
}

function openQuickAdd(target: 'today' | 'tomorrow') {
  quickAddName.value = ''
  quickAddTarget.value = target
  quickAddOpen.value = true
}

async function submitQuickAdd() {
  const name = quickAddName.value.trim()
  if (!name) return
  isResolvingWorkType.value = true
  try {
    const workType = await referenceApi.getWorkTypeDetail(name)
    addExtraSection(quickAddTarget.value, { id: workType.id, name: workType.name })
    quickAddOpen.value = false
  } catch (error: unknown) {
    console.error('공종 해결 실패:', error)
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  } finally {
    isResolvingWorkType.value = false
  }
}

// 공종 섹션 헤더 클릭 → inline input 으로 actualWork 생성
const activeCreateKey = ref<string | null>(null)  // `${target}-${workTypeId}`
const activeCreateName = ref('')
const isSubmittingCreate = ref(false)
const createInputRef = ref<HTMLElement | null>(null)

function createKey(target: 'today' | 'tomorrow', workTypeId: number): string {
  return `${target}-${workTypeId}`
}

async function openCreateInput(target: 'today' | 'tomorrow', workTypeId: number) {
  if (!isToday.value) return
  closeEditInput()
  activeCreateKey.value = createKey(target, workTypeId)
  activeCreateName.value = ''
  await nextTick()
  const el = createInputRef.value as unknown as { $el?: HTMLElement } | HTMLElement | null
  const dom = (el as any)?.$el ?? el
  dom?.querySelector('input')?.focus()
}

function closeCreateInput() {
  activeCreateKey.value = null
  activeCreateName.value = ''
}

async function submitCreate(target: 'today' | 'tomorrow', workTypeId: number) {
  const name = activeCreateName.value.trim()
  if (!name) return
  const date = target === 'today' ? selectedDateString.value : tomorrowDateString.value
  if (!date) {
    alert('날짜가 설정되지 않았습니다.')
    return
  }
  isSubmittingCreate.value = true
  try {
    const ok = await createActualWork({ date, workTypeId, workName: name })
    if (ok) {
      // extras 에 있었다면 실제 섹션이 생겼으니 제거
      removeExtraSection(target, workTypeId)
      closeCreateInput()
    }
  } finally {
    isSubmittingCreate.value = false
  }
}

// 인라인 수정
const editingActualWorkId = ref<number | null>(null)
const editingName = ref('')
const isSubmittingEdit = ref(false)

async function openEditInput(aw: ActualWorkResponse) {
  closeCreateInput()
  editingActualWorkId.value = aw.id
  editingName.value = aw.workName
  await nextTick()
}

function closeEditInput() {
  editingActualWorkId.value = null
  editingName.value = ''
}

function closeAllInputs() {
  closeCreateInput()
  closeEditInput()
}

async function submitEdit() {
  if (editingActualWorkId.value == null) return
  const name = editingName.value.trim()
  if (!name) return
  isSubmittingEdit.value = true
  try {
    const ok = await updateActualWork(editingActualWorkId.value, { workName: name })
    if (ok) closeEditInput()
  } finally {
    isSubmittingEdit.value = false
  }
}

// 삭제 확인
const deleteTargetId = ref<number | null>(null)
const deleteTargetName = ref('')

function openDeleteDialog(aw: ActualWorkResponse) {
  deleteTargetId.value = aw.id
  deleteTargetName.value = aw.workName
}

async function confirmDelete() {
  if (deleteTargetId.value == null) return
  const id = deleteTargetId.value
  deleteTargetId.value = null
  await deleteActualWork(id)
}

const laborDialogOpen = ref(false)
const equipmentDialogOpen = ref(false)

// ========== 작업 사진 ==========
const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedActualWorkIdForPhoto = ref<number | null>(null)
const photoDialogRef = ref<InstanceType<typeof WorkPhotoDialog> | null>(null)

interface PhotoWithWork {
  photo: ActualWorkPhotoResponse
  workName: string
  actualWorkId: number
}

const allTodayPhotos = computed<PhotoWithWork[]>(() => {
  const result: PhotoWithWork[] = []
  for (const aw of todayActualWorks.value) {
    for (const photo of aw.photos ?? []) {
      result.push({ photo, workName: aw.workName, actualWorkId: aw.id })
    }
  }
  return result
})

function triggerPhotoUpload(actualWorkId: number) {
  selectedActualWorkIdForPhoto.value = actualWorkId
  fileInputRef.value?.click()
}

async function onPhotoFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  const targetId = selectedActualWorkIdForPhoto.value
  input.value = ''
  selectedActualWorkIdForPhoto.value = null
  if (files.length === 0 || targetId == null) return
  await uploadPhotos(targetId, files)
}

function openPhotoDialog(photo: ActualWorkPhotoResponse) {
  const url = photoObjectUrls.value.get(photo.photoId)
  if (!url) return
  photoDialogRef.value?.openDialog(photo, url)
}
</script>

<template>
  <div class="daily-report-area-wrapper contents">
    <AreaCard
      height="flex-none"
      min-height="auto"
      class="daily-report-area w-full"
    >
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-lg font-semibold">작업일보</h3>
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            class="bg-indigo-50 border-indigo-600 text-indigo-700 hover:bg-indigo-100"
            :disabled="!isToday || isCreatingHomepageDailyReport"
            @click="generateHomepageDailyReport"
          >
            {{ isCreatingHomepageDailyReport ? '생성 중...' : '홈페이지에 입력' }}
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="bg-green-50 border-green-500 text-green-700 hover:bg-green-100"
            :disabled="isCreatingDailyReport"
            @click="generateDailyReport"
          >
            {{ isCreatingDailyReport ? '생성 중...' : '엑셀 작업일보 생성' }}
          </Button>
        </div>
      </div>

      <div v-if="isLoading" class="text-sm text-muted-foreground">로딩 중...</div>
      <div v-else class="space-y-4">
        <!-- 날짜 선택 -->
        <div class="flex items-center justify-between">
          <DateStepper v-model="selectedDateString" />
          <div class="text-right text-sm text-muted-foreground">
            <p>{{ todayWeather?.weather ?? '-' }}</p>
            <p>
              {{
                todayWeather
                  ? `${todayWeather.minTemperature}°C / ${todayWeather.maxTemperature}°C`
                  : '-'
              }}
            </p>
          </div>
        </div>

        <!-- 오늘 작업 -->
        <div class="border border-border rounded-lg p-3">
          <h4 class="text-sm font-semibold mb-2 text-foreground">오늘 작업 ({{ todayDayName }}요일)</h4>
          <div v-if="mergedTodayWorksByType.size === 0" class="text-sm text-muted-foreground">
            오늘 예정된 작업이 없습니다.
          </div>
          <div v-else class="space-y-3">
            <div v-for="[workTypeId, group] in mergedTodayWorksByType" :key="workTypeId">
              <div class="flex items-center gap-1 mb-1">
                <p
                  class="text-sm font-medium inline-flex items-center gap-1"
                  :class="isToday ? 'cursor-pointer hover:text-primary transition-colors' : ''"
                  @click="openCreateInput('today', workTypeId)"
                >
                  &#9632; {{ group.workTypeName }} <Plus v-if="isToday" class="w-3.5 h-3.5" />
                </p>
                <button
                  v-if="isEmptyExtraSection('today', workTypeId, group.items)"
                  class="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  title="섹션 삭제"
                  @click.stop="removeExtraSection('today', workTypeId)"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- inline create input -->
              <div
                v-if="activeCreateKey === createKey('today', workTypeId)"
                class="flex items-center gap-1 mb-1 pl-2"
              >
                <Input
                  ref="createInputRef"
                  v-model="activeCreateName"
                  placeholder="작업 내용 입력 (예: 지하2층 A zone 기둥 철근배근)"
                  class="h-7 text-sm flex-1"
                  :disabled="isSubmittingCreate"
                  @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) submitCreate('today', workTypeId) }"
                  @keydown.escape="closeCreateInput"
                />
                <button
                  class="p-0.5 rounded hover:bg-primary/10 text-primary"
                  :disabled="!activeCreateName.trim() || isSubmittingCreate"
                  @click.stop="submitCreate('today', workTypeId)"
                >
                  <Check class="w-3.5 h-3.5" />
                </button>
                <button
                  class="p-0.5 rounded hover:bg-muted text-muted-foreground"
                  @click.stop="closeCreateInput"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>

              <div class="space-y-0.5">
                <div
                  v-for="aw in group.items"
                  :key="aw.id"
                  class="group flex items-center gap-1 text-sm"
                >
                  <!-- 수정 모드 -->
                  <template v-if="editingActualWorkId === aw.id">
                    <Input
                      v-model="editingName"
                      class="h-7 text-sm flex-1"
                      :disabled="isSubmittingEdit"
                      @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) submitEdit() }"
                      @keydown.escape="closeEditInput"
                    />
                    <button
                      class="p-0.5 rounded hover:bg-primary/10 text-primary"
                      :disabled="!editingName.trim() || isSubmittingEdit"
                      @click.stop="submitEdit"
                    >
                      <Check class="w-3.5 h-3.5" />
                    </button>
                    <button
                      class="p-0.5 rounded hover:bg-muted text-muted-foreground"
                      @click.stop="closeEditInput"
                    >
                      <X class="w-3.5 h-3.5" />
                    </button>
                  </template>
                  <!-- 일반 모드 -->
                  <template v-else>
                    <span class="flex-1 text-muted-foreground">- {{ aw.workName }}</span>
                    <button
                      v-if="isToday"
                      class="p-0.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                      title="사진 추가"
                      @click.stop="triggerPhotoUpload(aw.id)"
                    >
                      <Camera class="w-3 h-3" />
                    </button>
                    <button
                      class="p-0.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                      title="수정"
                      @click.stop="openEditInput(aw)"
                    >
                      <Pencil class="w-3 h-3" />
                    </button>
                    <button
                      class="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      title="삭제"
                      @click.stop="openDeleteDialog(aw)"
                    >
                      <X class="w-3 h-3" />
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>
          <!-- 새로운 공종 섹션 -->
          <p
            v-if="isToday"
            class="text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors mt-3 inline-flex items-center gap-1"
            @click="openQuickAdd('today')"
          >
            &#9632; 새로운 공종 <Plus class="w-3.5 h-3.5" />
          </p>

          <!-- 사진 그리드 -->
          <div v-if="allTodayPhotos.length > 0" class="mt-4 pt-3 border-t border-border">
            <h4 class="text-xs font-semibold mb-2 text-muted-foreground">사진</h4>
            <div class="grid grid-cols-4 gap-2">
              <div
                v-for="{ photo, workName } in allTodayPhotos"
                :key="photo.photoId"
                class="cursor-pointer"
                @click="openPhotoDialog(photo)"
              >
                <div class="aspect-square rounded overflow-hidden border border-border">
                  <img
                    v-if="photoObjectUrls.get(photo.photoId)"
                    :src="photoObjectUrls.get(photo.photoId)"
                    :alt="photo.description || '작업 사진'"
                    class="w-full h-full object-cover"
                  />
                  <div
                    v-else
                    class="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground"
                  >
                    ...
                  </div>
                </div>
                <p class="text-sm text-muted-foreground mt-0.5 truncate">{{ workName }}</p>
                <p v-if="photo.description" class="text-sm text-muted-foreground truncate">
                  {{ photo.description }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- 다음 작업일 -->
        <div class="border border-border rounded-lg p-3">
          <div class="flex items-center gap-2 mb-2">
            <h4 class="text-sm font-semibold text-foreground shrink-0">다음 작업일</h4>
            <DateStepper v-model="tomorrowDateString" :min-date="tomorrowMinDateString" />
          </div>
          <div v-if="mergedTomorrowWorksByType.size === 0" class="text-sm text-muted-foreground">
            내일 예정된 작업이 없습니다.
          </div>
          <div v-else class="space-y-3">
            <div v-for="[workTypeId, group] in mergedTomorrowWorksByType" :key="workTypeId">
              <div class="flex items-center gap-1 mb-1">
                <p
                  class="text-sm font-medium inline-flex items-center gap-1"
                  :class="isToday ? 'cursor-pointer hover:text-primary transition-colors' : ''"
                  @click="openCreateInput('tomorrow', workTypeId)"
                >
                  &#9632; {{ group.workTypeName }} <Plus v-if="isToday" class="w-3.5 h-3.5" />
                </p>
                <button
                  v-if="isEmptyExtraSection('tomorrow', workTypeId, group.items)"
                  class="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  title="섹션 삭제"
                  @click.stop="removeExtraSection('tomorrow', workTypeId)"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- inline create input -->
              <div
                v-if="activeCreateKey === createKey('tomorrow', workTypeId)"
                class="flex items-center gap-1 mb-1 pl-2"
              >
                <Input
                  v-model="activeCreateName"
                  placeholder="작업 내용 입력"
                  class="h-7 text-sm flex-1"
                  :disabled="isSubmittingCreate"
                  @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) submitCreate('tomorrow', workTypeId) }"
                  @keydown.escape="closeCreateInput"
                />
                <button
                  class="p-0.5 rounded hover:bg-primary/10 text-primary"
                  :disabled="!activeCreateName.trim() || isSubmittingCreate"
                  @click.stop="submitCreate('tomorrow', workTypeId)"
                >
                  <Check class="w-3.5 h-3.5" />
                </button>
                <button
                  class="p-0.5 rounded hover:bg-muted text-muted-foreground"
                  @click.stop="closeCreateInput"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>

              <div class="space-y-0.5">
                <div
                  v-for="aw in group.items"
                  :key="aw.id"
                  class="group flex items-center gap-1 text-sm"
                >
                  <template v-if="editingActualWorkId === aw.id">
                    <Input
                      v-model="editingName"
                      class="h-7 text-sm flex-1"
                      :disabled="isSubmittingEdit"
                      @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) submitEdit() }"
                      @keydown.escape="closeEditInput"
                    />
                    <button
                      class="p-0.5 rounded hover:bg-primary/10 text-primary"
                      :disabled="!editingName.trim() || isSubmittingEdit"
                      @click.stop="submitEdit"
                    >
                      <Check class="w-3.5 h-3.5" />
                    </button>
                    <button
                      class="p-0.5 rounded hover:bg-muted text-muted-foreground"
                      @click.stop="closeEditInput"
                    >
                      <X class="w-3.5 h-3.5" />
                    </button>
                  </template>
                  <template v-else>
                    <span class="flex-1 text-muted-foreground">- {{ aw.workName }}</span>
                    <button
                      class="p-0.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                      title="수정"
                      @click.stop="openEditInput(aw)"
                    >
                      <Pencil class="w-3 h-3" />
                    </button>
                    <button
                      class="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      title="삭제"
                      @click.stop="openDeleteDialog(aw)"
                    >
                      <X class="w-3 h-3" />
                    </button>
                  </template>
                </div>
              </div>
            </div>
          </div>
          <!-- 새로운 공종 섹션 -->
          <p
            v-if="isToday"
            class="text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors mt-3 inline-flex items-center gap-1"
            @click="openQuickAdd('tomorrow')"
          >
            &#9632; 새로운 공종 <Plus class="w-3.5 h-3.5" />
          </p>
        </div>

        <!-- 반입 자재 -->
        <div class="border border-border rounded-lg p-3">
          <h4 class="text-sm font-semibold mb-2 text-foreground">
            반입 자재
          </h4>
          <div v-if="deliveryByWorkType.size === 0" class="text-sm text-muted-foreground">
            오늘 반입된 자재가 없습니다.
          </div>
          <div v-else class="space-y-3">
            <div v-for="[workType, items] in deliveryByWorkType" :key="workType">
              <p class="text-sm font-medium mb-1">&#9632; {{ workType }}</p>
              <div class="space-y-0.5">
                <p
                  v-for="item in items"
                  :key="item.materialSpecName"
                  class="text-sm text-muted-foreground"
                >
                  - {{ item.materialTypeName }}({{ item.materialSpecName }}) :
                  {{ item.totalQuantity }} {{ item.unit }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- 반입 장비 -->
        <div class="border border-border rounded-lg p-3">
          <h4
            class="text-sm font-semibold mb-2 text-foreground inline-flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
            @click="equipmentDialogOpen = true"
          >
            반입 장비 <Plus class="w-3.5 h-3.5" />
          </h4>
          <div v-if="equipmentByGroup.length === 0" class="text-sm text-muted-foreground">
            오늘 반입된 장비가 없습니다.
          </div>
          <div v-else class="space-y-3">
            <div v-for="(group, index) in equipmentByGroup" :key="index">
              <p class="text-sm font-medium mb-1">
                &#9632; {{ group.companyDisplayName }} : {{ group.totalCount }}대
              </p>
              <div class="space-y-0.5">
                <p
                  v-for="item in group.items"
                  :key="item.equipmentSpecId"
                  class="text-sm text-muted-foreground"
                >
                  - {{ item.equipmentTypeName }}({{ item.equipmentSpecName }}) :
                  {{ item.count }}대
                </p>
              </div>
            </div>
            <p class="text-sm font-bold mt-2">
              &#9632; 총 장비 : {{ equipmentByGroup.reduce((sum, g) => sum + g.totalCount, 0) }}대
            </p>
          </div>
        </div>

        <!-- 출역인원 -->
        <div class="border border-border rounded-lg p-3">
          <h4
            class="text-sm font-semibold mb-2 text-foreground inline-flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
            @click="laborDialogOpen = true"
          >
            출역 인원 <Plus class="w-3.5 h-3.5" />
          </h4>
          <div v-if="attendanceByGroup.length === 0" class="text-sm text-muted-foreground">
            오늘 출역 인원이 없습니다.
          </div>
          <div v-else class="space-y-3">
            <div v-for="(group, index) in attendanceByGroup" :key="index">
              <p class="text-sm font-medium mb-1">
                &#9632; {{ group.workTypeName }}({{ group.companyDisplayName }}) :
                {{ group.totalCount }}명
              </p>
              <div class="space-y-0.5">
                <p
                  v-for="item in group.items"
                  :key="item.laborTypeId"
                  class="text-sm text-muted-foreground"
                >
                  - {{ item.laborTypeName }} : {{ item.count }}명
                </p>
              </div>
            </div>
            <p class="text-sm font-bold mt-2">
              &#9632; 총 출역인원 :
              {{ attendanceByGroup.reduce((sum, g) => sum + g.totalCount, 0) }}명
            </p>
          </div>
        </div>
      </div>
    </AreaCard>

    <DailyReportExcludeDialog
      :open="showExcludeDialog"
      :validate-result="validateResult"
      @confirm="confirmExcludeAndCreate"
      @cancel="showExcludeDialog = false"
    />

    <LaborInputDialog
      v-model:open="laborDialogOpen"
      :selected-date="selectedDateString"
      @submitted="loadData"
    />
    <EquipmentInputDialog
      v-model:open="equipmentDialogOpen"
      :selected-date="selectedDateString"
      @submitted="loadData"
    />

    <!-- 새로운 공종 섹션 추가 (유사도 기반 공종 매칭) -->
    <Dialog v-model:open="quickAddOpen">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>새로운 공종 섹션 추가</DialogTitle>
        </DialogHeader>
        <div class="space-y-2 py-2">
          <label class="text-xs text-muted-foreground">공종명 (유사도 자동 매칭)</label>
          <Input
            v-model="quickAddName"
            placeholder="예: 철콘, 금속, 방수"
            autofocus
            @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) submitQuickAdd() }"
          />
          <p class="text-xs text-muted-foreground">
            입력한 이름과 가장 유사한 공종을 찾아 빈 섹션을 추가합니다. 공종 헤더를 클릭해 작업을 입력하세요.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="quickAddOpen = false">취소</Button>
          <Button :disabled="!quickAddName.trim() || isResolvingWorkType" @click="submitQuickAdd">
            {{ isResolvingWorkType ? '매칭 중...' : '다음' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 작업 삭제 확인 -->
    <AlertDialog :open="deleteTargetId != null">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>작업 삭제</AlertDialogTitle>
          <AlertDialogDescription>
            '{{ deleteTargetName }}' 작업을 삭제하시겠습니까?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="deleteTargetId = null">취소</AlertDialogCancel>
          <AlertDialogAction @click="confirmDelete">삭제</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- 사진 업로드용 숨김 파일 입력 -->
    <input
      ref="fileInputRef"
      type="file"
      multiple
      accept="image/*"
      class="hidden"
      @change="onPhotoFileChange"
    />

    <!-- 사진 상세 다이얼로그 -->
    <WorkPhotoDialog ref="photoDialogRef" @updated="onPhotoUpdated" />
  </div>
</template>

<style scoped>
/* 작업일보 영역 텍스트 1.5배 확대 */
.daily-report-area :is(.text-xs) {
  font-size: 1.125rem;
  line-height: 1.75rem;
}

.daily-report-area :is(.text-sm) {
  font-size: 1.3125rem;
  line-height: 1.875rem;
}

.daily-report-area :is(.text-base) {
  font-size: 1.5rem;
  line-height: 2.25rem;
}

.daily-report-area :is(.text-lg) {
  font-size: 1.6875rem;
  line-height: 2.25rem;
}
</style>
