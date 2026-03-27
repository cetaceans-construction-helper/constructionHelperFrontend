<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ScheduleShellRow } from '@/features/schedule/schedule-2d-rebuild/model/schedule-rebuild-types'
import { toAlphaColor } from '@/features/schedule/schedule-2d-rebuild/model/schedule-process-colors'

type RowPanelEntry = { kind: 'row'; key: string; row: ScheduleShellRow }

const props = defineProps<{
  rows: ScheduleShellRow[]
  viewportHeight: number
  scrollTop: number
  hoveredRowId?: string | null
  bottomInset?: number
}>()

const emit = defineEmits<{
  'scroll-top-change': [scrollTop: number]
  'toggle-row-collapse': [rowId: string]
  'add-child-row': [parentRowId: string]
  'row-context-menu': [payload: { rowId: string; x: number; y: number }]
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
  return (lastRow ? lastRow.top + lastRow.height : 0) + (props.bottomInset ?? 0)
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

function handleRowContextMenu(row: ScheduleShellRow, event: MouseEvent) {
  if (row.kind !== 'parent-process') return

  event.preventDefault()
  emit('row-context-menu', {
    rowId: row.id,
    x: event.clientX,
    y: event.clientY,
  })
}

function getRowContainerStyle(row: ScheduleShellRow, isHovered: boolean) {
  const style: Record<string, string> = {
    top: `${row.top}px`,
    height: `${row.height}px`,
    paddingLeft: `${16 + row.depth * 20}px`,
  }

  if (row.surfaceColorHex) {
    style.backgroundColor = row.surfaceColorHex
  }

  if (row.borderColorHex) {
    style.borderColor = row.borderColorHex
  }

  if (row.colorHex && row.kind !== 'milestone') {
    style.boxShadow = isHovered
      ? `inset 0 0 0 1px ${toAlphaColor(row.colorHex, 0.45)}, inset 4px 0 0 ${row.colorHex}`
      : `inset 4px 0 0 ${row.colorHex}`
  } else if (isHovered) {
    style.boxShadow = 'inset 0 0 0 1px rgba(125,211,252,0.9)'
  }

  return style
}

function getRowTextStyle(row: ScheduleShellRow) {
  return row.textColorHex ? { color: row.textColorHex } : undefined
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
          entry.row.kind === 'milestone'
              ? 'bg-amber-50/70'
              : '',
          entry.row.kind === 'parent-process' && entry.row.hasChildren ? 'cursor-pointer' : '',
        ]"
        :style="getRowContainerStyle(entry.row, entry.row.id === hoveredRowId)"
        @click="entry.row.kind === 'parent-process' && entry.row.hasChildren && emit('toggle-row-collapse', entry.row.id)"
        @contextmenu="handleRowContextMenu(entry.row, $event)"
      >
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <template v-if="entry.row.kind === 'parent-process'">
            <button
              v-if="entry.row.hasChildren"
              type="button"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-2xl leading-none hover:bg-white/60"
              :style="getRowTextStyle(entry.row)"
              @click.stop="emit('toggle-row-collapse', entry.row.id)"
            >
              {{ entry.row.collapsed ? '▸' : '▾' }}
            </button>
            <div v-else class="h-9 w-9 shrink-0" />
          </template>

          <p
            class="truncate text-sm"
            :class="entry.row.kind === 'milestone'
              ? 'font-semibold text-amber-700'
              : entry.row.kind === 'parent-process'
                ? 'font-extrabold'
                : 'font-medium'"
            :style="entry.row.kind === 'milestone' ? undefined : getRowTextStyle(entry.row)"
          >
            {{ entry.row.name }}
          </p>
        </div>

        <template v-if="entry.row.kind === 'parent-process'">
          <button
            type="button"
            class="flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xl leading-none hover:bg-white/60"
            :style="getRowTextStyle(entry.row)"
            @click.stop="emit('add-child-row', entry.row.id)"
          >
            +
          </button>
        </template>
      </div>
    </div>
  </div>
</template>
