<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import type {
  ValidateDailyReportResponse,
  ValidateDailyReportSection,
} from '@/features/document/public'

const sectionLabels: Record<string, string> = {
  todayWork: '금일작업',
  tomorrowWork: '익일작업',
  attendance: '출역인원',
  material: '자재입고',
  equipment: '장비투입',
}

function formatItemValues(section: ValidateDailyReportSection, values: (string | number | null)[]) {
  const entries = Object.entries(section.columns).sort((a, b) => a[1] - b[1])
  return entries
    .map(([, idx]) => values[idx])
    .filter((v) => v != null && v !== '')
    .join(' / ')
}

const props = defineProps<{
  open: boolean
  validateResult: ValidateDailyReportResponse | null
}>()

const emit = defineEmits<{
  confirm: [excludedIds: Record<string, number[]>, excludedPhotoIndices: number[], excludedBlankRowIndices: Record<string, number[]>]
  cancel: []
}>()

// Per-section excluded rowKeys: sectionName → rowKey[]
const excludedSectionIds = ref<Record<string, number[]>>({})
const excludedPhotoIndices = ref<number[]>([])
const excludedBlankRowIndices = ref<Record<string, number[]>>({})

watch(
  () => props.open,
  (open) => {
    if (open) {
      excludedSectionIds.value = {}
      excludedPhotoIndices.value = []
      excludedBlankRowIndices.value = {}
    }
  },
)

const exceededSections = computed(() => {
  if (!props.validateResult) return []
  return props.validateResult.sections.filter((s) => s.exceeded)
})

const exceededPhotos = computed(() => {
  if (!props.validateResult?.photos?.exceeded) return null
  return props.validateResult.photos
})

function toggleSectionItem(sectionName: string, rowKey: number) {
  const current = excludedSectionIds.value[sectionName] ?? []
  excludedSectionIds.value = {
    ...excludedSectionIds.value,
    [sectionName]: current.includes(rowKey)
      ? current.filter((i) => i !== rowKey)
      : [...current, rowKey],
  }
}

function togglePhotoItem(index: number) {
  excludedPhotoIndices.value = excludedPhotoIndices.value.includes(index)
    ? excludedPhotoIndices.value.filter((i) => i !== index)
    : [...excludedPhotoIndices.value, index]
}

function getMinExcludeCount(section: ValidateDailyReportSection) {
  const dataRowCount = section.items.filter((item) => item.rowKey !== null).length
  return Math.max(0, dataRowCount - section.totalMaxRows)
}

const canConfirm = computed(() => {
  for (const section of exceededSections.value) {
    const min = getMinExcludeCount(section)
    const excluded = excludedSectionIds.value[section.sectionName] ?? []
    if (excluded.length < min) return false
  }
  if (exceededPhotos.value) {
    const minPhotos = Math.max(0, exceededPhotos.value.photoCount - exceededPhotos.value.totalCells)
    if (excludedPhotoIndices.value.length < minPhotos) return false
  }
  return true
})

function toggleBlankRow(sectionName: string, index: number) {
  const current = excludedBlankRowIndices.value[sectionName] ?? []
  excludedBlankRowIndices.value = {
    ...excludedBlankRowIndices.value,
    [sectionName]: current.includes(index)
      ? current.filter((i) => i !== index)
      : [...current, index],
  }
}

function onConfirm() {
  emit('confirm', excludedSectionIds.value, excludedPhotoIndices.value, excludedBlankRowIndices.value)
}
</script>

<template>
  <Dialog :open="open" @update:open="!$event && emit('cancel')">
    <DialogContent class="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>작업일보 항목 초과</DialogTitle>
        <DialogDescription>
          일부 섹션의 데이터가 템플릿의 최대 행 수를 초과합니다. 제외할 항목을 선택해주세요.
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-6 py-4">
        <!-- 섹션별 초과 항목 -->
        <div v-for="section in exceededSections" :key="section.sectionName" class="space-y-2">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-semibold">{{ sectionLabels[section.sectionName] ?? section.sectionName }}</h4>
            <span class="text-xs text-muted-foreground">
              {{ section.dataRowCount }}행 / 최대 {{ section.totalMaxRows }}행
              (최소 {{ getMinExcludeCount(section) }}개 제외 필요,
              현재 {{ (excludedSectionIds[section.sectionName] ?? []).length }}개 선택)
            </span>
          </div>
          <div class="space-y-1 max-h-48 overflow-y-auto border border-border rounded-md p-2">
            <template v-for="item in section.items" :key="item.index">
              <!-- 데이터 행 (rowKey 있는 항목) -->
              <label
                v-if="item.rowKey !== null"
                class="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  :model-value="(excludedSectionIds[section.sectionName] ?? []).includes(item.rowKey)"
                  @update:model-value="toggleSectionItem(section.sectionName, item.rowKey!)"
                />
                <span class="text-sm flex-1 truncate">
                  {{ formatItemValues(section, item.values) }}
                </span>
              </label>
              <!-- 빈 행 (rowKey null) -->
              <label
                v-else
                class="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  :model-value="(excludedBlankRowIndices[section.sectionName] ?? []).includes(item.index)"
                  @update:model-value="toggleBlankRow(section.sectionName, item.index)"
                />
                <span class="text-sm flex-1 text-muted-foreground italic">빈 행</span>
              </label>
            </template>
          </div>
        </div>

        <!-- 사진 초과 -->
        <div v-if="exceededPhotos" class="space-y-2">
          <div class="flex items-center justify-between">
            <h4 class="text-sm font-semibold">사진</h4>
            <span class="text-xs text-muted-foreground">
              {{ exceededPhotos.photoCount }}장 / 최대 {{ exceededPhotos.totalCells }}칸
              (최소 {{ Math.max(0, exceededPhotos.photoCount - exceededPhotos.totalCells) }}개 제외 필요,
              현재 {{ excludedPhotoIndices.length }}개 선택)
            </span>
          </div>
          <div class="space-y-1 max-h-48 overflow-y-auto border border-border rounded-md p-2">
            <label
              v-for="item in exceededPhotos.items"
              :key="item.index"
              class="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                :model-value="excludedPhotoIndices.includes(item.index)"
                @update:model-value="togglePhotoItem(item.index)"
              />
              <span class="text-sm flex-1 truncate">{{ item.description || `사진 ${item.index + 1}` }}</span>
            </label>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="emit('cancel')">취소</Button>
        <Button :disabled="!canConfirm" @click="onConfirm">생성</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
