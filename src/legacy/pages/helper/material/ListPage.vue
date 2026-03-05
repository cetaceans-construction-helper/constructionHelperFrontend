<script setup lang="ts">
import PageContainer from '@/components/helper/PageContainer.vue'
import AreaCard from '@/components/helper/AreaCard.vue'
import AttendanceTab from './components/AttendanceTab.vue'

const tabs = [
  { value: 'attendance', label: '출역관리' },
  { value: 'register', label: '작업자 등록' },
]
</script>

<template>
  <PageContainer title="출역관리">
    <AreaCard
      height="flex-1"
      :has-tabs="true"
      :tabs="tabs"
      default-tab="attendance"
    >
      <template #tab-attendance>
        <AttendanceTab />
      </template>
      <template #tab-register>
        <div class="flex-1 flex items-center justify-center border border-dashed border-border rounded-lg">
          <p class="text-muted-foreground">작업자 등록 (구현 예정)</p>
        </div>
      </template>
    </AreaCard>
  </PageContainer>
</template>
