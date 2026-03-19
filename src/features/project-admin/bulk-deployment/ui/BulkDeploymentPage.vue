<script setup lang="ts">
import PageContainer from '@/shared/helper-ui/PageContainer.vue'
import AreaCard from '@/shared/helper-ui/AreaCard.vue'
import BulkDeploymentArea from '@/features/project-admin/bulk-deployment/ui/components/BulkDeploymentArea.vue'
</script>

<template>
  <PageContainer title="대량 출역 입력">
    <AreaCard title="출역인원 / 장비 대량 입력" height="flex-1" min-height="400px">
      <div class="p-4">
        <BulkDeploymentArea />
      </div>
    </AreaCard>
  </PageContainer>
</template>
