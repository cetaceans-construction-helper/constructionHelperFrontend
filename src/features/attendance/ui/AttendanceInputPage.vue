<script setup lang="ts">
import PageContainer from '@/shared/helper-ui/PageContainer.vue'
import AreaCard from '@/shared/helper-ui/AreaCard.vue'
import AttendanceTab from '@/features/attendance/ui/components/AttendanceTab.vue'
</script>

<template>
  <PageContainer title="출역입력">
    <AreaCard height="flex-1">
      <AttendanceTab />
    </AreaCard>
  </PageContainer>
</template>
