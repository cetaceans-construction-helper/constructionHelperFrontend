<script setup lang="ts">
import { computed, watch } from 'vue'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog'
import ReferenceEditTrigger from '@/shared/helper-ui/ReferenceEditTrigger.vue'
import EquipmentCountBox from '@/features/attendance/ui/components/EquipmentCountBox.vue'
import { useAttendance } from '@/features/attendance/view-model/useAttendance'
import { useEquipmentDeployment } from '@/features/attendance/view-model/useEquipmentDeployment'

const props = defineProps<{
  open: boolean
  selectedDate: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'submitted'): void
}>()

const dateRef = computed(() => props.selectedDate)

const {
  selectedDate,
  contractors,
  init: initAttendance,
} = useAttendance(dateRef)

const {
  isSubmittingEquipment,
  allEquipmentSpecs,
  equipmentBoxes,
  selectCompany,
  addSpecToBox,
  removeSpecFromBox,
  getCount,
  setCount,
  incrementCount,
  decrementCount,
  submitEquipmentDeployment,
  init: initEquipment,
} = useEquipmentDeployment(selectedDate, contractors)

watch(() => props.open, async (opened) => {
  if (opened) {
    await initAttendance()
    await initEquipment()
  }
})

async function handleSubmit() {
  const success = await submitEquipmentDeployment()
  if (success) {
    emit('submitted')
    emit('update:open', false)
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="max-w-lg max-h-[80vh] flex flex-col">
      <DialogHeader>
        <DialogTitle class="flex items-center gap-1">
          출역장비 입력
          <ReferenceEditTrigger type="equipment" @refresh="initEquipment" />
        </DialogTitle>
      </DialogHeader>

      <div class="overflow-y-auto max-h-[60vh] py-2">
        <div v-if="equipmentBoxes.length === 0" class="flex items-center justify-center py-8">
          <p class="text-muted-foreground text-sm">추가 버튼을 눌러 업체를 추가하세요.</p>
        </div>

        <div v-else class="space-y-4">
          <EquipmentCountBox
            v-for="box in equipmentBoxes"
            :key="box.id"
            :box-id="box.id"
            :company-id="box.companyId"
            :company-name="box.companyName"
            :work-type-name="box.workTypeName"
            :selected-specs="box.selectedSpecs"
            :all-equipment-specs="allEquipmentSpecs"
            :is-loading="box.isLoading"
            :contractors="contractors"
            :get-count="getCount"
            @select-company="selectCompany"
            @add-spec="addSpecToBox"
            @remove-spec="removeSpecFromBox"
            @increment-count="incrementCount"
            @decrement-count="decrementCount"
            @set-count="setCount"
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          :disabled="equipmentBoxes.length === 0 || isSubmittingEquipment"
          @click="handleSubmit"
        >
          {{ isSubmittingEquipment ? '저장 중...' : '제출' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
