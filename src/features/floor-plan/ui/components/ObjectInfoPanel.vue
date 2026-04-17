<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useFloorPlanStore } from '@/features/floor-plan/view-model/useFloorPlanStore'
import { useReferenceData } from '@/features/floor-plan/view-model/useReferenceData'
import { storeToRefs } from 'pinia'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Button } from '@/shared/ui/button'
import { Trash2 } from 'lucide-vue-next'

const store = useFloorPlanStore()
const { selectedObjects, selectedBoxIds } = storeToRefs(store)
const { componentTypes, componentCodes, loadComponentTypes, loadComponentCodes } = useReferenceData()

const editIsStructure = ref<boolean | null>(null)
const editTypeId = ref<number | null>(null)

watch(editIsStructure, (value) => {
  if (value != null) loadComponentTypes(value)
  editTypeId.value = null
})

watch(editTypeId, (id) => {
  if (id) loadComponentCodes(id)
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyCcode(val: any) {
  const ccodeId = val ? Number(val) : null
  store.updateObjectCcode(selectedBoxIds.value, ccodeId)
}

function findCcode(id: number | null): string {
  if (!id) return '-'
  const c = componentCodes.value.find((cc) => cc.id === id)
  return c?.code ?? String(id)
}

const hasSelection = computed(() => selectedObjects.value.length > 0)
</script>

<template>
  <div
    v-if="hasSelection"
    class="absolute bottom-3 right-3 w-72 max-h-80 overflow-y-auto bg-background border border-border rounded-lg shadow-lg z-10"
  >
    <!-- 헤더: 일괄 ccode 적용 -->
    <div class="sticky top-0 bg-background border-b border-border p-2 flex flex-col gap-1.5">
      <div class="text-xs font-semibold">{{ selectedObjects.length }}개 선택됨 — 부재코드 매핑</div>
      <div class="flex gap-1">
        <button
          class="px-2 h-6 text-xs rounded border transition-colors"
          :class="editIsStructure === true ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-background border-border text-foreground hover:bg-muted'"
          @click="editIsStructure = editIsStructure === true ? null : true"
        >
          구조
        </button>
        <button
          class="px-2 h-6 text-xs rounded border transition-colors"
          :class="editIsStructure === false ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-background border-border text-foreground hover:bg-muted'"
          @click="editIsStructure = editIsStructure === false ? null : false"
        >
          비구조
        </button>
        <Select :model-value="editTypeId?.toString() ?? undefined" :disabled="editIsStructure == null" @update:model-value="editTypeId = $event ? Number($event) : null">
          <SelectTrigger class="h-6 text-xs flex-1"><SelectValue placeholder="타입" /></SelectTrigger>
          <SelectContent>
            <SelectItem v-for="t in componentTypes" :key="t.id" :value="t.id.toString()">{{ t.name }}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Select :disabled="!editTypeId" @update:model-value="applyCcode">
        <SelectTrigger class="h-6 text-xs"><SelectValue placeholder="부재코드 선택 → 일괄 적용" /></SelectTrigger>
        <SelectContent>
          <SelectItem v-for="c in componentCodes" :key="c.id" :value="c.id.toString()">{{ c.code }}</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- object2D 목록 -->
    <div class="divide-y divide-border">
      <div v-for="obj in selectedObjects" :key="obj.id" class="p-2 text-xs">
        <div class="flex items-center justify-between mb-1">
          <span class="font-medium">{{ obj.gridLabel ?? '-' }}</span>
          <Button variant="ghost" size="sm" class="h-5 w-5 p-0" @click="store.removeObject(obj.id)">
            <Trash2 class="h-3 w-3 text-muted-foreground" />
          </Button>
        </div>
        <div class="text-muted-foreground">{{ obj.componentCode ?? '-' }}</div>
        <div v-if="obj.isStructure != null || obj.componentTypeName" class="text-muted-foreground">{{ obj.isStructure === true ? '구조' : obj.isStructure === false ? '비구조' : '' }}{{ obj.componentTypeName ? ` / ${obj.componentTypeName}` : '' }}</div>
      </div>
    </div>
  </div>
</template>
