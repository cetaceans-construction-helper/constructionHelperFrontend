<script setup lang="ts">
import { ref, watch } from 'vue'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import {
  referenceApi,
  type WorkTypeResponse,
  type SubWorkTypeResponse,
} from '@/shared/network-core/apis/reference'

const props = defineProps<{
  open: boolean
  title: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [excludedIds: number[]]
}>()

interface WorkTypeEntry {
  workType: WorkTypeResponse
  subWorkTypes: SubWorkTypeResponse[]
}

const workTypeEntries = ref<WorkTypeEntry[]>([])
const loading = ref(false)
const excludedIds = ref<number[]>([])

function toggleId(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((v) => v !== id) : [...list, id]
}

function allSubWorkTypeIds(wt: WorkTypeEntry): number[] {
  return wt.subWorkTypes.map((s) => s.id)
}

function isAllExcluded(wt: WorkTypeEntry): boolean {
  const ids = allSubWorkTypeIds(wt)
  return ids.length > 0 && ids.every((id) => excludedIds.value.includes(id))
}

function toggleAll(wt: WorkTypeEntry) {
  const ids = allSubWorkTypeIds(wt)
  if (isAllExcluded(wt)) {
    excludedIds.value = excludedIds.value.filter((id) => !ids.includes(id))
  } else {
    const toAdd = ids.filter((id) => !excludedIds.value.includes(id))
    excludedIds.value = [...excludedIds.value, ...toAdd]
  }
}

async function loadTree() {
  loading.value = true
  try {
    const divisions = await referenceApi.getDivisionList()
    const entries: WorkTypeEntry[] = []
    for (const div of divisions) {
      const workTypes = await referenceApi.getWorkTypeList(div.id)
      for (const wt of workTypes) {
        const subWorkTypes = await referenceApi.getSubWorkTypeList(wt.id)
        entries.push({ workType: wt, subWorkTypes })
      }
    }
    workTypeEntries.value = entries
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    console.error('세부공종 로드 실패:', e)
    const errorMessage = e.response?.data?.message || e.message
    alert(errorMessage)
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      excludedIds.value = []
      loadTree()
    }
  },
)

function handleConfirm() {
  emit('confirm', excludedIds.value)
  emit('update:open', false)
}

function handleCancel() {
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-md max-h-[80vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>{{ title }} - 제외 세부공종 선택</DialogTitle>
      </DialogHeader>

      <div v-if="loading" class="py-8 text-center text-sm text-muted-foreground">로딩 중...</div>

      <div v-else class="flex-1 overflow-y-auto space-y-1 pr-1">
        <details
          v-for="wtEntry in workTypeEntries"
          :key="wtEntry.workType.id"
          class="border rounded px-2 py-1"
        >
          <summary class="text-xs font-medium cursor-pointer select-none">
            {{ wtEntry.workType.name }}
          </summary>
          <div class="flex flex-wrap gap-3 pl-3 py-1.5">
            <label class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Checkbox
                :model-value="isAllExcluded(wtEntry)"
                @update:model-value="toggleAll(wtEntry)"
              />
              모든 세부공종
            </label>
            <label
              v-for="swt in wtEntry.subWorkTypes"
              :key="swt.id"
              class="flex items-center gap-1.5 text-xs"
            >
              <Checkbox
                :model-value="excludedIds.includes(swt.id)"
                @update:model-value="excludedIds = toggleId(excludedIds, swt.id)"
              />
              {{ swt.name }}
            </label>
            <span v-if="wtEntry.subWorkTypes.length === 0" class="text-xs text-muted-foreground">세부공종 없음</span>
          </div>
        </details>
        <p v-if="workTypeEntries.length === 0 && !loading" class="text-xs text-muted-foreground text-center py-4">공종 데이터가 없습니다.</p>
      </div>

      <DialogFooter class="gap-2 pt-2">
        <Button variant="outline" size="sm" @click="handleCancel">취소</Button>
        <Button size="sm" @click="handleConfirm">확인</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
