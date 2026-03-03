<script setup lang="ts">
import { onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useHolidayManagement } from '../composables/useHolidayManagement'
import type { CalendarCell } from '../composables/useHolidayManagement'
import InactivePeriodDialog from './InactivePeriodDialog.vue'

const {
  currentYear,
  currentMonth,
  isLoading,
  isUpdating,
  showSetDialog,
  showReleaseDialog,
  calendarGrid,
  loadCalendar,
  goToPrevMonth,
  goToNextMonth,
  toggleHoliday,
  submitInactiveSet,
  submitInactiveRelease,
} = useHolidayManagement()

const dayHeaders = ['월', '화', '수', '목', '금', '토', '일']

function cellClasses(cell: CalendarCell) {
  const inactive = !cell.isCurrentMonth || !cell.isInProjectRange
  return {
    'bg-red-50 dark:bg-red-950/20':
      cell.isHoliday && cell.isActivated && !inactive,
    'bg-orange-50 dark:bg-orange-950/20':
      !cell.isActivated && !inactive,
    'opacity-40 pointer-events-none': inactive,
    'hover:bg-muted/50 cursor-pointer':
      !inactive && cell.isActivated && !cell.isHoliday,
    'hover:bg-red-100 dark:hover:bg-red-950/40 cursor-pointer':
      !inactive && cell.isActivated && cell.isHoliday,
    'cursor-not-allowed': !inactive && !cell.isActivated,
  }
}

function dayHeaderClass(index: number) {
  if (index === 5) return 'text-blue-500' // 토
  if (index === 6) return 'text-red-500' // 일
  return ''
}

function dayNumberClass(cell: CalendarCell) {
  const d = new Date(cell.date)
  const day = (d.getDay() + 6) % 7 // 월=0 ... 일=6
  return {
    'text-blue-500': day === 5,
    'text-red-500': day === 6 || (cell.isHoliday && cell.isActivated),
    'text-muted-foreground': !cell.isCurrentMonth || !cell.isInProjectRange,
  }
}

function onCellClick(cell: CalendarCell) {
  if (!cell.isCurrentMonth || !cell.isInProjectRange || !cell.isActivated) return
  toggleHoliday(cell)
}

onMounted(() => {
  loadCalendar()
})
</script>

<template>
  <div>
    <!-- 헤더: 월 네비게이션 + 액션 버튼 -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <Button variant="outline" size="icon" class="h-8 w-8" @click="goToPrevMonth">
          <ChevronLeft class="h-4 w-4" />
        </Button>
        <span class="text-lg font-semibold min-w-[140px] text-center">
          {{ currentYear }}년 {{ currentMonth + 1 }}월
        </span>
        <Button variant="outline" size="icon" class="h-8 w-8" @click="goToNextMonth">
          <ChevronRight class="h-4 w-4" />
        </Button>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" @click="showSetDialog = true">
          현장 비활성일 지정
        </Button>
        <Button variant="outline" size="sm" @click="showReleaseDialog = true">
          현장 비활성일 해제
        </Button>
      </div>
    </div>

    <!-- 로딩 상태 -->
    <div v-if="isLoading" class="flex items-center justify-center h-[480px]">
      <span class="text-muted-foreground">캘린더 로딩 중...</span>
    </div>

    <!-- 캘린더 그리드 -->
    <div v-else class="border border-border rounded-md overflow-hidden">
      <!-- 요일 헤더 -->
      <div class="grid grid-cols-7">
        <div
          v-for="(day, index) in dayHeaders"
          :key="day"
          class="text-center text-xs font-medium py-2 bg-muted/50 border-b border-border"
          :class="[dayHeaderClass(index), index < 6 ? 'border-r border-border' : '']"
        >
          {{ day }}
        </div>
      </div>

      <!-- 날짜 셀 -->
      <div v-for="(row, rowIndex) in calendarGrid" :key="rowIndex" class="grid grid-cols-7">
        <div
          v-for="(cell, colIndex) in row"
          :key="cell.date"
          class="min-h-[80px] p-1.5 transition-colors relative"
          :class="[
            cellClasses(cell),
            colIndex < 6 ? 'border-r border-border' : '',
            rowIndex < calendarGrid.length - 1 ? 'border-b border-border' : '',
          ]"
          @click="onCellClick(cell)"
        >
          <span class="text-sm font-medium" :class="dayNumberClass(cell)">
            {{ cell.dayOfMonth }}
          </span>
          <div
            v-if="cell.holidayName && cell.isCurrentMonth && cell.isInProjectRange"
            class="text-[10px] text-red-600 dark:text-red-400 mt-0.5 truncate"
          >
            {{ cell.holidayName }}
          </div>
          <div
            v-if="!cell.isActivated && cell.deactivatedReason && cell.isCurrentMonth && cell.isInProjectRange"
            class="text-[10px] text-orange-600 dark:text-orange-400 mt-0.5 truncate"
          >
            {{ cell.deactivatedReason }}
          </div>
          <!-- 업데이트 중 오버레이 -->
          <div
            v-if="isUpdating"
            class="absolute inset-0 bg-background/30 pointer-events-none"
          />
        </div>
      </div>
    </div>

    <!-- 범례 -->
    <div class="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
      <div class="flex items-center gap-1.5">
        <div class="w-3 h-3 rounded bg-red-50 dark:bg-red-950/20 border border-border" />
        <span>휴일</span>
      </div>
      <div class="flex items-center gap-1.5">
        <div class="w-3 h-3 rounded bg-orange-50 dark:bg-orange-950/20 border border-border" />
        <span>비활성일</span>
      </div>
    </div>

    <!-- 비활성일 지정 다이얼로그 -->
    <InactivePeriodDialog
      v-model:open="showSetDialog"
      mode="set"
      :is-submitting="isUpdating"
      @submit="submitInactiveSet"
    />

    <!-- 비활성일 해제 다이얼로그 -->
    <InactivePeriodDialog
      v-model:open="showReleaseDialog"
      mode="release"
      :is-submitting="isUpdating"
      @submit="submitInactiveRelease"
    />
  </div>
</template>
