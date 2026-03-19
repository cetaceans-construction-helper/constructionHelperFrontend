<script setup lang="ts">
import PageContainer from '@/shared/helper-ui/PageContainer.vue'
import AreaCard from '@/shared/helper-ui/AreaCard.vue'
import DailyReportSettingArea from '@/features/project-admin/daily-report-setting/ui/components/DailyReportSettingArea.vue'
</script>

<template>
  <PageContainer title="작업일보">
    <AreaCard
      height="flex-1"
      min-height="600px"
      :has-tabs="true"
      :tabs="[
        { value: 'daily-report', label: '작업일보 설정' },
      ]"
      default-tab="daily-report"
    >
      <template #tab-daily-report>
        <div class="p-4">
          <DailyReportSettingArea />
        </div>
      </template>
    </AreaCard>
  </PageContainer>
</template>
