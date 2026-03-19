<script setup lang="ts">
import PageContainer from '@/shared/helper-ui/PageContainer.vue'
import AreaCard from '@/shared/helper-ui/AreaCard.vue'
import DailyReportCredentialArea from '@/features/project-admin/homepage-setting/ui/components/DailyReportCredentialArea.vue'
</script>

<template>
  <PageContainer title="홈페이지 입력정보">
    <AreaCard
      height="flex-1"
      min-height="600px"
      :has-tabs="true"
      :tabs="[
        { value: 'daily-report', label: '작업일보' },
      ]"
      default-tab="daily-report"
    >
      <template #tab-daily-report>
        <div class="p-4">
          <DailyReportCredentialArea />
        </div>
      </template>
    </AreaCard>
  </PageContainer>
</template>
