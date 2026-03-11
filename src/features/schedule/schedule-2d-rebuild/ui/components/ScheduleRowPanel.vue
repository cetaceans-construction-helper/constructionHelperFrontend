<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ScheduleShellRow } from '@/features/schedule/schedule-2d-rebuild/model/schedule-rebuild-types'

type RowPanelEntry = { kind: 'row'; key: string; row: ScheduleShellRow }

const props = defineProps<{
  rows: ScheduleShellRow[]
  viewportHeight: number
  scrollTop: number
}>()

const emit = defineEmits<{
  'scroll-top-change': [scrollTop: number]
  'toggle-row-collapse': [rowId: string]
  'add-child-row': [parentRowId: string]
}>()

const containerRef = ref<HTMLElement | null>(null)
let syncingFromProp = false

const panelEntries = computed<RowPanelEntry[]>(() => {
  return props.rows.map((row) => ({
    kind: 'row',
    key: `row:${row.id}`,
    row,
  }))
})

const contentHeight = computed(() => {
  const lastRow = props.rows[props.rows.length - 1]
  return lastRow ? lastRow.top + lastRow.height : 0
})

watch(
  () => props.scrollTop,
  (nextScrollTop) => {
    const element = containerRef.value
    if (!element) return
    if (Math.abs(element.scrollTop - nextScrollTop) < 1) return

    syncingFromProp = true
    element.scrollTop = nextScrollTop
  },
)

function handleScroll(event: Event) {
  if (syncingFromProp) {
    syncingFromProp = false
    return
  }

  const target = event.target as HTMLElement
  emit('scroll-top-change', target.scrollTop)
}
</script>

<template>
  <div
    ref="containerRef"
    class="overflow-y-auto overflow-x-hidden"
    :style="{ height: `${viewportHeight}px` }"
    @scroll="handleScroll"
  >
    <div class="relative" :style="{ height: `${contentHeight}px` }">
      <div
        v-for="entry in panelEntries"
        :key="entry.key"
        class="absolute left-0 right-0 flex items-center gap-2 border-b border-border/70 px-3"
        :class="[
          entry.row.kind === 'parent-process' ? 'bg-muted/25' : 'bg-background',
          entry.row.kind === 'parent-process' && entry.row.hasChildren ? 'cursor-pointer' : '',
        ]"
        :style="{
          top: `${entry.row.top}px`,
          height: `${entry.row.height}px`,
          paddingLeft: `${16 + entry.row.depth * 20}px`,
        }"
        @click="entry.row.kind === 'parent-process' && entry.row.hasChildren && emit('toggle-row-collapse', entry.row.id)"
      >
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <template v-if="entry.row.kind === 'parent-process'">
            <button
              v-if="entry.row.hasChildren"
              type="button"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-2xl leading-none text-muted-foreground hover:bg-background hover:text-foreground"
              @click.stop="emit('toggle-row-collapse', entry.row.id)"
            >
              {{ entry.row.collapsed ? '▸' : '▾' }}
            </button>
            <div v-else class="h-9 w-9 shrink-0" />
          </template>

          <p
            class="truncate text-sm"
            :class="entry.row.kind === 'parent-process' ? 'font-extrabold text-foreground' : 'font-medium text-muted-foreground'"
          >
            {{ entry.row.name }}
          </p>
        </div>

        <template v-if="entry.row.kind === 'parent-process'">
          <button
            type="button"
            class="flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xl leading-none text-muted-foreground hover:bg-background hover:text-foreground"
            @click.stop="emit('add-child-row', entry.row.id)"
          >
            +
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
