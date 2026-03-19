<script setup lang="ts">
import { computed } from 'vue'
import type { RowLayout } from '@/features/schedule/schedule-2d/use-cases/rowLayout'
import type { WeeklyRowLayout } from '@/features/schedule/schedule-2d/use-cases/rowLayout'
import { LEFT_HEADER_WIDTH } from '@/features/schedule/schedule-2d/use-cases/rowLayout'
import { CHART_CONFIG } from '@/features/schedule/schedule-2d/view-model/chartConfigStore'

const props = defineProps<{
  rowLayout: RowLayout
  weeklyRowLayout?: WeeklyRowLayout | null
  weeklyMode: boolean
  viewportY: number
  zoom: number
  headerHeight: number
}>()

const ROW_UNIT = CHART_CONFIG.nodeHeight + 2 * CHART_CONFIG.nodePaddingY
const WEEKLY_ROW_UNIT = ROW_UNIT * 2

const WORK_TYPE_WIDTH = 100
const SUB_WORK_TYPE_WIDTH = 100
const OV_WORK_TYPE_WIDTH = 80
const OV_ZONE_WIDTH = 60
const OV_FLOOR_WIDTH = 60

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

  // 주단위화면: 3-column layout (workType / zone / floor)
  if (props.weeklyMode && props.weeklyRowLayout) {
    const layout = props.weeklyRowLayout
    for (let si = 0; si < layout.sections.length; si++) {
      const section = layout.sections[si]!
      const bgColor = BG_COLORS[si % BG_COLORS.length]!
      const sectionTop = section.startRowIndex * WEEKLY_ROW_UNIT * zoom
      const sectionHeight = section.totalRows * WEEKLY_ROW_UNIT * zoom

      // WorkType cell (col 1)
      result.push({
        key: `ov-wt-${si}`,
        label: section.workType,
        x: 0,
        width: OV_WORK_TYPE_WIDTH,
        top: sectionTop,
        height: sectionHeight,
        bgColor,
        isWorkType: true,
      })

      // Zone + Floor cells (col 2 & 3)
      // Group by zone for merging
      let zoneStart = 0
      let zoneCount = 0
      let prevZone = ''
      for (let zi = 0; zi < section.zoneFloorSections.length; zi++) {
        const zf = section.zoneFloorSections[zi]!
        if (zi === 0 || zf.zoneName !== prevZone) {
          if (zi > 0) {
            // Push previous zone cell
            result.push({
              key: `ov-zone-${si}-${zoneStart}`,
              label: prevZone,
              x: OV_WORK_TYPE_WIDTH,
              width: OV_ZONE_WIDTH,
              top: (section.startRowIndex + zoneStart) * WEEKLY_ROW_UNIT * zoom,
              height: zoneCount * WEEKLY_ROW_UNIT * zoom,
              bgColor,
              isWorkType: false,
            })
          }
          zoneStart = zi
          zoneCount = 1
          prevZone = zf.zoneName
        } else {
          zoneCount++
        }

        // Floor cell (always 1 row)
        result.push({
          key: `ov-floor-${si}-${zi}`,
          label: zf.floorName,
          x: OV_WORK_TYPE_WIDTH + OV_ZONE_WIDTH,
          width: OV_FLOOR_WIDTH,
          top: zf.startRowIndex * WEEKLY_ROW_UNIT * zoom,
          height: WEEKLY_ROW_UNIT * zoom,
          bgColor,
          isWorkType: false,
        })
      }
      // Push last zone cell
      if (section.zoneFloorSections.length > 0) {
        result.push({
          key: `ov-zone-${si}-${zoneStart}`,
          label: prevZone,
          x: OV_WORK_TYPE_WIDTH,
          width: OV_ZONE_WIDTH,
          top: (section.startRowIndex + zoneStart) * WEEKLY_ROW_UNIT * zoom,
          height: zoneCount * WEEKLY_ROW_UNIT * zoom,
          bgColor,
          isWorkType: false,
        })
      }
    }
    return result
  }

  // 일단위화면: 2-column layout (workType / subWorkType)
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
