<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ChevronDown, ChevronRight, RefreshCw, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useComponentCode } from '../composables/useComponentCode'

const {
  // 부재 타입
  componentTypes,
  newComponentTypeName,
  isCreatingType,
  isDeletingType,
  loadComponentTypes,
  addComponentType,
  deleteComponentType,

  // 부재 코드
  componentCodes,
  selectedComponentTypeId,
  newComponentCode,
  isCreatingCode,
  isDeletingCode,
  addComponentCode,
  deleteComponentCode,

  // 부재코드 다중선택
  selectedComponentCodeIds,
  isAllComponentCodesSelected,
  toggleComponentCode,
  toggleAllComponentCodes,

  // 매핑
  filteredMappings,
  isCreatingMapping,
  divisions,
  workTypes,
  subWorkTypes,
  workSteps,
  materialTypes,
  materialSpecs,
  mappingForm,
  isLoadingWorkTypes,
  isLoadingSubWorkTypes,
  isLoadingWorkSteps,
  isLoadingMaterialSpecs,
  loadDivisions,
  loadMaterialTypes,
  loadAllMappings,
  addMapping,

  // 작업절차 다중선택
  selectedWorkStepIds,
  isAllWorkStepsSelected,
  toggleWorkStep,
  toggleAllWorkSteps,

  // 매핑 row 선택 (자재 일괄 적용용)
  selectedMappingIds,
  isAllMappingsSelected,
  toggleMapping,
  toggleAllMappings,

  // 자재 일괄 적용
  materialApplyForm,
  isApplyingMaterial,
  applyMaterialToSelectedMappings,

  // 세부작업 생성
  isCreatingTasks,
  createTasksResult,
  showCreateTasksResult,
  createTasks,
} = useComponentCode()

// 매핑 테이블 접기/펼치기
const isMappingTableExpanded = ref(true)

// 부재코드 목록 펼치기/접기
const isComponentCodeListExpanded = ref(true)

// 작업절차 목록 펼치기/접기
const isWorkStepListExpanded = ref(true)

onMounted(() => {
  loadComponentTypes()
  loadDivisions()
  loadMaterialTypes()
  loadAllMappings()
})

// 부재 타입 선택
function selectComponentType(id: number) {
  selectedComponentTypeId.value = id
}

// Select용 string 변환
const selectedTypeIdStr = computed(() =>
  selectedComponentTypeId.value != null ? String(selectedComponentTypeId.value) : '',
)

// 선택된 부재코드 요약
const selectedComponentCodesLabel = computed(() => {
  if (selectedComponentCodeIds.value.length === 0) return '선택 안함'
  if (isAllComponentCodesSelected.value) return '모두선택'
  return `${selectedComponentCodeIds.value.length}개 선택`
})

// 선택된 작업절차 요약
const selectedWorkStepsLabel = computed(() => {
  if (selectedWorkStepIds.value.length === 0) return '선택 안함'
  if (isAllWorkStepsSelected.value) return '모두선택'
  return `${selectedWorkStepIds.value.length}개 선택`
})

// 매핑 가능 여부
const canAddMapping = computed(() => {
  return (
    !isCreatingMapping.value &&
    selectedComponentCodeIds.value.length > 0 &&
    selectedWorkStepIds.value.length > 0
  )
})

// 매핑 목록 새로고침
function refreshMappings() {
  loadAllMappings()
}

// 삭제 다이얼로그 상태
const showDeleteDialog = ref(false)
const deleteTargetId = ref<number | null>(null)
const deleteTargetName = ref('')
const deleteAction = ref<((id: number) => Promise<void>) | null>(null)

function openDeleteDialog(id: number, name: string, fn: (id: number) => Promise<void>) {
  deleteTargetId.value = id
  deleteTargetName.value = name
  deleteAction.value = fn
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (deleteTargetId.value != null && deleteAction.value) {
    await deleteAction.value(deleteTargetId.value)
  }
  showDeleteDialog.value = false
}
</script>

<template>
  <div class="space-y-6">
    <!-- 부재 분류 (계층식) -->
    <div>
      <h3 class="text-sm font-semibold mb-3">부재분류</h3>
      <div class="grid grid-cols-2 gap-4">
        <!-- ComponentType 컬럼 -->
        <div class="space-y-2">
          <p class="text-xs text-muted-foreground font-medium">부재 타입 (ComponentType)</p>
          <div class="flex gap-1">
            <Input
              v-model="newComponentTypeName"
              placeholder="이름 입력"
              class="h-8 text-sm"
              @keyup.enter="addComponentType"
            />
            <Button
              size="sm"
              class="h-8 shrink-0"
              :disabled="isCreatingType || !newComponentTypeName.trim()"
              @click="addComponentType"
            >
              추가
            </Button>
          </div>
          <div class="space-y-1 max-h-48 overflow-y-auto">
            <div
              v-for="ct in componentTypes"
              :key="ct.id"
              class="flex items-center px-3 py-2 border rounded-md cursor-pointer text-sm transition-colors"
              :class="{
                'border-primary bg-primary/10 font-medium': selectedComponentTypeId === ct.id,
                'border-border hover:bg-muted/50': selectedComponentTypeId !== ct.id,
              }"
              @click="selectComponentType(ct.id)"
            >
              <span class="flex-1 truncate">{{ ct.name }}</span>
              <button
                class="ml-1 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                :disabled="isDeletingType"
                @click.stop="openDeleteDialog(ct.id, ct.name, deleteComponentType)"
              >
                <X class="w-3 h-3" />
              </button>
            </div>
            <p v-if="componentTypes.length === 0" class="text-xs text-muted-foreground py-2 text-center">
              항목 없음
            </p>
          </div>
        </div>

        <!-- ComponentCode 컬럼 -->
        <div class="space-y-2">
          <p class="text-xs text-muted-foreground font-medium">부재 코드 (ComponentCode)</p>
          <div class="flex gap-1">
            <Input
              v-model="newComponentCode"
              placeholder="코드 입력"
              class="h-8 text-sm"
              :disabled="selectedComponentTypeId == null"
              @keyup.enter="addComponentCode"
            />
            <Button
              size="sm"
              class="h-8 shrink-0"
              :disabled="isCreatingCode || !newComponentCode.trim() || selectedComponentTypeId == null"
              @click="addComponentCode"
            >
              추가
            </Button>
          </div>
          <div class="space-y-1 max-h-48 overflow-y-auto">
            <div
              v-for="cc in componentCodes"
              :key="cc.id"
              class="flex items-center px-3 py-2 border rounded-md text-sm border-border"
            >
              <span class="flex-1 truncate">{{ cc.code }}</span>
              <button
                class="ml-1 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                :disabled="isDeletingCode"
                @click.stop="openDeleteDialog(cc.id, cc.code, deleteComponentCode)"
              >
                <X class="w-3 h-3" />
              </button>
            </div>
            <p
              v-if="selectedComponentTypeId != null && componentCodes.length === 0"
              class="text-xs text-muted-foreground py-2 text-center"
            >
              항목 없음
            </p>
            <p
              v-if="selectedComponentTypeId == null"
              class="text-xs text-muted-foreground py-2 text-center"
            >
              부재 타입을 선택하세요
            </p>
          </div>
        </div>
      </div>
    </div>

    <Separator />

    <!-- 부재코드-작업절차-자재규격 매핑 -->
    <div>
      <h3 class="text-sm font-semibold mb-3">부재코드-작업절차-자재규격 연결</h3>

      <div class="grid grid-cols-2 gap-4 mb-4">
        <!-- 부재코드 다중선택 -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-xs text-muted-foreground font-medium">부재코드 선택</p>
            <span class="text-xs text-primary font-medium">{{ selectedComponentCodesLabel }}</span>
          </div>

          <!-- 부재타입 Select -->
          <Select :model-value="selectedTypeIdStr" @update:model-value="(v) => v && selectComponentType(Number(v))">
            <SelectTrigger class="h-8 text-sm">
              <SelectValue placeholder="부재타입 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="ct in componentTypes" :key="ct.id" :value="String(ct.id)">
                {{ ct.name }}
              </SelectItem>
            </SelectContent>
          </Select>

          <!-- 부재코드 체크박스 목록 -->
          <div v-if="selectedComponentTypeId != null" class="border rounded-md">
            <button
              class="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-muted/50"
              @click="isComponentCodeListExpanded = !isComponentCodeListExpanded"
            >
              <span class="font-medium">부재코드 목록</span>
              <component :is="isComponentCodeListExpanded ? ChevronDown : ChevronRight" class="h-4 w-4" />
            </button>
            <div v-show="isComponentCodeListExpanded" class="border-t px-3 py-2 space-y-2 max-h-40 overflow-y-auto">
              <!-- 모두선택 -->
              <label
                v-if="componentCodes.length > 0"
                class="flex items-center gap-2 cursor-pointer text-sm font-medium text-primary"
              >
                <Checkbox
                  :model-value="isAllComponentCodesSelected"
                  @update:model-value="toggleAllComponentCodes"
                />
                모두선택
              </label>
              <Separator v-if="componentCodes.length > 0" class="my-1" />
              <!-- 개별 항목 -->
              <label
                v-for="cc in componentCodes"
                :key="cc.id"
                class="flex items-center gap-2 cursor-pointer text-sm"
              >
                <Checkbox
                  :model-value="selectedComponentCodeIds.includes(cc.id)"
                  @update:model-value="() => toggleComponentCode(cc.id)"
                />
                {{ cc.code }}
              </label>
              <p v-if="componentCodes.length === 0" class="text-xs text-muted-foreground text-center py-2">
                항목 없음
              </p>
            </div>
          </div>
          <p v-else class="text-xs text-muted-foreground text-center py-2 border rounded-md">
            부재타입을 먼저 선택하세요
          </p>
        </div>

        <!-- 작업절차 다중선택 -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-xs text-muted-foreground font-medium">작업절차 선택</p>
            <span class="text-xs text-primary font-medium">{{ selectedWorkStepsLabel }}</span>
          </div>

          <!-- 작업분류 캐스케이딩 셀렉트 -->
          <div class="grid grid-cols-3 gap-1">
            <!-- Division Select -->
            <Select v-model="mappingForm.divisionId">
              <SelectTrigger class="h-8 text-sm">
                <SelectValue placeholder="분류" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="div in divisions" :key="div.id" :value="String(div.id)">
                  {{ div.name }}
                </SelectItem>
              </SelectContent>
            </Select>

            <!-- WorkType Select -->
            <Select v-model="mappingForm.workTypeId" :disabled="!mappingForm.divisionId || isLoadingWorkTypes">
              <SelectTrigger class="h-8 text-sm">
                <SelectValue :placeholder="isLoadingWorkTypes ? '...' : '공종'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="wt in workTypes" :key="wt.id" :value="String(wt.id)">
                  {{ wt.name }}
                </SelectItem>
              </SelectContent>
            </Select>

            <!-- SubWorkType Select -->
            <Select v-model="mappingForm.subWorkTypeId" :disabled="!mappingForm.workTypeId || isLoadingSubWorkTypes">
              <SelectTrigger class="h-8 text-sm">
                <SelectValue :placeholder="isLoadingSubWorkTypes ? '...' : '세부공종'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="swt in subWorkTypes" :key="swt.id" :value="String(swt.id)">
                  {{ swt.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- 작업절차 체크박스 목록 -->
          <div v-if="mappingForm.subWorkTypeId && !isLoadingWorkSteps" class="border rounded-md">
            <button
              class="flex items-center justify-between w-full px-3 py-2 text-sm hover:bg-muted/50"
              @click="isWorkStepListExpanded = !isWorkStepListExpanded"
            >
              <span class="font-medium">작업절차 목록</span>
              <component :is="isWorkStepListExpanded ? ChevronDown : ChevronRight" class="h-4 w-4" />
            </button>
            <div v-show="isWorkStepListExpanded" class="border-t px-3 py-2 space-y-2 max-h-40 overflow-y-auto">
              <!-- 모두선택 -->
              <label
                v-if="workSteps.length > 0"
                class="flex items-center gap-2 cursor-pointer text-sm font-medium text-primary"
              >
                <Checkbox
                  :model-value="isAllWorkStepsSelected"
                  @update:model-value="toggleAllWorkSteps"
                />
                모두선택
              </label>
              <Separator v-if="workSteps.length > 0" class="my-1" />
              <!-- 개별 항목 -->
              <label
                v-for="ws in workSteps"
                :key="ws.id"
                class="flex items-center gap-2 cursor-pointer text-sm"
              >
                <Checkbox
                  :model-value="selectedWorkStepIds.includes(ws.id)"
                  @update:model-value="() => toggleWorkStep(ws.id)"
                />
                {{ ws.name }}
              </label>
              <p v-if="workSteps.length === 0" class="text-xs text-muted-foreground text-center py-2">
                항목 없음
              </p>
            </div>
          </div>
          <div v-else-if="isLoadingWorkSteps" class="text-xs text-muted-foreground text-center py-2 border rounded-md">
            로딩 중...
          </div>
          <p v-else class="text-xs text-muted-foreground text-center py-2 border rounded-md">
            세부공종을 먼저 선택하세요
          </p>
        </div>
      </div>

      <!-- 연결 버튼 -->
      <div class="flex justify-end mb-4">
        <Button
          size="sm"
          class="h-8 px-6"
          :disabled="!canAddMapping"
          @click="addMapping"
        >
          연결 추가
          <span v-if="selectedComponentCodeIds.length > 0 && selectedWorkStepIds.length > 0" class="ml-1">
            ({{ selectedComponentCodeIds.length }} × {{ selectedWorkStepIds.length }})
          </span>
        </Button>
      </div>

      <!-- 매핑 테이블 (접을 수 있음) -->
      <div class="border rounded-md">
        <!-- 테이블 헤더 (토글 버튼) -->
        <div class="flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors">
          <button
            class="flex items-center gap-2 text-sm font-medium"
            @click="isMappingTableExpanded = !isMappingTableExpanded"
          >
            <component :is="isMappingTableExpanded ? ChevronDown : ChevronRight" class="h-4 w-4" />
            <span>매핑 목록 ({{ filteredMappings.length }})</span>
          </button>
          <button
            class="p-1 rounded hover:bg-muted"
            title="새로고침"
            @click.stop="refreshMappings"
          >
            <RefreshCw class="h-4 w-4" />
          </button>
        </div>

        <!-- 테이블 본문 -->
        <div v-show="isMappingTableExpanded" class="border-t">
          <table v-if="filteredMappings.length > 0" class="w-full text-sm">
            <thead class="bg-muted/50">
              <tr>
                <th class="w-10 px-2 text-center">
                  <Checkbox
                    :model-value="isAllMappingsSelected"
                    @update:model-value="toggleAllMappings"
                  />
                </th>
                <th class="px-3 py-2 text-left font-medium">부재타입</th>
                <th class="px-3 py-2 text-left font-medium">부재코드</th>
                <th class="px-3 py-2 text-left font-medium">분류</th>
                <th class="px-3 py-2 text-left font-medium">공종</th>
                <th class="px-3 py-2 text-left font-medium">세부공종</th>
                <th class="px-3 py-2 text-left font-medium">작업절차</th>
                <th class="px-3 py-2 text-left font-medium">자재유형</th>
                <th class="px-3 py-2 text-left font-medium">자재규격</th>
                <th class="px-3 py-2 text-left font-medium">단위</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-for="m in filteredMappings" :key="m.id" class="hover:bg-muted/30">
                <td class="px-2 text-center">
                  <Checkbox
                    :model-value="selectedMappingIds.includes(m.id)"
                    @update:model-value="() => toggleMapping(m.id)"
                  />
                </td>
                <td class="px-3 py-2">{{ m.componentTypeName }}</td>
                <td class="px-3 py-2">{{ m.componentCodeName }}</td>
                <td class="px-3 py-2">{{ m.divisionName }}</td>
                <td class="px-3 py-2">{{ m.workTypeName }}</td>
                <td class="px-3 py-2">{{ m.subWorkTypeName }}</td>
                <td class="px-3 py-2">{{ m.workStepName }}</td>
                <td class="px-3 py-2">{{ m.materialTypeName || '-' }}</td>
                <td class="px-3 py-2">{{ m.materialSpecName || '-' }}</td>
                <td class="px-3 py-2">{{ m.unitName || '-' }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="text-xs text-muted-foreground py-4 text-center">
            연결된 작업절차가 없습니다
          </p>

          <!-- 선택된 매핑에 자재 적용 -->
          <div v-if="selectedMappingIds.length > 0" class="border-t px-3 py-2 bg-muted/30">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium">{{ selectedMappingIds.length }}개 선택</span>

              <Select v-model="materialApplyForm.materialTypeId">
                <SelectTrigger class="h-8 text-sm w-40">
                  <SelectValue placeholder="자재유형" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="mt in materialTypes" :key="mt.id" :value="String(mt.id)">
                    {{ mt.name }}{{ mt.unit ? ` (${mt.unit})` : '' }}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select v-model="materialApplyForm.materialSpecId" :disabled="!materialApplyForm.materialTypeId || isLoadingMaterialSpecs">
                <SelectTrigger class="h-8 text-sm w-32">
                  <SelectValue :placeholder="isLoadingMaterialSpecs ? '로딩...' : '자재규격'" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="ms in materialSpecs" :key="ms.id" :value="String(ms.id)">
                    {{ ms.name }}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button
                size="sm"
                :disabled="!materialApplyForm.materialSpecId || isApplyingMaterial"
                @click="applyMaterialToSelectedMappings"
              >
                자재 적용
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Separator />

    <!-- 세부작업 생성 -->
    <div class="flex justify-end">
      <Button
        :disabled="isCreatingTasks"
        @click="createTasks"
      >
        {{ isCreatingTasks ? '생성 중...' : '세부작업 생성' }}
      </Button>
    </div>

    <!-- 삭제 확인 다이얼로그 -->
    <AlertDialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>삭제 확인</AlertDialogTitle>
          <AlertDialogDescription>
            '{{ deleteTargetName }}' 항목을 삭제하시겠습니까?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction @click="confirmDelete">삭제</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- 세부작업 생성 결과 다이얼로그 -->
    <Dialog v-model:open="showCreateTasksResult">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>세부작업 생성 완료</DialogTitle>
          <DialogDescription>세부작업 생성 결과입니다.</DialogDescription>
        </DialogHeader>
        <div v-if="createTasksResult" class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-muted-foreground">생성된 작업 수</span>
            <span class="font-medium">{{ createTasksResult.createdCount }}건</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">건너뛴 중복 작업 수</span>
            <span class="font-medium">{{ createTasksResult.skippedDuplicateCount }}건</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted-foreground">부재코드 없는 건 수</span>
            <span class="font-medium">{{ createTasksResult.skippedNoCcodeCount }}건</span>
          </div>
        </div>
        <DialogFooter>
          <Button @click="showCreateTasksResult = false">확인</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
