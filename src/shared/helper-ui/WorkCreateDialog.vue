<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { DateStepper } from '@/shared/ui/date-stepper'
import ReferenceEditTrigger from '@/shared/helper-ui/ReferenceEditTrigger.vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { scheduleVersionApi } from '@/shared/network-core/apis/scheduleVersion'

const props = withDefaults(defineProps<{
  open: boolean
  defaultStartDate?: string
  defaultWorkLeadTime?: number
  presetWorkTypeName?: string
  scheduleVersionId?: number
}>(), {
  defaultStartDate: '',
  defaultWorkLeadTime: 1,
})

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'submitted'): void
}>()

const isSaving = ref(false)
const divisions = ref<IdNameResponse[]>([])
const workTypes = ref<WorkTypeResponse[]>([])
const subWorkTypes = ref<SubWorkTypeResponse[]>([])
const selectedDivisionId = ref('')
const selectedWorkTypeId = ref('')
const selectedSubWorkTypeId = ref('')
const startDate = ref('')
const workLeadTime = ref(1)
const zones = ref<IdNameResponse[]>([])
const floors = ref<IdNameResponse[]>([])
const componentTypes = ref<IdNameResponse[]>([])
const selectedZoneIds = ref<number[]>([])
const selectedFloorIds = ref<number[]>([])
const selectedComponentTypeIds = ref<number[]>([])
const annotation = ref('')
const isLoadingWorkTypes = ref(false)
const isLoadingSubWorkTypes = ref(false)

function toggleId(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((v) => v !== id) : [...list, id]
}

async function loadReferenceData() {
  const [divList, zoneList, floorList, ctList] = await Promise.all([
    referenceApi.getDivisionList(),
    referenceApi.getZoneList(),
    referenceApi.getFloorList(),
    referenceApi.getComponentTypeList(),
  ])
  divisions.value = divList
  zones.value = zoneList
  floors.value = floorList
  componentTypes.value = ctList
}

async function loadDivisions() {
  divisions.value = await referenceApi.getDivisionList()
}

async function handleDivisionChange(divisionId: string) {
  selectedDivisionId.value = divisionId
  selectedWorkTypeId.value = ''
  selectedSubWorkTypeId.value = ''
  workTypes.value = []
  subWorkTypes.value = []
  if (!divisionId) return

  isLoadingWorkTypes.value = true
  try {
    workTypes.value = await referenceApi.getWorkTypeList(Number(divisionId))
  } finally {
    isLoadingWorkTypes.value = false
  }
}

async function handleWorkTypeChange(workTypeId: string) {
  selectedWorkTypeId.value = workTypeId
  selectedSubWorkTypeId.value = ''
  subWorkTypes.value = []
  if (!workTypeId) return

  isLoadingSubWorkTypes.value = true
  try {
    subWorkTypes.value = await referenceApi.getSubWorkTypeList(Number(workTypeId))
  } finally {
    isLoadingSubWorkTypes.value = false
  }
}

watch(() => props.open, async (opened) => {
  if (!opened) return

  selectedDivisionId.value = ''
  selectedWorkTypeId.value = ''
  selectedSubWorkTypeId.value = ''
  selectedZoneIds.value = []
  selectedFloorIds.value = []
  selectedComponentTypeIds.value = []
  annotation.value = ''
  startDate.value = props.defaultStartDate
  workLeadTime.value = props.defaultWorkLeadTime
  workTypes.value = []
  subWorkTypes.value = []

  await loadReferenceData()

  if (props.presetWorkTypeName) {
    for (const div of divisions.value) {
      const wts = await referenceApi.getWorkTypeList(div.id)
      const match = wts.find(wt => wt.displayName === props.presetWorkTypeName || wt.name === props.presetWorkTypeName)
      if (match) {
        selectedDivisionId.value = String(div.id)
        workTypes.value = wts
        selectedWorkTypeId.value = String(match.id)
        subWorkTypes.value = await referenceApi.getSubWorkTypeList(match.id)
        break
      }
    }
  }
})

async function handleSave() {
  if (!selectedSubWorkTypeId.value) {
    alert('세부공종을 선택해주세요.')
    return
  }

  isSaving.value = true
  try {
    let versionId = props.scheduleVersionId
    if (versionId == null) {
      const versions = await scheduleVersionApi.getScheduleVersionList()
      const mainVersion = versions.find(v => v.isMain)
      if (!mainVersion) {
        alert('메인 공정표 버전을 찾을 수 없습니다.')
        return
      }
      versionId = mainVersion.id
    }

    await workApi.createWork({
      subWorkTypeId: Number(selectedSubWorkTypeId.value),
      startDate: startDate.value,
      workLeadTime: workLeadTime.value,
      isWorkingOnHoliday: true,
      scheduleVersionId: versionId,
      ...(selectedZoneIds.value.length > 0 && { zoneIds: selectedZoneIds.value }),
      ...(selectedFloorIds.value.length > 0 && { floorIds: selectedFloorIds.value }),
      ...(selectedComponentTypeIds.value.length > 0 && { componentTypeIds: selectedComponentTypeIds.value }),
      ...(annotation.value.trim() && { annotation: annotation.value.trim() }),
    })

    emit('submitted')
    emit('update:open', false)
  } catch (error: any) {
    console.error('작업 생성 실패:', error)
    const errorMessage = error.response?.data?.message || error.message
    alert(errorMessage)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-lg max-h-[80vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>작업 추가</DialogTitle>
      </DialogHeader>

      <div class="space-y-4 py-2 overflow-y-auto">
        <!-- 공종 -->
        <div>
          <div class="flex items-center gap-1 mb-1.5">
            <Label>공종</Label>
            <ReferenceEditTrigger type="work-classification" @refresh="loadReferenceData" />
          </div>
          <div class="grid grid-cols-[1fr_2fr_2fr] gap-2">
            <Select :model-value="selectedDivisionId" @update:model-value="handleDivisionChange">
              <SelectTrigger>
                <SelectValue placeholder="분류" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="d in divisions" :key="d.id" :value="String(d.id)">{{ d.name }}</SelectItem>
              </SelectContent>
            </Select>
            <Select :model-value="selectedWorkTypeId" :disabled="!selectedDivisionId || isLoadingWorkTypes" @update:model-value="handleWorkTypeChange">
              <SelectTrigger>
                <SelectValue :placeholder="isLoadingWorkTypes ? '로딩...' : '공종'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="wt in workTypes" :key="wt.id" :value="String(wt.id)">{{ wt.name }}</SelectItem>
              </SelectContent>
            </Select>
            <Select v-model="selectedSubWorkTypeId" :disabled="!selectedWorkTypeId || isLoadingSubWorkTypes">
              <SelectTrigger>
                <SelectValue :placeholder="isLoadingSubWorkTypes ? '로딩...' : '세부공종'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="swt in subWorkTypes" :key="swt.id" :value="String(swt.id)">{{ swt.name }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <!-- 시작일 / 공기 -->
        <div class="flex gap-3">
          <div class="flex-1 space-y-1.5">
            <Label>시작일</Label>
            <DateStepper v-model="startDate" />
          </div>
          <div class="w-24 space-y-1.5">
            <Label>공기(일)</Label>
            <Input v-model.number="workLeadTime" type="number" min="1" />
          </div>
        </div>

        <!-- 위치 (구역 / 층) -->
        <div v-if="zones.length > 0 || floors.length > 0" class="space-y-1.5">
          <Label class="flex items-center gap-1">위치
            <ReferenceEditTrigger type="location" @refresh="loadReferenceData" />
          </Label>
          <div class="grid grid-cols-2 gap-3">
            <div v-if="zones.length > 0" class="space-y-1">
              <span class="text-xs text-muted-foreground">구역</span>
              <div class="flex flex-wrap gap-x-3 gap-y-1">
                <label v-for="z in zones" :key="z.id" class="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    :model-value="selectedZoneIds.includes(z.id)"
                    class="h-4 w-4"
                    @update:model-value="selectedZoneIds = toggleId(selectedZoneIds, z.id)"
                  />
                  {{ z.name }}
                </label>
              </div>
            </div>
            <div v-if="floors.length > 0" class="space-y-1">
              <span class="text-xs text-muted-foreground">층</span>
              <div class="flex flex-wrap gap-x-3 gap-y-1">
                <label v-for="f in floors" :key="f.id" class="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    :model-value="selectedFloorIds.includes(f.id)"
                    class="h-4 w-4"
                    @update:model-value="selectedFloorIds = toggleId(selectedFloorIds, f.id)"
                  />
                  {{ f.name }}
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- 부재 -->
        <div v-if="componentTypes.length > 0" class="space-y-1.5">
          <Label class="flex items-center gap-1">부재
            <ReferenceEditTrigger type="component" @refresh="loadReferenceData" />
          </Label>
          <div class="flex flex-wrap gap-x-4 gap-y-1.5">
            <label v-for="ct in componentTypes" :key="ct.id" class="flex items-center gap-1.5 text-sm cursor-pointer">
              <Checkbox
                :model-value="selectedComponentTypeIds.includes(ct.id)"
                class="h-4 w-4"
                @update:model-value="selectedComponentTypeIds = toggleId(selectedComponentTypeIds, ct.id)"
              />
              {{ ct.name }}
            </label>
          </div>
        </div>

        <!-- 비고 -->
        <div class="space-y-1.5">
          <Label>비고</Label>
          <textarea
            v-model="annotation"
            class="w-full text-sm rounded-md border border-border bg-background px-3 py-2 min-h-[60px] resize-none"
            placeholder="비고 입력"
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('update:open', false)">취소</Button>
        <Button :disabled="!selectedSubWorkTypeId || isSaving" @click="handleSave">
          {{ isSaving ? '저장 중...' : '저장' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
