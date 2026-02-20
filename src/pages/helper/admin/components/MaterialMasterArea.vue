<script setup lang="ts">
import { onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useMaterialMaster } from '../composables/useMaterialMaster'

const {
  materialTypes,
  materialSpecs,
  selectedMaterialTypeId,
  newMaterialTypeName,
  newMaterialTypeUnit,
  newMaterialSpecName,
  isCreating,
  loadMaterialTypes,
  selectMaterialType,
  addMaterialType,
  addMaterialSpec,
} = useMaterialMaster()

onMounted(() => {
  loadMaterialTypes()
})
</script>

<template>
  <div>
    <h3 class="text-sm font-semibold mb-3">자재분류</h3>
    <div class="grid grid-cols-2 gap-4">
      <!-- MaterialType 컬럼 -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">자재유형 (MaterialType)</p>
        <div class="flex gap-1">
          <Input
            v-model="newMaterialTypeName"
            placeholder="이름 입력"
            class="h-8 text-sm flex-1"
            @keyup.enter="addMaterialType"
          />
          <Input
            v-model="newMaterialTypeUnit"
            placeholder="단위"
            class="h-8 text-sm w-20"
            @keyup.enter="addMaterialType"
          />
          <Button
            size="sm"
            class="h-8 shrink-0"
            :disabled="isCreating || !newMaterialTypeName.trim()"
            @click="addMaterialType"
          >
            추가
          </Button>
        </div>
        <div class="space-y-1 max-h-48 overflow-y-auto">
          <div
            v-for="mt in materialTypes"
            :key="mt.id"
            class="px-3 py-2 border rounded-md cursor-pointer text-sm transition-colors"
            :class="{
              'border-primary bg-primary/10 font-medium': selectedMaterialTypeId === mt.id,
              'border-border hover:bg-muted/50': selectedMaterialTypeId !== mt.id,
            }"
            @click="selectMaterialType(mt.id)"
          >
            <span>{{ mt.name }}</span>
            <span v-if="mt.unit" class="text-muted-foreground ml-1">({{ mt.unit }})</span>
          </div>
          <p v-if="materialTypes.length === 0" class="text-xs text-muted-foreground py-2 text-center">
            항목 없음
          </p>
        </div>
      </div>

      <!-- MaterialSpec 컬럼 -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">자재규격 (MaterialSpec)</p>
        <div class="flex gap-1">
          <Input
            v-model="newMaterialSpecName"
            placeholder="이름 입력"
            class="h-8 text-sm"
            :disabled="!selectedMaterialTypeId"
            @keyup.enter="addMaterialSpec"
          />
          <Button
            size="sm"
            class="h-8 shrink-0"
            :disabled="isCreating || !newMaterialSpecName.trim() || !selectedMaterialTypeId"
            @click="addMaterialSpec"
          >
            추가
          </Button>
        </div>
        <div class="space-y-1 max-h-48 overflow-y-auto">
          <div
            v-for="ms in materialSpecs"
            :key="ms.id"
            class="px-3 py-2 border rounded-md text-sm border-border"
          >
            {{ ms.name }}
          </div>
          <p
            v-if="selectedMaterialTypeId && materialSpecs.length === 0"
            class="text-xs text-muted-foreground py-2 text-center"
          >
            항목 없음
          </p>
          <p
            v-if="!selectedMaterialTypeId"
            class="text-xs text-muted-foreground py-2 text-center"
          >
            자재유형을 선택하세요
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
