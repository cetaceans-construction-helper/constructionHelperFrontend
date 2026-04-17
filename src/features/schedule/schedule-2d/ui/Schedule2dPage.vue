<script setup lang="ts">
import Viewer2dArea from './components/Viewer2dArea.vue'
import { DailyReportArea } from '@/features/dashboard/public'
</script>

<template>
  <div class="schedule-2d-layout flex flex-row flex-1 min-h-0 gap-2 p-2">
    <div class="schedule-2d-daily shrink-0 overflow-y-auto">
      <DailyReportArea />
    </div>
    <div class="flex flex-col flex-1 min-w-0">
      <Viewer2dArea />
    </div>
  </div>
</template>

<style scoped>
.schedule-2d-daily {
  width: 630px;
}

@media (max-aspect-ratio: 1/1) {
  .schedule-2d-layout {
    flex-direction: column;
  }

  .schedule-2d-daily {
    width: 100%;
    max-height: 40vh;
  }
}
</style>
