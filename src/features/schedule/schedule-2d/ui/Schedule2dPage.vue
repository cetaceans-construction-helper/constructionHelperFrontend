<script setup lang="ts">
import PageContainer from '@/shared/helper-ui/PageContainer.vue'
import AreaCard from '@/shared/helper-ui/AreaCard.vue'
import Viewer2dArea from './components/Viewer2dArea.vue'
</script>

<template>
  <PageContainer title="2D공정표">
    <AreaCard height="flex-1" min-height="800px">
      <Viewer2dArea />
    </AreaCard>
  </PageContainer>
</template>
