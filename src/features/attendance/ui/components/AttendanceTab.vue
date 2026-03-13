<script setup lang="ts">
import { onMounted } from 'vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Plus, Minus, Search } from 'lucide-vue-next'
import ReferenceEditTrigger from '@/shared/helper-ui/ReferenceEditTrigger.vue'
import { useAttendance } from '@/features/attendance/view-model/useAttendance'
import { useEquipmentDeployment } from '@/features/attendance/view-model/useEquipmentDeployment'
import { useAttendanceCumulative } from '@/features/attendance/view-model/useAttendanceCumulative'
import LaborCountBox from '@/features/attendance/ui/components/LaborCountBox.vue'
import EquipmentCountBox from '@/features/attendance/ui/components/EquipmentCountBox.vue'
import TodayAttendanceBox from '@/features/attendance/ui/components/TodayAttendanceBox.vue'
import CumulativeAttendanceBox from '@/features/attendance/ui/components/CumulativeAttendanceBox.vue'
import CumulativeEquipmentBox from '@/features/attendance/ui/components/CumulativeEquipmentBox.vue'

const {
  selectedDate,
  isSubmitting,
  todayAttendance,
  isLoadingToday,
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
  todayEquipment,
  isLoadingEquipment,
  equipmentBoxes,

  selectCompany: selectEquipmentCompany,

  addSpecToBox,
  removeSpecFromBox,
  getCount: getEquipmentCount,
  incrementCount: incrementEquipmentCount,
  decrementCount: decrementEquipmentCount,
  setCount: setEquipmentCount,
  getWorkTime,
  incrementWorkTime,
  decrementWorkTime,
  setWorkTime,
  setFullDay,
  setHalfDay,
  submitEquipmentDeployment,
  init: initEquipment,
} = useEquipmentDeployment(selectedDate, contractors)

const {
  startDate: cumulativeStartDate,
  endDate: cumulativeEndDate,
  cumulativeList,
  isLoading: isLoadingCumulative,
  grandTotal,
  equipmentCumulativeList,
  equipmentGrandTotal,
  initDates: initCumulativeDates,
  fetchCumulative,
} = useAttendanceCumulative()

function changeDate(days: number) {
  const date = new Date(selectedDate.value)
  date.setDate(date.getDate() + days)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  selectedDate.value = `${y}-${m}-${d}`
}

onMounted(async () => {
  await initCumulativeDates()
  await initAttendance()
  await initEquipment()
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- 상단: 날짜 선택 -->
    <div class="flex items-center justify-center gap-2 py-4 border-b border-border">
      <Button variant="outline" size="icon-sm" @click="changeDate(-1)">
        <Minus class="w-4 h-4" />
      </Button>
      <Input v-model="selectedDate" type="date" class="w-48" />
      <Button variant="outline" size="icon-sm" @click="changeDate(1)">
        <Plus class="w-4 h-4" />
      </Button>
    </div>

    <!-- 4컬럼 레이아웃 -->
    <div class="flex-1 overflow-hidden grid grid-cols-4 [@media(max-aspect-ratio:1/1)]:grid-cols-1 gap-4 p-4">
      <!-- 왼쪽: 오늘 출역 (읽기 전용) -->
      <div class="flex flex-col overflow-hidden border border-border rounded-lg bg-card">
        <div class="px-4 py-3 border-b border-border bg-muted/50 flex items-center">
          <h3 class="text-sm font-medium">오늘 출역</h3>
          <div class="ml-auto flex items-center gap-3">
            <span class="text-xs text-muted-foreground">
              총 인원 : <span class="font-semibold text-foreground">{{ todayAttendance.reduce((s, i) => s + i.count, 0) }}명</span>
            </span>
            <span class="text-xs text-muted-foreground">
              총 장비 : <span class="font-semibold text-foreground">{{ todayEquipment.reduce((s, i) => s + i.count, 0) }}대</span>
            </span>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto p-4">
          <TodayAttendanceBox
            :attendances="todayAttendance"
            :is-loading="isLoadingToday"
            :equipment-deployments="todayEquipment"
            :is-loading-equipment="isLoadingEquipment"
          />
        </div>
      </div>

      <!-- 중앙: 출역인원 입력 -->
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
              :get-work-time="getWorkTime"
              @select-company="selectEquipmentCompany"
              @add-spec="addSpecToBox"
              @remove-spec="removeSpecFromBox"
              @increment-count="incrementEquipmentCount"
              @decrement-count="decrementEquipmentCount"
              @set-count="setEquipmentCount"
              @increment-work-time="incrementWorkTime"
              @decrement-work-time="decrementWorkTime"
              @set-work-time="setWorkTime"
              @set-full-day="setFullDay"
              @set-half-day="setHalfDay"
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

      <!-- 4번째: 출역 누적 집계 -->
      <div class="flex flex-col overflow-hidden border border-border rounded-lg bg-card">
        <div class="px-4 py-3 border-b border-border bg-muted/50">
          <h3 class="text-sm font-medium">출역 누적 집계</h3>
        </div>

        <!-- 기간 선택 -->
        <div class="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Input v-model="cumulativeStartDate" type="date" class="flex-1" />
          <span class="text-sm text-muted-foreground">~</span>
          <Input v-model="cumulativeEndDate" type="date" class="flex-1" />
          <Button size="icon-sm" @click="fetchCumulative">
            <Search class="w-4 h-4" />
          </Button>
        </div>

        <!-- 집계 내용 -->
        <div class="flex-1 overflow-y-auto p-4">
          <div class="grid grid-cols-2 gap-4 h-full">
            <CumulativeAttendanceBox
              :cumulative-list="cumulativeList"
              :is-loading="isLoadingCumulative"
              :grand-total="grandTotal"
            />
            <CumulativeEquipmentBox
              :cumulative-list="equipmentCumulativeList"
              :is-loading="isLoadingCumulative"
              :grand-total="equipmentGrandTotal"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
