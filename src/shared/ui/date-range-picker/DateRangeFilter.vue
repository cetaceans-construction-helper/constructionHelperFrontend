<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CalendarDays } from 'lucide-vue-next'
import {
  PopoverRoot,
  PopoverTrigger,
  PopoverContent,
  PopoverPortal,
  CalendarRoot,
  CalendarHeader,
  CalendarHeading,
  CalendarPrev,
  CalendarNext,
  CalendarGrid,
  CalendarGridHead,
  CalendarGridBody,
  CalendarGridRow,
  CalendarHeadCell,
  CalendarCell,
  CalendarCellTrigger,
  type DateValue,
} from 'reka-ui'
import { isSameDay } from '@internationalized/date'
import { cn } from '@/shared/utils/cn'

interface DateRangeValue {
  start?: DateValue
  end?: DateValue
}

const props = defineProps<{
  modelValue: DateRangeValue
  minValue?: DateValue
  maxValue?: DateValue
  class?: HTMLAttributes['class']
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: DateRangeValue): void
}>()

const isSelectingStart = ref(true)
const popoverOpen = ref(false)
const draftRange = ref<DateRangeValue>({ start: undefined, end: undefined })
const hoveredDate = ref<DateValue | undefined>(undefined)

watch(popoverOpen, (open) => {
  if (open) {
    draftRange.value = { start: undefined, end: undefined }
    hoveredDate.value = undefined
    isSelectingStart.value = true
  }
})

const displayText = computed(() => {
  const { start, end } = props.modelValue
  if (start && end) return `${start.toString()} ~ ${end.toString()}`
  return ''
})

function isInRange(date: DateValue): boolean {
  const { start, end } = draftRange.value
  if (start && end) {
    return date.compare(start) >= 0 && date.compare(end) <= 0
  }
  if (start && !isSelectingStart.value && hoveredDate.value) {
    const lo = start.compare(hoveredDate.value) <= 0 ? start : hoveredDate.value
    const hi = start.compare(hoveredDate.value) <= 0 ? hoveredDate.value : start
    return date.compare(lo) >= 0 && date.compare(hi) <= 0
  }
  return false
}

function onDateHover(date: DateValue) {
  if (!isSelectingStart.value) {
    hoveredDate.value = date
  }
}

function isSelected(date: DateValue): boolean {
  const { start, end } = draftRange.value
  return (!!start && isSameDay(date, start)) || (!!end && isSameDay(date, end))
}

function onDateClick(date: DateValue) {
  if (isSelectingStart.value) {
    draftRange.value = { start: date, end: undefined }
  } else {
    const { start } = draftRange.value
    const newStart = (start && date.compare(start) < 0) ? date : start
    const newEnd = (start && date.compare(start) < 0) ? start : date
    draftRange.value = { start: newStart, end: newEnd }
    emit('update:modelValue', { start: newStart, end: newEnd })
  }
  isSelectingStart.value = !isSelectingStart.value
  if (isSelectingStart.value) {
    popoverOpen.value = false
  }
}
</script>

<template>
  <PopoverRoot v-model:open="popoverOpen">
    <PopoverTrigger
      :class="cn(
        'border-input focus-visible:border-ring focus-visible:ring-ring/50 flex items-center gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs h-9 whitespace-nowrap dark:bg-input/30 dark:hover:bg-input/50 transition-[color,box-shadow] outline-none focus-visible:ring-[3px] cursor-pointer',
        props.class,
      )"
    >
      <CalendarDays class="size-4 opacity-50 shrink-0" />
      <span v-if="displayText" class="text-foreground">{{ displayText }}</span>
      <span v-else class="text-muted-foreground">날짜 선택</span>
    </PopoverTrigger>

    <PopoverPortal>
      <PopoverContent
        :side-offset="4"
        :class="cn(
          'bg-popover text-popover-foreground z-50 rounded-md border p-3 shadow-md',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
        )"
      >
        <p class="text-xs text-muted-foreground text-center pb-2">
          {{ isSelectingStart ? '시작일 선택' : '종료일 선택' }}
        </p>
        <CalendarRoot
          locale="ko"
          weekday-format="short"
          :min-value="minValue"
          :max-value="maxValue"
          v-slot="{ weekDays, grid }"
        >
          <CalendarHeader class="flex items-center justify-between pb-2">
            <div class="flex items-center">
              <CalendarPrev
                :prev-page="(d: DateValue) => d.subtract({ years: 1 })"
                class="inline-flex items-center justify-center rounded-md size-7 hover:bg-accent hover:text-accent-foreground cursor-pointer"
              >
                <ChevronsLeft class="size-4" />
              </CalendarPrev>
              <CalendarPrev
                class="inline-flex items-center justify-center rounded-md size-7 hover:bg-accent hover:text-accent-foreground cursor-pointer"
              >
                <ChevronLeft class="size-4" />
              </CalendarPrev>
            </div>
            <CalendarHeading class="text-sm font-medium" />
            <div class="flex items-center">
              <CalendarNext
                class="inline-flex items-center justify-center rounded-md size-7 hover:bg-accent hover:text-accent-foreground cursor-pointer"
              >
                <ChevronRight class="size-4" />
              </CalendarNext>
              <CalendarNext
                :next-page="(d: DateValue) => d.add({ years: 1 })"
                class="inline-flex items-center justify-center rounded-md size-7 hover:bg-accent hover:text-accent-foreground cursor-pointer"
              >
                <ChevronsRight class="size-4" />
              </CalendarNext>
            </div>
          </CalendarHeader>

          <CalendarGrid v-for="month in grid" :key="month.value.toString()">
            <CalendarGridHead>
              <CalendarGridRow class="flex">
                <CalendarHeadCell
                  v-for="day in weekDays"
                  :key="day"
                  class="text-muted-foreground w-8 text-center text-xs font-normal"
                >
                  {{ day }}
                </CalendarHeadCell>
              </CalendarGridRow>
            </CalendarGridHead>
            <CalendarGridBody>
              <CalendarGridRow
                v-for="(week, idx) in month.rows"
                :key="idx"
                class="flex"
              >
                <CalendarCell
                  v-for="date in week"
                  :key="date.toString()"
                  :date="date"
                  class="relative p-0 text-center text-sm"
                >
                  <CalendarCellTrigger
                    :day="date"
                    :month="month.value"
                    :class="cn(
                      'inline-flex items-center justify-center rounded-md size-8 text-sm cursor-pointer select-none',
                      'hover:bg-accent hover:text-accent-foreground',
                      'data-[today]:font-bold data-[today]:underline',
                      'data-[outside-month]:text-muted-foreground/30 data-[outside-month]:pointer-events-none',
                      'data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
                      isSelected(date) && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                      !isSelected(date) && isInRange(date) && 'bg-accent text-accent-foreground',
                    )"
                    @mouseenter="onDateHover(date)"
                    @click="onDateClick(date)"
                  />
                </CalendarCell>
              </CalendarGridRow>
            </CalendarGridBody>
          </CalendarGrid>
        </CalendarRoot>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
