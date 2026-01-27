<script setup lang="ts">
import { onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useWorkClassification } from '../composables/useWorkClassification'

const {
  divisions,
  workTypes,
  subWorkTypes,
  selectedDivisionId,
  selectedWorkTypeId,
  newDivisionName,
  newWorkTypeName,
  newSubWorkTypeName,
  isCreating,
  loadDivisions,
  selectDivision,
  selectWorkType,
  addDivision,
  addWorkType,
  addSubWorkType,
} = useWorkClassification()

onMounted(() => {
  loadDivisions()
})
</script>

<template>
  <div>
    <h3 class="text-sm font-semibold mb-3">공종분류</h3>
    <div class="grid grid-cols-3 gap-4">
      <!-- Division 컬럼 -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">분류 (Division)</p>
        <div class="flex gap-1">
          <Input
            v-model="newDivisionName"
            placeholder="이름 입력"
            class="h-8 text-sm"
            @keyup.enter="addDivision"
          />
          <Button
            size="sm"
            class="h-8 shrink-0"
            :disabled="isCreating || !newDivisionName.trim()"
            @click="addDivision"
          >
            추가
          </Button>
        </div>
        <div class="space-y-1 max-h-48 overflow-y-auto">
          <div
            v-for="div in divisions"
            :key="div.id"
            class="px-3 py-2 border rounded-md cursor-pointer text-sm transition-colors"
            :class="{
              'border-primary bg-primary/10 font-medium': selectedDivisionId === div.id,
              'border-border hover:bg-muted/50': selectedDivisionId !== div.id,
            }"
            @click="selectDivision(div.id)"
          >
            {{ div.name }}
          </div>
          <p v-if="divisions.length === 0" class="text-xs text-muted-foreground py-2 text-center">
            항목 없음
          </p>
        </div>
      </div>

      <!-- WorkType 컬럼 -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">공종 (WorkType)</p>
        <div class="flex gap-1">
          <Input
            v-model="newWorkTypeName"
            placeholder="이름 입력"
            class="h-8 text-sm"
            :disabled="!selectedDivisionId"
            @keyup.enter="addWorkType"
          />
          <Button
            size="sm"
            class="h-8 shrink-0"
            :disabled="isCreating || !newWorkTypeName.trim() || !selectedDivisionId"
            @click="addWorkType"
          >
            추가
          </Button>
        </div>
        <div class="space-y-1 max-h-48 overflow-y-auto">
          <div
            v-for="wt in workTypes"
            :key="wt.id"
            class="px-3 py-2 border rounded-md cursor-pointer text-sm transition-colors"
            :class="{
              'border-primary bg-primary/10 font-medium': selectedWorkTypeId === wt.id,
              'border-border hover:bg-muted/50': selectedWorkTypeId !== wt.id,
            }"
            @click="selectWorkType(wt.id)"
          >
            {{ wt.name }}
          </div>
          <p
            v-if="selectedDivisionId && workTypes.length === 0"
            class="text-xs text-muted-foreground py-2 text-center"
          >
            항목 없음
          </p>
          <p
            v-if="!selectedDivisionId"
            class="text-xs text-muted-foreground py-2 text-center"
          >
            분류를 선택하세요
          </p>
        </div>
      </div>

      <!-- SubWorkType 컬럼 -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">세부공종 (SubWorkType)</p>
        <div class="flex gap-1">
          <Input
            v-model="newSubWorkTypeName"
            placeholder="이름 입력"
            class="h-8 text-sm"
            :disabled="!selectedWorkTypeId"
            @keyup.enter="addSubWorkType"
          />
          <Button
            size="sm"
            class="h-8 shrink-0"
            :disabled="isCreating || !newSubWorkTypeName.trim() || !selectedWorkTypeId"
            @click="addSubWorkType"
          >
            추가
          </Button>
        </div>
        <div class="space-y-1 max-h-48 overflow-y-auto">
          <div
            v-for="swt in subWorkTypes"
            :key="swt.id"
            class="px-3 py-2 border rounded-md text-sm border-border"
          >
            {{ swt.name }}
          </div>
          <p
            v-if="selectedWorkTypeId && subWorkTypes.length === 0"
            class="text-xs text-muted-foreground py-2 text-center"
          >
            항목 없음
          </p>
          <p
            v-if="!selectedWorkTypeId"
            class="text-xs text-muted-foreground py-2 text-center"
          >
            공종을 선택하세요
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
