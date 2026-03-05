<script setup lang="ts">
import PageContainer from '@/components/helper/PageContainer.vue'
import AreaCard from '@/components/helper/AreaCard.vue'
import HolidayCalendarArea from './components/HolidayCalendarArea.vue'
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
