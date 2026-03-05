<script setup lang="ts">
import PageContainer from '@/components/helper/PageContainer.vue'
import AreaCard from '@/components/helper/AreaCard.vue'
import { Separator } from '@/components/ui/separator'
import WorkClassificationArea from './components/WorkClassificationArea.vue'
import MaterialMasterArea from './components/MaterialMasterArea.vue'
import LocationMasterArea from './components/LocationMasterArea.vue'
import ComponentCodeArea from './components/ComponentCodeArea.vue'
</script>

<template>
  <PageContainer title="기준정보 관리">
    <AreaCard title="작업관련" height="flex-1" min-height="600px">
      <div class="p-4 space-y-6">
        <WorkClassificationArea />
        <Separator />
        <MaterialMasterArea />
        <Separator />
        <LocationMasterArea />
        <Separator />
        <ComponentCodeArea />
      </div>
    </AreaCard>
  </PageContainer>
</template>
