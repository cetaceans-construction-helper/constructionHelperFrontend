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
import LaborCountBox from '@/features/attendance/ui/components/LaborCountBox.vue'
import { useAttendance } from '@/features/attendance/view-model/useAttendance'

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
  isSubmitting,
  contractors,
  workTypeBoxes,
  selectCompany,
  getCount,
  incrementCount,
  decrementCount,
  setCount,
  submitAttendance,
  init,
} = useAttendance(dateRef)

watch(() => props.open, async (opened) => {
  if (opened) {
    await init()
  }
})

async function handleSubmit() {
  const success = await submitAttendance()
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
          출역인원 입력
          <ReferenceEditTrigger type="labor" @refresh="init" />
        </DialogTitle>
      </DialogHeader>

      <div class="overflow-y-auto max-h-[60vh] py-2">
        <div v-if="workTypeBoxes.length === 0" class="flex items-center justify-center py-8">
          <p class="text-muted-foreground text-sm">오늘 출역 대상 업체가 없습니다.</p>
        </div>

        <div v-else class="space-y-4">
          <LaborCountBox
            v-for="box in workTypeBoxes"
            :key="box.id"
            :box-id="box.id"
            :company-id="box.companyId"
            :company-name="box.companyName"
            :work-type-name="box.workTypeName"
            :labor-types="box.laborTypes"
            :is-loading="box.isLoading"
            :contractors="contractors"
            :get-count="getCount"
            @select-company="selectCompany"
            @increment="incrementCount"
            @decrement="decrementCount"
            @set-count="setCount"
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          :disabled="workTypeBoxes.length === 0 || isSubmitting"
          @click="handleSubmit"
        >
          {{ isSubmitting ? '저장 중...' : '제출' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
