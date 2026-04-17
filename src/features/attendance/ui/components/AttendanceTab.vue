<script setup lang="ts">
import { onMounted } from 'vue'
import { Button } from '@/shared/ui/button'
import { DateStepper } from '@/shared/ui/date-stepper'
import ReferenceEditTrigger from '@/shared/helper-ui/ReferenceEditTrigger.vue'
import { useAttendance } from '@/features/attendance/view-model/useAttendance'
import { useEquipmentDeployment } from '@/features/attendance/view-model/useEquipmentDeployment'
import LaborCountBox from '@/features/attendance/ui/components/LaborCountBox.vue'
import EquipmentCountBox from '@/features/attendance/ui/components/EquipmentCountBox.vue'

const {
  selectedDate,
  isSubmitting,
  contractors,
  workTypeBoxes,
  selectCompany: selectLaborCompany,

  getCount: getLaborCount,
  incrementCount: incrementLaborCount,
  decrementCount: decrementLaborCount,
  setCount: setLaborCount,
  submitAttendance,
  init: initAttendance,
} = useAttendance()

const {
  isSubmittingEquipment,
  allEquipmentSpecs,
  equipmentBoxes,

  selectCompany: selectEquipmentCompany,

  addSpecToBox,
  removeSpecFromBox,
  getCount: getEquipmentCount,
  incrementCount: incrementEquipmentCount,
  decrementCount: decrementEquipmentCount,
  setCount: setEquipmentCount,
  submitEquipmentDeployment,
  init: initEquipment,
} = useEquipmentDeployment(selectedDate, contractors)

onMounted(async () => {
  await initAttendance()
  await initEquipment()
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 상단: 날짜 선택 -->
    <div class="flex items-center justify-center py-4 border-b border-border">
      <DateStepper v-model="selectedDate" />
    </div>

    <!-- 2컬럼 레이아웃 -->
    <div class="flex-1 overflow-hidden grid grid-cols-2 [@media(max-aspect-ratio:1/1)]:grid-cols-1 gap-4 p-4">
      <!-- 출역인원 입력 -->
      <div class="flex flex-col overflow-hidden border border-border rounded-lg bg-card">
        <div class="px-4 py-3 border-b border-border bg-muted/50 flex items-center gap-1">
          <h3 class="text-sm font-medium">출역인원 입력</h3>
          <ReferenceEditTrigger type="labor" @refresh="initAttendance" />
        </div>

        <!-- 공종 박스 목록 -->
        <div class="flex-1 overflow-y-auto p-4">
          <div v-if="workTypeBoxes.length === 0" class="flex items-center justify-center h-full">
            <p class="text-muted-foreground text-sm">오늘 출역 대상 업체가 없습니다.</p>
          </div>

          <div v-else class="space-y-4">
            <LaborCountBox
              v-for="box in workTypeBoxes"
              :key="box.id"
              :box-id="box.id"
              :company-id="box.companyId"
              :company-name="box.companyName"
              :work-type-name="box.workTypeName"
              :labor-types="box.laborTypes"
              :is-loading="box.isLoading"
              :contractors="contractors"
              :get-count="getLaborCount"
              @select-company="selectLaborCompany"
              @increment="incrementLaborCount"
              @decrement="decrementLaborCount"
              @set-count="setLaborCount"
            />
          </div>
        </div>

        <!-- 하단: 제출 -->
        <div class="flex items-center justify-end px-4 py-3 border-t border-border">
          <Button
            size="lg"
            :disabled="workTypeBoxes.length === 0 || isSubmitting"
            @click="submitAttendance"
          >
            {{ isSubmitting ? '저장 중...' : '제출' }}
          </Button>
        </div>
      </div>

      <!-- 오른쪽: 출역장비 입력 -->
      <div class="flex flex-col overflow-hidden border border-border rounded-lg bg-card">
        <div class="px-4 py-3 border-b border-border bg-muted/50 flex items-center gap-1">
          <h3 class="text-sm font-medium">출역장비 입력</h3>
          <ReferenceEditTrigger type="equipment" @refresh="initEquipment" />
        </div>

        <!-- 장비 박스 목록 -->
        <div class="flex-1 overflow-y-auto p-4">
          <div v-if="equipmentBoxes.length === 0" class="flex items-center justify-center h-full">
            <p class="text-muted-foreground text-sm">추가 버튼을 눌러 업체를 추가하세요.</p>
          </div>

          <div v-else class="space-y-4">
            <EquipmentCountBox
              v-for="box in equipmentBoxes"
              :key="box.id"
              :box-id="box.id"
              :company-id="box.companyId"
              :company-name="box.companyName"
              :work-type-name="box.workTypeName"
              :selected-specs="box.selectedSpecs"
              :all-equipment-specs="allEquipmentSpecs"
              :is-loading="box.isLoading"
              :contractors="contractors"
              :get-count="getEquipmentCount"
              @select-company="selectEquipmentCompany"
              @add-spec="addSpecToBox"
              @remove-spec="removeSpecFromBox"
              @increment-count="incrementEquipmentCount"
              @decrement-count="decrementEquipmentCount"
              @set-count="setEquipmentCount"
            />
          </div>
        </div>

        <!-- 하단: 제출 -->
        <div class="flex items-center justify-end px-4 py-3 border-t border-border">
          <Button
            size="lg"
            :disabled="equipmentBoxes.length === 0 || isSubmittingEquipment"
            @click="submitEquipmentDeployment"
          >
            {{ isSubmittingEquipment ? '저장 중...' : '제출' }}
          </Button>
        </div>
      </div>

    </div>
  </div>
</template>
