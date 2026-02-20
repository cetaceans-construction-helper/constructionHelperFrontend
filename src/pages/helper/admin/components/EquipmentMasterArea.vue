<script setup lang="ts">
import { onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useEquipmentMaster } from '../composables/useEquipmentMaster'

const {
  equipmentTypes,
  equipmentSpecs,
  selectedEquipmentTypeId,
  newEquipmentTypeName,
  newEquipmentSpecName,
  isCreating,
  loadEquipmentTypes,
  selectEquipmentType,
  addEquipmentType,
  addEquipmentSpec,
} = useEquipmentMaster()

onMounted(() => {
  loadEquipmentTypes()
})
</script>

<template>
  <div>
    <h3 class="text-sm font-semibold mb-3">장비분류</h3>
    <div class="grid grid-cols-2 gap-4">
      <!-- EquipmentType 컬럼 -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">장비유형 (EquipmentType)</p>
        <div class="flex gap-1">
          <Input
            v-model="newEquipmentTypeName"
            placeholder="이름 입력"
            class="h-8 text-sm flex-1"
            @keyup.enter="addEquipmentType"
          />
          <Button
            size="sm"
            class="h-8 shrink-0"
            :disabled="isCreating || !newEquipmentTypeName.trim()"
            @click="addEquipmentType"
          >
            추가
          </Button>
        </div>
        <div class="space-y-1 max-h-48 overflow-y-auto">
          <div
            v-for="et in equipmentTypes"
            :key="et.id"
            class="px-3 py-2 border rounded-md cursor-pointer text-sm transition-colors"
            :class="{
              'border-primary bg-primary/10 font-medium': selectedEquipmentTypeId === et.id,
              'border-border hover:bg-muted/50': selectedEquipmentTypeId !== et.id,
            }"
            @click="selectEquipmentType(et.id)"
          >
            {{ et.name }}
          </div>
          <p v-if="equipmentTypes.length === 0" class="text-xs text-muted-foreground py-2 text-center">
            항목 없음
          </p>
        </div>
      </div>

      <!-- EquipmentSpec 컬럼 -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">장비규격 (EquipmentSpec)</p>
        <div class="flex gap-1">
          <Input
            v-model="newEquipmentSpecName"
            placeholder="이름 입력"
            class="h-8 text-sm"
            :disabled="!selectedEquipmentTypeId"
            @keyup.enter="addEquipmentSpec"
          />
          <Button
            size="sm"
            class="h-8 shrink-0"
            :disabled="isCreating || !newEquipmentSpecName.trim() || !selectedEquipmentTypeId"
            @click="addEquipmentSpec"
          >
            추가
          </Button>
        </div>
        <div class="space-y-1 max-h-48 overflow-y-auto">
          <div
            v-for="es in equipmentSpecs"
            :key="es.id"
            class="px-3 py-2 border rounded-md text-sm border-border"
          >
            {{ es.name }}
          </div>
          <p
            v-if="selectedEquipmentTypeId && equipmentSpecs.length === 0"
            class="text-xs text-muted-foreground py-2 text-center"
          >
            항목 없음
          </p>
          <p
            v-if="!selectedEquipmentTypeId"
            class="text-xs text-muted-foreground py-2 text-center"
          >
            장비유형을 선택하세요
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
