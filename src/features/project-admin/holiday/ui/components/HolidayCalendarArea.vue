<script setup lang="ts">
import { onMounted } from 'vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/shared/ui/context-menu'
import { useHolidayManagement } from '@/features/project-admin/holiday/view-model/useHolidayManagement'
import type { CalendarCell } from '@/features/project-admin/holiday/view-model/useHolidayManagement'

const {
  currentYear,
  currentMonth,
  isLoading,
  isUpdating,
  inactiveFlow,
  calendarGrid,
  loadCalendar,
  goToPrevMonth,
  goToNextMonth,
  toggleHoliday,
  startInactiveFlow,
  selectInactiveDate,
  resetInactiveSelection,
  cancelInactiveFlow,
  confirmInactiveFlow,
  isInSelectedRange,
} = useHolidayManagement()

const dayHeaders = ['일', '월', '화', '수', '목', '금', '토']

function isCellInteractable(cell: CalendarCell) {
  return cell.isCurrentMonth && cell.isInProjectRange
}

function cellClasses(cell: CalendarCell) {
  const inactive = !cell.isCurrentMonth || !cell.isInProjectRange
  const inRange = isInSelectedRange(cell.date)
  const isSelecting = inactiveFlow.value.mode !== 'idle'
  return {
    'bg-red-50':
      cell.isHoliday && cell.isActivated && !inactive && !inRange,
    'bg-orange-50':
      !cell.isActivated && !inactive && !inRange,
    'opacity-40 pointer-events-none': inactive,
    'bg-blue-100 ring-1 ring-blue-400': inRange && !inactive,
    'cursor-pointer hover:bg-muted/50': isSelecting && !inactive,
  }
}

function dayHeaderClass(index: number) {
  if (index === 0) return 'text-red-500' // 일
  if (index === 6) return 'text-blue-500' // 토
  return ''
}

function dayNumberClass(cell: CalendarCell) {
  const d = new Date(cell.date)
  const day = d.getDay()
  return {
    'text-blue-500': day === 6, // 토
    'text-red-500': day === 0 || (cell.isHoliday && cell.isActivated), // 일 or 휴일
    'text-muted-foreground': !cell.isCurrentMonth || !cell.isInProjectRange,
  }
}

function onCellClick(cell: CalendarCell) {
  if (inactiveFlow.value.mode === 'idle') return
  if (!isCellInteractable(cell)) return
  selectInactiveDate(cell.date)
}

function formatDisplayDate(dateStr: string | null) {
  if (!dateStr) return '-'
  const [y, m, d] = dateStr.split('-')
  return `${y}년 ${Number(m)}월 ${Number(d)}일`
}

onMounted(() => {
  loadCalendar()
})
</script>

<template>
  <div>
    <!-- 헤더: 월 네비게이션 -->
    <div class="flex items-center justify-center mb-4">
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
        <template v-for="(cell, colIndex) in row" :key="cell.date">
          <!-- 비활성 셀 (다른 달/프로젝트 범위 밖) - 컨텍스트 메뉴 없음 -->
          <div
            v-if="!isCellInteractable(cell)"
            class="min-h-[80px] p-1.5 transition-colors relative"
            :class="[
              cellClasses(cell),
              colIndex < 6 ? 'border-r border-border' : '',
              rowIndex < calendarGrid.length - 1 ? 'border-b border-border' : '',
            ]"
          >
            <span class="text-sm font-medium" :class="dayNumberClass(cell)">
              {{ cell.dayOfMonth }}
            </span>
          </div>

          <!-- 활성 셀 - 컨텍스트 메뉴 있음 -->
          <ContextMenu v-else>
            <ContextMenuTrigger as-child>
              <div
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
                  class="text-[10px] text-red-600 mt-0.5 truncate"
                >
                  {{ cell.holidayName }}
                </div>
                <div
                  v-if="!cell.isActivated && cell.deactivatedReason && cell.isCurrentMonth && cell.isInProjectRange"
                  class="text-[10px] text-orange-600 mt-0.5 truncate"
                >
                  {{ cell.deactivatedReason }}
                </div>
                <!-- 업데이트 중 오버레이 -->
                <div
                  v-if="isUpdating"
                  class="absolute inset-0 bg-background/30 pointer-events-none"
                />
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <!-- 휴일 설정/해제 -->
              <ContextMenuItem
                v-if="cell.isActivated && !cell.isHoliday"
                @select="toggleHoliday(cell)"
              >
                휴일 설정
              </ContextMenuItem>
              <ContextMenuItem
                v-if="cell.isActivated && cell.isHoliday"
                @select="toggleHoliday(cell)"
              >
                휴일 해제
              </ContextMenuItem>
              <!-- 비활성일 설정/해제 -->
              <ContextMenuItem
                v-if="cell.isActivated"
                @select="startInactiveFlow('set')"
              >
                비활성일 설정
              </ContextMenuItem>
              <ContextMenuItem
                v-if="!cell.isActivated"
                @select="startInactiveFlow('release')"
              >
                비활성일 해제
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </template>
      </div>
    </div>

    <!-- 비활성일 인라인 패널 -->
    <div v-if="inactiveFlow.mode !== 'idle'" class="border border-border rounded-md p-4 mt-3">
      <!-- 선택 안내 -->
      <template v-if="inactiveFlow.step === 'select_start'">
        <p class="text-sm text-muted-foreground">
          {{ inactiveFlow.mode === 'set' ? '비활성일 설정' : '비활성일 해제' }} — 시작일을 선택하세요
        </p>
      </template>
      <template v-else-if="inactiveFlow.step === 'select_end'">
        <p class="text-sm text-muted-foreground">
          시작일: <span class="font-medium text-foreground">{{ formatDisplayDate(inactiveFlow.startDate) }}</span>
          — 종료일을 선택하세요
        </p>
      </template>

      <!-- 확인 단계 -->
      <template v-else-if="inactiveFlow.step === 'confirm'">
        <div class="space-y-3">
          <div class="flex items-center gap-4 text-sm">
            <span class="text-muted-foreground">시작일:</span>
            <span class="font-medium">{{ formatDisplayDate(inactiveFlow.startDate) }}</span>
            <span class="text-muted-foreground">종료일:</span>
            <span class="font-medium">{{ formatDisplayDate(inactiveFlow.endDate) }}</span>
          </div>

          <!-- 설명 입력 (설정 모드만) -->
          <div v-if="inactiveFlow.mode === 'set'">
            <Input
              v-model="inactiveFlow.reason"
              placeholder="비활성 사유를 입력하세요"
              class="max-w-md"
            />
          </div>

          <div class="flex items-center gap-2">
            <Button variant="outline" size="sm" @click="resetInactiveSelection">
              날짜 변경하기
            </Button>
            <Button
              size="sm"
              :disabled="isUpdating || (inactiveFlow.mode === 'set' && !inactiveFlow.reason.trim())"
              @click="confirmInactiveFlow"
            >
              {{ isUpdating ? '처리 중...' : inactiveFlow.mode === 'set' ? '비활성일 설정' : '비활성일 해제' }}
            </Button>
            <Button variant="ghost" size="sm" @click="cancelInactiveFlow">
              취소
            </Button>
          </div>
        </div>
      </template>
    </div>

    <!-- 범례 -->
    <div class="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
      <div class="flex items-center gap-1.5">
        <div class="w-3 h-3 rounded bg-red-50 border border-border" />
        <span>휴일</span>
      </div>
      <div class="flex items-center gap-1.5">
        <div class="w-3 h-3 rounded bg-orange-50 border border-border" />
        <span>비활성일</span>
      </div>
    </div>
  </div>
</template>
