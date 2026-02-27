<script setup lang="ts">
import PageContainer from '@/components/helper/PageContainer.vue'
import AreaCard from '@/components/helper/AreaCard.vue'
import MirSettingArea from './components/MirSettingArea.vue'
</script>

<template>
  <PageContainer title="문서 설정">
    <AreaCard title="MIR (자재검수요청서)" height="flex-1" min-height="600px">
      <div class="p-4">
        <MirSettingArea />
      </div>
    </AreaCard>
  </PageContainer>
</template>
