<script setup lang="ts">
import PageContainer from '@/components/helper/PageContainer.vue'
import AreaCard from '@/components/helper/AreaCard.vue'
import AttendanceTab from '@/features/attendance/ui/components/AttendanceTab.vue'
</script>

<template>
  <PageContainer title="출역입력">
    <AreaCard height="flex-1">
      <AttendanceTab />
    </AreaCard>
  </PageContainer>
</template>
