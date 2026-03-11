<script setup lang="ts">
import { computed } from 'vue'
import type { RowLayout } from '@/features/schedule/schedule-2d/use-cases/rowLayout'
import { LEFT_HEADER_WIDTH } from '@/features/schedule/schedule-2d/use-cases/rowLayout'
import { CHART_CONFIG } from '@/features/schedule/schedule-2d/view-model/chartConfigStore'

const props = defineProps<{
  rowLayout: RowLayout
  viewportY: number
  zoom: number
  headerHeight: number
}>()

const ROW_UNIT = CHART_CONFIG.nodeHeight + 2 * CHART_CONFIG.nodePaddingY

const WORK_TYPE_WIDTH = 100
const SUB_WORK_TYPE_WIDTH = 100

const BG_COLORS = [
  'rgba(59, 130, 246, 0.06)',
  'rgba(16, 185, 129, 0.06)',
  'rgba(245, 158, 11, 0.06)',
  'rgba(168, 85, 247, 0.06)',
  'rgba(236, 72, 153, 0.06)',
  'rgba(6, 182, 212, 0.06)',
]

interface HeaderCell {
  key: string
  label: string
  x: number
  width: number
  top: number
  height: number
  bgColor: string
  isWorkType: boolean
}

const cells = computed<HeaderCell[]>(() => {
  const result: HeaderCell[] = []
  const zoom = props.zoom

  for (let si = 0; si < props.rowLayout.sections.length; si++) {
    const section = props.rowLayout.sections[si]!
    const bgColor = BG_COLORS[si % BG_COLORS.length]!
    const sectionTop = section.startRowIndex * ROW_UNIT * zoom
    const sectionHeight = section.totalRows * ROW_UNIT * zoom

    // WorkType cell (left column, merged)
    result.push({
      key: `wt-${si}`,
      label: section.workType,
      x: 0,
      width: WORK_TYPE_WIDTH,
      top: sectionTop,
      height: sectionHeight,
      bgColor,
      isWorkType: true,
    })

    // SubWorkType cells (right column)
    for (const sub of section.subSections) {
      const subTop = sub.startRowIndex * ROW_UNIT * zoom
      const subHeight = sub.subRowCount * ROW_UNIT * zoom

      result.push({
        key: `swt-${sub.subWorkTypeId}-${sub.startRowIndex}`,
        label: sub.subWorkType,
        x: WORK_TYPE_WIDTH,
        width: SUB_WORK_TYPE_WIDTH,
        top: subTop,
        height: subHeight,
        bgColor,
        isWorkType: false,
      })
    }
  }

  return result
})
</script>

<template>
  <div
    class="absolute top-0 left-0 z-20 overflow-hidden bg-background border-r border-border"
    :style="{
      width: `${LEFT_HEADER_WIDTH}px`,
      top: `${headerHeight}px`,
      bottom: '0px',
    }"
  >
    <div
      :style="{
        transform: `translateY(${viewportY}px)`,
        position: 'relative',
      }"
    >
      <div
        v-for="cell in cells"
        :key="cell.key"
        class="absolute flex items-center justify-center border-b border-r border-border text-[11px] select-none overflow-hidden"
        :class="cell.isWorkType ? 'font-medium' : ''"
        :style="{
          left: `${cell.x}px`,
          width: `${cell.width}px`,
          top: `${cell.top}px`,
          height: `${cell.height}px`,
          backgroundColor: cell.bgColor,
        }"
      >
        <span class="px-1 text-center truncate" :title="cell.label">
          {{ cell.label }}
        </span>
      </div>
    </div>
  </div>
</template>
