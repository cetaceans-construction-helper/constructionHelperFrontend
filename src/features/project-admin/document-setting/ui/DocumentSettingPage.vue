<script setup lang="ts">
import PageContainer from '@/shared/helper-ui/PageContainer.vue'
import AreaCard from '@/shared/helper-ui/AreaCard.vue'
import MirSettingArea from '@/features/project-admin/document-setting/ui/components/MirSettingArea.vue'
</script>

<template>
  <PageContainer title="자재검수요청서">
    <AreaCard height="flex-1" min-height="600px">
      <div class="p-4">
        <MirSettingArea />
      </div>
    </AreaCard>
  </PageContainer>
</template>
