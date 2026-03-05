<script setup lang="ts">
import PageContainer from '@/components/helper/PageContainer.vue'
import AreaCard from '@/components/helper/AreaCard.vue'
import { Separator } from '@/components/ui/separator'
import LaborTypeArea from './components/LaborTypeArea.vue'
import EquipmentMasterArea from './components/EquipmentMasterArea.vue'
</script>

<template>
  <PageContainer title="자원정보 관리">
    <AreaCard title="직종관리" height="flex-1" min-height="600px">
      <div class="p-4 space-y-6">
        <LaborTypeArea />
        <Separator />
        <EquipmentMasterArea />
      </div>
    </AreaCard>
  </PageContainer>
</template>
