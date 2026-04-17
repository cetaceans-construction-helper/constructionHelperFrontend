<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, Minus } from 'lucide-vue-next'
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
import { parseDate, isSameDay } from '@internationalized/date'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/utils/cn'

const props = defineProps<{
  modelValue: string
  minDate?: string
  maxDate?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const popoverOpen = ref(false)

const calendarValue = computed(() => {
  try {
    return parseDate(props.modelValue)
  } catch {
    return undefined
  }
})

const minCalendarValue = computed(() => {
  if (!props.minDate) return undefined
  try {
    return parseDate(props.minDate)
  } catch {
    return undefined
  }
})

const maxCalendarValue = computed(() => {
  if (!props.maxDate) return undefined
  try {
    return parseDate(props.maxDate)
  } catch {
    return undefined
  }
})

const displayText = computed(() => {
  if (!props.modelValue) return ''
  const d = new Date(props.modelValue + 'T00:00:00')
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} (${dayNames[d.getDay()]})`
})

function changeDate(days: number) {
  const date = new Date(props.modelValue + 'T00:00:00')
  date.setDate(date.getDate() + days)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  emit('update:modelValue', `${y}-${m}-${d}`)
}

const isAtMin = computed(() => !!props.minDate && props.modelValue <= props.minDate)
const isAtMax = computed(() => !!props.maxDate && props.modelValue >= props.maxDate)

function onDateClick(date: DateValue) {
  emit('update:modelValue', date.toString())
  popoverOpen.value = false
}
</script>

<template>
  <div class="flex items-center gap-2">
    <Button variant="outline" size="icon-sm" :disabled="isAtMin" @click="changeDate(-1)">
      <Minus class="w-4 h-4" />
    </Button>

    <PopoverRoot v-model:open="popoverOpen">
      <PopoverTrigger
        :class="cn(
          'border-input focus-visible:border-ring focus-visible:ring-ring/50 flex items-center justify-center rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs h-9 w-48 whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] cursor-pointer',
        )"
      >
        <span class="text-foreground">{{ displayText }}</span>
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
          <CalendarRoot
            locale="ko"
            weekday-format="short"
            :model-value="calendarValue"
            :min-value="minCalendarValue"
            :max-value="maxCalendarValue"
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
                        calendarValue && isSameDay(date, calendarValue) && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                      )"
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

    <Button variant="outline" size="icon-sm" :disabled="isAtMax" @click="changeDate(1)">
      <Plus class="w-4 h-4" />
    </Button>
  </div>
</template>
