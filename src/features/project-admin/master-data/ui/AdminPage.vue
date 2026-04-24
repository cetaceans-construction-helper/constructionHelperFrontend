<script setup lang="ts">
import PageContainer from '@/shared/helper-ui/PageContainer.vue'
import AreaCard from '@/shared/helper-ui/AreaCard.vue'
import { Separator } from '@/shared/ui/separator'
import LocationMasterArea from '@/features/project-admin/master-data/ui/components/LocationMasterArea.vue'
import ComponentCodeArea from '@/features/project-admin/master-data/ui/components/ComponentCodeArea.vue'
import MaterialMasterArea from '@/features/project-admin/master-data/ui/components/MaterialMasterArea.vue'
</script>

<template>
  <PageContainer title="기준정보 관리">
    <AreaCard title="작업관련" height="flex-1" min-height="600px">
      <div class="p-4 space-y-6">
        <LocationMasterArea />
        <Separator />
        <ComponentCodeArea />
        <Separator />
        <MaterialMasterArea />
      </div>
    </AreaCard>
  </PageContainer>
</template>
