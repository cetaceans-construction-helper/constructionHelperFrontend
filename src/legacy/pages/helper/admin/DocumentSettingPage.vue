<script setup lang="ts">
import PageContainer from '@/components/helper/PageContainer.vue'
import AreaCard from '@/components/helper/AreaCard.vue'
import MirSettingArea from './components/MirSettingArea.vue'
import PromptManagementArea from './components/PromptManagementArea.vue'
</script>

<template>
  <PageContainer title="자재검수요청서">
    <AreaCard
      height="flex-1"
      min-height="600px"
      :has-tabs="true"
      :tabs="[
        { value: 'mir', label: 'MIR 설정' },
        { value: 'prompt', label: '프롬프트 관리' },
      ]"
      default-tab="mir"
    >
      <template #tab-mir>
        <div class="p-4">
          <MirSettingArea />
        </div>
      </template>
      <template #tab-prompt>
        <div class="p-4 h-full">
          <PromptManagementArea />
        </div>
      </template>
    </AreaCard>
  </PageContainer>
</template>
