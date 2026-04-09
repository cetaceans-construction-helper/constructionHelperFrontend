<script setup lang="ts">
import { computed } from 'vue'
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

const store = useFloorPlanStore()
const { currentZoneId, currentFloorId } = storeToRefs(store)
const { zones, floors } = useReferenceData()

const loaded = computed(() => zones.value.length > 0 || floors.value.length > 0)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onZoneChange(val: any) {
  if (val == null || val === '__none__') {
    currentZoneId.value = null
    return
  }
  const zoneId = Number(val)
  if (currentFloorId.value != null) {
    store.switchDrawing(zoneId, currentFloorId.value)
  } else {
    currentZoneId.value = zoneId
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function onFloorChange(val: any) {
  if (val == null) return
  const floorId = Number(val)
  store.switchDrawing(currentZoneId.value, floorId)
}

</script>

<template>
  <div v-if="loaded" class="flex items-center gap-2">
    <span class="text-sm font-medium shrink-0">도면:</span>
    <Select
      :model-value="currentZoneId != null ? currentZoneId.toString() : '__none__'"
      @update:model-value="onZoneChange"
    >
      <SelectTrigger class="h-8 w-32">
        <SelectValue placeholder="Zone" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">선택안함</SelectItem>
        <SelectItem v-for="z in zones" :key="z.id" :value="z.id.toString()">{{ z.name }}</SelectItem>
      </SelectContent>
    </Select>
    <Select
      :model-value="currentFloorId != null ? currentFloorId.toString() : ''"
      @update:model-value="onFloorChange"
    >
      <SelectTrigger class="h-8 w-32">
        <SelectValue placeholder="Floor" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem v-for="f in floors" :key="f.id" :value="f.id.toString()">{{ f.name }}</SelectItem>
      </SelectContent>
    </Select>
  </div>
</template>
