<script setup lang="ts">
import PageContainer from '@/shared/helper-ui/PageContainer.vue'
import AreaCard from '@/shared/helper-ui/AreaCard.vue'
import { Separator } from '@/shared/ui/separator'
import LaborTypeArea from '@/features/project-admin/resource/ui/components/LaborTypeArea.vue'
import EquipmentMasterArea from '@/features/project-admin/resource/ui/components/EquipmentMasterArea.vue'
import MaterialMasterArea from '@/features/project-admin/master-data/ui/components/MaterialMasterArea.vue'
</script>

<template>
  <PageContainer title="자원정보 관리">
    <AreaCard title="자원정보관리" height="flex-1" min-height="600px">
      <div class="p-4 space-y-6">
        <LaborTypeArea />
        <Separator />
        <EquipmentMasterArea />
        <Separator />
        <MaterialMasterArea />
      </div>
    </AreaCard>
  </PageContainer>
</template>
