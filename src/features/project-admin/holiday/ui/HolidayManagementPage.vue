<script setup lang="ts">
import PageContainer from '@/shared/helper-ui/PageContainer.vue'
import AreaCard from '@/shared/helper-ui/AreaCard.vue'
import HolidayCalendarArea from '@/features/project-admin/holiday/ui/components/HolidayCalendarArea.vue'
</script>

<template>
  <PageContainer title="휴일관리">
    <AreaCard title="프로젝트 캘린더" height="flex-1" min-height="600px">
      <div class="p-4">
        <HolidayCalendarArea />
      </div>
    </AreaCard>
  </PageContainer>
</template>
