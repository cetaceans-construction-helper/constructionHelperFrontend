<script setup lang="ts">
import PageContainer from '@/shared/helper-ui/PageContainer.vue'
import AreaCard from '@/shared/helper-ui/AreaCard.vue'
import MirSettingArea from '@/features/project-admin/document-setting/ui/components/MirSettingArea.vue'
import PromptManagementArea from '@/features/project-admin/document-setting/ui/components/PromptManagementArea.vue'
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
