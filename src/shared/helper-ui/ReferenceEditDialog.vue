<script setup lang="ts">
import { ref, watch, markRaw, type Component } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import {
  REFERENCE_EDIT_TITLES,
  REFERENCE_EDIT_WIDTHS,
  type ReferenceEditType,
} from '@/shared/helper-ui/reference-edit-panels/types'
import EquipmentPanel from '@/shared/helper-ui/reference-edit-panels/EquipmentPanel.vue'
import LaborTypePanel from '@/shared/helper-ui/reference-edit-panels/LaborTypePanel.vue'
import MaterialPanel from '@/shared/helper-ui/reference-edit-panels/MaterialPanel.vue'
import WorkClassificationPanel from '@/shared/helper-ui/reference-edit-panels/WorkClassificationPanel.vue'
import ComponentPanel from '@/shared/helper-ui/reference-edit-panels/ComponentPanel.vue'
import SingleReferencePanel from '@/shared/helper-ui/reference-edit-panels/SingleReferencePanel.vue'
import LocationPanel from '@/shared/helper-ui/reference-edit-panels/LocationPanel.vue'

const props = defineProps<{
  open: boolean
  type: ReferenceEditType
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  close: []
}>()

const PANEL_MAP: Record<ReferenceEditType, Component> = {
  equipment: markRaw(EquipmentPanel),
  labor: markRaw(LaborTypePanel),
  material: markRaw(MaterialPanel),
  'work-classification': markRaw(WorkClassificationPanel),
  component: markRaw(ComponentPanel),
  zone: markRaw(SingleReferencePanel),
  floor: markRaw(SingleReferencePanel),
  location: markRaw(LocationPanel),
}

const panelRef = ref<{ load: () => Promise<void> } | null>(null)

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      // nextTick 이후 panelRef가 바인딩되므로 약간 대기
      await new Promise((r) => setTimeout(r, 0))
      panelRef.value?.load()
    } else {
      emit('close')
    }
  },
)

function handleOpenChange(value: boolean) {
  emit('update:open', value)
}

const isSingleRef = (type: ReferenceEditType): type is 'zone' | 'floor' => {
  return type === 'zone' || type === 'floor'
}
</script>

<template>
  <Dialog :open="open" @update:open="handleOpenChange">
    <DialogContent :class="['max-h-[80vh] overflow-y-auto', REFERENCE_EDIT_WIDTHS[type]]">
      <DialogHeader>
        <DialogTitle>{{ REFERENCE_EDIT_TITLES[type] }}</DialogTitle>
      </DialogHeader>
      <component
        :is="PANEL_MAP[type]"
        ref="panelRef"
        v-bind="isSingleRef(type) ? { locationType: type } : {}"
      />
    </DialogContent>
  </Dialog>
</template>
