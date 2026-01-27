<script setup lang="ts">
import PageContainer from '@/components/helper/PageContainer.vue'
import AreaCard from '@/components/helper/AreaCard.vue'

const tabs = [
  { value: 'input', label: '입력' },
  { value: 'history', label: '이력' },
  { value: 'summary', label: '요약' },
]
</script>

<template>
  <PageContainer title="송장입력">
    <AreaCard 
      height="flex-[0.8]"
      min-height="500px"
      :has-tabs="true"
      :tabs="tabs"
      default-tab="input">
      
      <template #tab-input>
        <div class="flex-1 flex items-center justify-center border border-dashed border-border rounded-lg">
          <p class="text-muted-foreground">송장 입력 폼</p>
        </div>
      </template>
      
      <template #tab-history>
        <div class="flex-1 flex items-center justify-center border border-dashed border-border rounded-lg">
          <p class="text-muted-foreground">송장 입력 이력</p>
        </div>
      </template>

      <template #tab-summary>
        <div class="flex-1 flex items-center justify-center border border-dashed border-border rounded-lg">
          <p class="text-muted-foreground">송장 입력 요약</p>
        </div>
      </template>
    </AreaCard>
  </PageContainer>
</template>
