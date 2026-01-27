<script setup lang="ts">
import { onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLocationMaster } from '../composables/useLocationMaster'

const {
  zones,
  floors,
  sections,
  usages,
  newZone,
  newFloor,
  newSection,
  newUsage,
  isCreating,
  loadAll,
  addZone,
  addFloor,
  addSection,
  addUsage,
} = useLocationMaster()

onMounted(() => {
  loadAll()
})

const columns = [
  { label: 'Zone', items: zones, input: newZone, creating: 'zone', add: addZone },
  { label: 'Floor', items: floors, input: newFloor, creating: 'floor', add: addFloor },
  { label: 'Section', items: sections, input: newSection, creating: 'section', add: addSection },
  { label: 'Usage', items: usages, input: newUsage, creating: 'usage', add: addUsage },
] as const
</script>

<template>
  <div>
    <h3 class="text-sm font-semibold mb-3">위치분류</h3>
    <div class="grid grid-cols-4 gap-4">
      <div v-for="col in columns" :key="col.label" class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">{{ col.label }}</p>
        <div class="flex gap-1">
          <Input
            v-model="col.input.value"
            placeholder="이름 입력"
            class="h-8 text-sm"
            @keyup.enter="col.add"
          />
          <Button
            size="sm"
            class="h-8 shrink-0"
            :disabled="isCreating[col.creating] || !col.input.value.trim()"
            @click="col.add"
          >
            추가
          </Button>
        </div>
        <div class="space-y-1 max-h-48 overflow-y-auto">
          <div
            v-for="item in col.items.value"
            :key="item.id"
            class="px-3 py-2 border border-border rounded-md text-sm"
          >
            {{ item.name }}
          </div>
          <p
            v-if="col.items.value.length === 0"
            class="text-xs text-muted-foreground py-2 text-center"
          >
            항목 없음
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
