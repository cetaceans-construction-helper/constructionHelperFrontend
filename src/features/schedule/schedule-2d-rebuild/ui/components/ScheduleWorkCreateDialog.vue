<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import {
  referenceApi,
  type IdNameResponse,
  type WorkTypeResponse,
  type SubWorkTypeResponse,
} from '@/shared/network-core/apis/reference'
import { workApi } from '@/shared/network-core/apis/work'
import { appConfig } from '@/app/bootstrap/config'
import { analyticsClient } from '@/shared/analytics/analyticsClient'

type WorkCreateDialogPreset = {
  divisionName: string
  workTypeName: string
  subWorkTypeName: string
  subWorkTypeId: number | null
}

const props = defineProps<{
  open: boolean
  mode: 'create' | 'edit'
  workId: number | null
  startDate: string
  preset: WorkCreateDialogPreset | null
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  saved: []
}>()

const divisions = ref<IdNameResponse[]>([])
const workTypes = ref<WorkTypeResponse[]>([])
const subWorkTypes = ref<SubWorkTypeResponse[]>([])
const zones = ref<IdNameResponse[]>([])
const floors = ref<IdNameResponse[]>([])
const componentTypes = ref<IdNameResponse[]>([])

const editDivisionId = ref('')
const editWorkTypeId = ref('')
const editSubWorkTypeId = ref('')
const editZoneIds = ref<number[]>([])
const editFloorIds = ref<number[]>([])
const editComponentTypeIds = ref<number[]>([])
const editAnnotation = ref('')

const isLoadingWorkTypes = ref(false)
const isLoadingSubWorkTypes = ref(false)
const isLoadingWorkDetail = ref(false)
const isSaving = ref(false)
const hasLoadedBaseReferenceData = ref(false)
const hasLoadedDivisionReferenceData = ref(false)
const hasResolvedPreset = computed(() => (
  !!props.preset?.subWorkTypeId &&
  !!props.preset?.workTypeName &&
  !!props.preset?.subWorkTypeName
))
const dialogTitle = computed(() => (props.mode === 'edit' ? '작업 수정' : '작업 생성'))
const submitLabel = computed(() => {
  if (isSaving.value) {
    return props.mode === 'edit' ? '수정 중...' : '저장 중...'
  }

  return props.mode === 'edit' ? '수정' : '저장'
})

function resetForm() {
  editDivisionId.value = ''
  editWorkTypeId.value = ''
  editSubWorkTypeId.value = ''
  editZoneIds.value = []
  editFloorIds.value = []
  editComponentTypeIds.value = []
  editAnnotation.value = ''
  workTypes.value = []
  subWorkTypes.value = []
}

function closeDialog() {
  emit('update:open', false)
}

function toSingleSelection(ids: number[] | undefined) {
  if (!ids?.length) return []
  return [ids[0]!]
}

async function ensureBaseReferenceDataLoaded() {
  if (hasLoadedBaseReferenceData.value) return

  try {
    const [zoneList, floorList, componentTypeList] = await Promise.all([
      referenceApi.getZoneList(),
      referenceApi.getFloorList(),
      referenceApi.getComponentTypeList(),
    ])

    zones.value = zoneList
    floors.value = floorList
    componentTypes.value = componentTypeList
    hasLoadedBaseReferenceData.value = true
  } catch (error) {
    console.error('작업 생성 참조 데이터 로드 실패:', error)
  }
}

async function ensureDivisionReferenceDataLoaded() {
  if (hasLoadedDivisionReferenceData.value) return

  try {
    divisions.value = await referenceApi.getDivisionList()
    hasLoadedDivisionReferenceData.value = true
  } catch (error) {
    console.error('작업 생성 공종 데이터 로드 실패:', error)
  }
}

async function loadWorkTypesForDivision(divisionId: number) {
  isLoadingWorkTypes.value = true
  try {
    workTypes.value = await referenceApi.getWorkTypeList(divisionId)
  } finally {
    isLoadingWorkTypes.value = false
  }
}

async function loadSubWorkTypesForWorkType(workTypeId: number) {
  isLoadingSubWorkTypes.value = true
  try {
    subWorkTypes.value = await referenceApi.getSubWorkTypeList(workTypeId)
  } finally {
    isLoadingSubWorkTypes.value = false
  }
}

async function applyPreset() {
  if (hasResolvedPreset.value) {
    editSubWorkTypeId.value = String(props.preset?.subWorkTypeId ?? '')
    return
  }

  const preset = props.preset
  if (!preset?.divisionName) return

  await ensureDivisionReferenceDataLoaded()
  const division = divisions.value.find((candidate) => candidate.name === preset.divisionName)
  if (!division) return

  editDivisionId.value = String(division.id)
  await loadWorkTypesForDivision(division.id)

  const workType = workTypes.value.find((candidate) => candidate.name === preset.workTypeName)
  if (!workType) return

  editWorkTypeId.value = String(workType.id)
  await loadSubWorkTypesForWorkType(workType.id)

  const subWorkType = subWorkTypes.value.find((candidate) => (
    (preset.subWorkTypeId !== null && candidate.id === preset.subWorkTypeId) ||
    candidate.name === preset.subWorkTypeName
  ))
  if (!subWorkType) return

  editSubWorkTypeId.value = String(subWorkType.id)
}

async function loadWorkDetail() {
  if (props.mode !== 'edit' || !props.workId) return

  isLoadingWorkDetail.value = true
  try {
    const work = await workApi.getWork(props.workId)
    editZoneIds.value = toSingleSelection(work.zoneIds)
    editFloorIds.value = toSingleSelection(work.floorIds)
    editComponentTypeIds.value = toSingleSelection(work.componentTypeIds)
    editAnnotation.value = work.annotation ?? ''
    if (!editSubWorkTypeId.value && work.subWorkTypeId) {
      editSubWorkTypeId.value = String(work.subWorkTypeId)
    }
  } catch (error: unknown) {
    console.error('작업 상세 로드 실패:', error)
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message || '작업 정보를 불러오지 못했습니다.')
    closeDialog()
  } finally {
    isLoadingWorkDetail.value = false
  }
}

async function initializeDialog() {
  resetForm()
  await ensureBaseReferenceDataLoaded()
  if (!hasResolvedPreset.value) {
    await ensureDivisionReferenceDataLoaded()
  }
  await applyPreset()
  await loadWorkDetail()
}

async function handleDivisionChange(value: unknown) {
  editDivisionId.value = String(value ?? '')
  editWorkTypeId.value = ''
  editSubWorkTypeId.value = ''
  workTypes.value = []
  subWorkTypes.value = []

  if (!editDivisionId.value) return
  await loadWorkTypesForDivision(Number(editDivisionId.value))
}

async function handleWorkTypeChange(value: unknown) {
  editWorkTypeId.value = String(value ?? '')
  editSubWorkTypeId.value = ''
  subWorkTypes.value = []

  if (!editWorkTypeId.value) return
  await loadSubWorkTypesForWorkType(Number(editWorkTypeId.value))
}

function handleSubWorkTypeChange(value: unknown) {
  editSubWorkTypeId.value = String(value ?? '')
}

function toggleZone(id: number) {
  editZoneIds.value = editZoneIds.value[0] === id ? [] : [id]
}

function toggleFloor(id: number) {
  editFloorIds.value = editFloorIds.value[0] === id ? [] : [id]
}

function toggleComponentType(id: number) {
  editComponentTypeIds.value = editComponentTypeIds.value[0] === id ? [] : [id]
}

function getToggleButtonClass(isSelected: boolean) {
  return isSelected
    ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-[0_0_0_1px_rgba(14,165,233,0.12)]'
    : 'border-border bg-background text-foreground hover:border-slate-300 hover:bg-muted/40'
}

async function handleSubmit() {
  if (props.mode === 'create' && !props.startDate) {
    alert('시작일이 없습니다.')
    return
  }

  if (!editSubWorkTypeId.value) {
    alert('세부공종을 선택해주세요.')
    return
  }

  isSaving.value = true
  try {
    if (props.mode === 'edit') {
      if (!props.workId) {
        alert('수정할 작업 정보가 없습니다.')
        return
      }

      await workApi.updateWork(props.workId, {
        subWorkTypeId: Number(editSubWorkTypeId.value),
        zoneIds: [...editZoneIds.value],
        floorIds: [...editFloorIds.value],
        componentTypeIds: [...editComponentTypeIds.value],
        annotation: editAnnotation.value.trim(),
      })
      analyticsClient.trackAction('schedule_2d_rebuild', 'update_work', 'success')
    } else {
      const payload = {
        subWorkTypeId: Number(editSubWorkTypeId.value),
        startDate: props.startDate,
        workLeadTime: appConfig.work.defaultLeadTime,
        isWorkingOnHoliday: true,
        zoneIds: editZoneIds.value,
        floorIds: editFloorIds.value,
        ...(editComponentTypeIds.value.length > 0 && { componentTypeIds: editComponentTypeIds.value }),
        ...(editAnnotation.value.trim() && { annotation: editAnnotation.value.trim() }),
      }

      await workApi.createWork(payload)
      analyticsClient.trackAction('schedule_2d_rebuild', 'create_work', 'success')
    }

    emit('saved')
    closeDialog()
  } catch (error: unknown) {
    console.error(props.mode === 'edit' ? '작업 수정 실패:' : '작업 생성 실패:', error)
    analyticsClient.trackAction(
      'schedule_2d_rebuild',
      props.mode === 'edit' ? 'update_work' : 'create_work',
      'fail',
    )
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  } finally {
    isSaving.value = false
  }
}

watch(
  () => props.open,
  (nextOpen) => {
    if (!nextOpen) return
    void initializeDialog()
  },
)
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-md">
      <DialogHeader>
        <DialogTitle>{{ dialogTitle }}</DialogTitle>
      </DialogHeader>

      <div class="space-y-4">
        <div class="space-y-1.5">
          <label class="text-sm font-medium">공종</label>
          <div
            v-if="hasResolvedPreset"
            class="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm"
          >
            {{ preset?.workTypeName }} / {{ preset?.subWorkTypeName }}
          </div>

          <template v-else>
            <Select :model-value="editDivisionId" @update:model-value="handleDivisionChange">
              <SelectTrigger class="h-8 text-sm">
                <SelectValue placeholder="분류 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="division in divisions" :key="division.id" :value="String(division.id)">
                  {{ division.name }}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              :model-value="editWorkTypeId"
              :disabled="!editDivisionId || isLoadingWorkTypes"
              @update:model-value="handleWorkTypeChange"
            >
              <SelectTrigger class="h-8 text-sm">
                <SelectValue :placeholder="isLoadingWorkTypes ? '로딩...' : '공종 선택'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="workType in workTypes" :key="workType.id" :value="String(workType.id)">
                  {{ workType.name }}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              :model-value="editSubWorkTypeId"
              :disabled="!editWorkTypeId || isLoadingSubWorkTypes"
              @update:model-value="handleSubWorkTypeChange"
            >
              <SelectTrigger class="h-8 text-sm">
                <SelectValue :placeholder="isLoadingSubWorkTypes ? '로딩...' : '세부공종 선택'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="subWorkType in subWorkTypes" :key="subWorkType.id" :value="String(subWorkType.id)">
                  {{ subWorkType.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </template>
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium">위치</label>
          <div class="space-y-3">
            <div v-if="floors.length" class="space-y-1">
              <span class="text-xs text-muted-foreground">층</span>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="floor in floors"
                  :key="floor.id"
                  type="button"
                  class="min-h-9 rounded-md border px-3 py-2 text-sm transition-colors"
                  :class="getToggleButtonClass(editFloorIds.includes(floor.id))"
                  :aria-pressed="editFloorIds.includes(floor.id)"
                  @click="toggleFloor(floor.id)"
                >
                  {{ floor.name }}
                </button>
              </div>
            </div>

            <div v-if="zones.length" class="space-y-1">
              <span class="text-xs text-muted-foreground">구역</span>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="zone in zones"
                  :key="zone.id"
                  type="button"
                  class="min-h-9 rounded-md border px-3 py-2 text-sm transition-colors"
                  :class="getToggleButtonClass(editZoneIds.includes(zone.id))"
                  :aria-pressed="editZoneIds.includes(zone.id)"
                  @click="toggleZone(zone.id)"
                >
                  {{ zone.name }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="componentTypes.length" class="space-y-1.5">
          <label class="text-sm font-medium">부재</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="componentType in componentTypes"
              :key="componentType.id"
              type="button"
              class="min-h-9 rounded-md border px-3 py-2 text-sm transition-colors"
              :class="getToggleButtonClass(editComponentTypeIds.includes(componentType.id))"
              :aria-pressed="editComponentTypeIds.includes(componentType.id)"
              @click="toggleComponentType(componentType.id)"
            >
              {{ componentType.name }}
            </button>
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-medium">비고</label>
          <textarea
            v-model="editAnnotation"
            class="min-h-[60px] w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm"
            placeholder="비고 입력"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="closeDialog">취소</Button>
        <Button :disabled="isSaving || isLoadingWorkDetail" @click="handleSubmit">
          {{ submitLabel }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
