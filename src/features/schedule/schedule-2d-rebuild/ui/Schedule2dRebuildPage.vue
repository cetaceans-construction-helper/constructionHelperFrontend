<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import PageContainer from '@/shared/helper-ui/PageContainer.vue'
import AreaCard from '@/shared/helper-ui/AreaCard.vue'
import { Button } from '@/shared/ui/button'
import ScheduleGanttShell from '@/features/schedule/schedule-2d-rebuild/ui/components/ScheduleGanttShell.vue'
import { useSchedule2dRebuildPage } from '@/features/schedule/schedule-2d-rebuild/view-model/useSchedule2dRebuildPage'

const {
  isLoading,
  errorMessage,
  timeline,
  shellLayout,
  chartScrollTop,
  chartScrollLeft,
  loadSnapshot,
  syncChartScroll,
} = useSchedule2dRebuildPage()

const shellHostRef = ref<HTMLElement | null>(null)
const shellViewportHeight = ref(640)
let resizeObserver: ResizeObserver | null = null

function syncShellHeight() {
  if (!shellHostRef.value) return
  shellViewportHeight.value = Math.max(shellHostRef.value.clientHeight, 320)
}

onMounted(() => {
  loadSnapshot()

  if (shellHostRef.value) {
    resizeObserver = new ResizeObserver(() => {
      syncShellHeight()
    })
    resizeObserver.observe(shellHostRef.value)
    syncShellHeight()
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<template>
  <PageContainer title="2D공정표 Rebuild">
    <AreaCard height="flex-1" min-height="calc(100vh - 180px)">
      <div ref="shellHostRef" class="relative h-full min-h-0 flex-1">
        <ScheduleGanttShell
          v-if="timeline && shellLayout"
          class="h-full"
          :timeline="timeline"
          :shell-layout="shellLayout"
          :viewport-height="shellViewportHeight"
          :scroll-top="chartScrollTop"
          :scroll-left="chartScrollLeft"
          @scroll-sync="syncChartScroll"
        />

        <div
          v-else-if="isLoading"
          class="absolute inset-0 flex items-center justify-center rounded-lg border border-border bg-muted/20 text-sm text-muted-foreground"
        >
          schedule snapshot을 불러오는 중...
        </div>

        <div
          v-if="errorMessage"
          class="absolute left-1/2 top-4 z-20 w-full max-w-xl -translate-x-1/2 px-4"
        >
          <div class="rounded-lg border border-destructive/30 bg-background/95 px-4 py-3 text-sm text-destructive shadow-lg backdrop-blur-sm">
            {{ errorMessage }}
          </div>
        </div>

        <div class="absolute right-4 top-4 z-20">
          <Button variant="outline" size="sm" :disabled="isLoading" @click="loadSnapshot">
            {{ isLoading ? '불러오는 중...' : '새로고침' }}
          </Button>
        </div>
      </div>
    </AreaCard>
  </PageContainer>
</template>
