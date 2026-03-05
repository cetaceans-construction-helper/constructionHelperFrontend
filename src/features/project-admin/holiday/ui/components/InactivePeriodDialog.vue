<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

const props = defineProps<{
  mode: 'set' | 'release'
  isSubmitting?: boolean
}>()

const open = defineModel<boolean>('open', { required: true })

const emit = defineEmits<{
  submit: [payload: { startDate: string; endDate: string; reason: string }]
}>()

const startDate = ref('')
const endDate = ref('')
const reason = ref('')

// 다이얼로그 열릴 때 폼 초기화
watch(open, (isOpen) => {
  if (isOpen) {
    startDate.value = ''
    endDate.value = ''
    reason.value = ''
  }
})

const isSubmitDisabled = computed(() => {
  if (!startDate.value || !endDate.value) return true
  if (props.mode === 'set' && !reason.value.trim()) return true
  return false
})

function handleSubmit() {
  emit('submit', {
    startDate: startDate.value,
    endDate: endDate.value,
    reason: props.mode === 'set' ? reason.value.trim() : '',
  })
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-[420px]">
      <DialogHeader>
        <DialogTitle>
          {{ mode === 'set' ? '현장 비활성일 지정' : '현장 비활성일 해제' }}
        </DialogTitle>
        <DialogDescription>
          {{
            mode === 'set'
              ? '비활성화할 기간과 사유를 입력하세요.'
              : '활성화할 기간을 입력하세요.'
          }}
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4 py-2">
        <div class="space-y-2">
          <Label>시작일</Label>
          <Input v-model="startDate" type="date" />
        </div>
        <div class="space-y-2">
          <Label>종료일</Label>
          <Input v-model="endDate" type="date" />
        </div>
        <div v-if="mode === 'set'" class="space-y-2">
          <Label>사유 <span class="text-destructive">*</span></Label>
          <Input v-model="reason" placeholder="비활성 사유를 입력하세요" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" @click="open = false">취소</Button>
        <Button
          :disabled="isSubmitDisabled || isSubmitting"
          @click="handleSubmit"
        >
          {{ isSubmitting ? '처리 중...' : mode === 'set' ? '지정' : '해제' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
