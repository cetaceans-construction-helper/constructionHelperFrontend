<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { DateStepper } from '@/shared/ui/date-stepper'
import { NumberStepper } from '@/shared/ui/number-stepper'
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
const componentDivisions = ref<IdNameResponse[]>([])
const componentTypes = ref<IdNameResponse[]>([])
const selectedComponentDivisionId = ref('')
const selectedZoneIds = ref<number[]>([])
const selectedFloorIds = ref<number[]>([])
const selectedComponentTypeIds = ref<number[]>([])
const annotation = ref('')
const isLoadingWorkTypes = ref(false)
const isLoadingSubWorkTypes = ref(false)
const isLoadingComponentTypes = ref(false)

function toggleId(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((v) => v !== id) : [...list, id]
}

async function loadReferenceData() {
  const [divList, zoneList, floorList, cdList] = await Promise.all([
    referenceApi.getDivisionList(),
    referenceApi.getZoneList(),
    referenceApi.getFloorList(),
    referenceApi.getComponentDivisionList(),
  ])
  divisions.value = divList
  zones.value = zoneList
  floors.value = floorList
  componentDivisions.value = cdList
}

async function handleComponentDivisionChange(divisionId: string) {
  selectedComponentDivisionId.value = divisionId
  selectedComponentTypeIds.value = []
  componentTypes.value = []
  if (!divisionId) return

  isLoadingComponentTypes.value = true
  try {
    componentTypes.value = await referenceApi.getComponentTypeList(Number(divisionId))
  } finally {
    isLoadingComponentTypes.value = false
  }
}

async function loadDivisions() {
  divisions.value = await referenceApi.getDivisionList()
}

async function handleDivisionChange(divisionId: any) {
  selectedDivisionId.value = String(divisionId ?? '')
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

async function handleWorkTypeChange(workTypeId: any) {
  selectedWorkTypeId.value = String(workTypeId ?? '')
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
  selectedComponentDivisionId.value = ''
  selectedComponentTypeIds.value = []
  componentTypes.value = []
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
      ...(selectedComponentTypeIds.value.length > 0 && selectedComponentDivisionId.value && {
        componentTypes: [{ componentDivisionId: Number(selectedComponentDivisionId.value), componentTypeIds: selectedComponentTypeIds.value }],
      }),
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

        <!-- 시작일 / 작업기간 -->
        <div class="flex gap-3">
          <div class="flex-1 space-y-1.5">
            <Label>시작일</Label>
            <DateStepper v-model="startDate" />
          </div>
          <div class="w-32 space-y-1.5">
            <Label>작업기간</Label>
            <NumberStepper v-model="workLeadTime" :min="1" suffix="일" />
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
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="z in zones" :key="z.id"
                  class="px-3 py-1 text-sm rounded-md border transition-colors"
                  :class="selectedZoneIds.includes(z.id) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-background border-border text-foreground hover:bg-muted'"
                  @click="selectedZoneIds = toggleId(selectedZoneIds, z.id)"
                >
                  {{ z.name }}
                </button>
              </div>
            </div>
            <div v-if="floors.length > 0" class="space-y-1">
              <span class="text-xs text-muted-foreground">층</span>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="f in floors" :key="f.id"
                  class="px-3 py-1 text-sm rounded-md border transition-colors"
                  :class="selectedFloorIds.includes(f.id) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-background border-border text-foreground hover:bg-muted'"
                  @click="selectedFloorIds = toggleId(selectedFloorIds, f.id)"
                >
                  {{ f.name }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 부재 -->
        <div v-if="componentDivisions.length > 0" class="space-y-1.5">
          <Label class="flex items-center gap-1">부재
            <ReferenceEditTrigger type="component" @refresh="loadReferenceData" />
          </Label>
          <div class="space-y-1">
            <span class="text-xs text-muted-foreground">부재대분류</span>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="cd in componentDivisions" :key="cd.id"
                class="px-3 py-1 text-sm rounded-md border transition-colors"
                :class="selectedComponentDivisionId === String(cd.id) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-background border-border text-foreground hover:bg-muted'"
                @click="handleComponentDivisionChange(selectedComponentDivisionId === String(cd.id) ? '' : String(cd.id))"
              >
                {{ cd.name }}
              </button>
            </div>
          </div>
          <div v-if="isLoadingComponentTypes" class="text-sm text-muted-foreground">로딩...</div>
          <div v-else-if="selectedComponentDivisionId && componentTypes.length > 0" class="space-y-1">
            <span class="text-xs text-muted-foreground">부재타입</span>
            <div class="flex flex-wrap gap-1.5">
            <button
              v-for="ct in componentTypes" :key="ct.id"
              class="px-3 py-1 text-sm rounded-md border transition-colors"
              :class="selectedComponentTypeIds.includes(ct.id) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-background border-border text-foreground hover:bg-muted'"
              @click="selectedComponentTypeIds = toggleId(selectedComponentTypeIds, ct.id)"
            >
              {{ ct.name }}
            </button>
            </div>
          </div>
          <div v-else-if="selectedComponentDivisionId && componentTypes.length === 0" class="text-sm text-muted-foreground">
            등록된 부재 타입 없음
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
