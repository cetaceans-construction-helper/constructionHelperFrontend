<script setup lang="ts">
import { ref } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { workApi } from '@/api/work'
import { Check } from 'lucide-vue-next'

const emit = defineEmits<{
  updated: []
}>()

const isOpen = ref(false)
const photoId = ref(0)
const objectUrl = ref('')
const description = ref('')

function openDialog(photo: { photoId: number; description: string }, imgUrl: string) {
  photoId.value = photo.photoId
  objectUrl.value = imgUrl
  description.value = photo.description || ''
  isOpen.value = true
}

async function saveDescription() {
  try {
    await workApi.updateWorkPhoto(photoId.value, description.value)
    emit('updated')
  } catch (error: unknown) {
    console.error('설명 수정 실패:', error)
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  }
}

async function deletePhoto() {
  try {
    await workApi.deleteWorkPhoto(photoId.value)
    isOpen.value = false
    emit('updated')
  } catch (error: unknown) {
    console.error('사진 삭제 실패:', error)
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  }
}

defineExpose({ openDialog })
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>작업 사진</DialogTitle>
      </DialogHeader>

      <div class="space-y-4">
        <div class="w-full overflow-hidden rounded border border-border">
          <img
            :src="objectUrl"
            alt="작업 사진"
            class="w-full max-h-[60vh] object-contain"
          />
        </div>

        <div class="flex items-center gap-2">
          <Input
            v-model="description"
            placeholder="설명을 입력하세요"
            class="flex-1"
            @keyup.enter="saveDescription"
          />
          <Button variant="outline" size="sm" @click="saveDescription">
            <Check class="w-4 h-4" />
          </Button>
        </div>

        <div class="flex justify-end">
          <Button variant="destructive" size="sm" @click="deletePhoto">
            삭제
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>
