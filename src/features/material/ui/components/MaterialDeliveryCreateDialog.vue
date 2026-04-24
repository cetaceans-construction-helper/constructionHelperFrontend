<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Input } from '@/shared/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog'
import { materialOrderApi } from '@/features/material/infra/material-order-api'
import { analyticsClient } from '@/shared/analytics/analyticsClient'

const MAX_IMAGES = 10

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'submitted', deliveryId: number): void
}>()

const isSaving = ref(false)
const application = ref('')
const workType = ref('')
const images = ref<File[]>([])
const previewUrls = ref<string[]>([])

function revokeUrls(urls: string[]) {
  urls.forEach((u) => URL.revokeObjectURL(u))
}

function buildPreviewUrls(files: File[]): string[] {
  return files.map((f) => URL.createObjectURL(f))
}

watch(images, (files, _, onCleanup) => {
  const urls = buildPreviewUrls(files)
  previewUrls.value = urls
  onCleanup(() => revokeUrls(urls))
})

watch(() => props.open, (opened) => {
  if (opened) {
    application.value = ''
    workType.value = ''
    images.value = []
  }
})

onUnmounted(() => {
  revokeUrls(previewUrls.value)
})

function onImagesChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  const imageFiles = files.filter((f) => f.type.startsWith('image/'))
  if (imageFiles.length < files.length) {
    alert('이미지 파일만 업로드 가능합니다.')
  }
  images.value = imageFiles.slice(0, MAX_IMAGES)
  input.value = ''
}

function removeImage(index: number) {
  images.value = images.value.filter((_, i) => i !== index)
}

async function handleSave() {
  if (images.value.length === 0) {
    alert('사진을 1장 이상 선택해주세요.')
    return
  }
  if (images.value.length > MAX_IMAGES) {
    alert(`사진은 최대 ${MAX_IMAGES}장까지 업로드 가능합니다.`)
    return
  }

  isSaving.value = true
  try {
    const result = await materialOrderApi.createMaterialDelivery({
      images: images.value,
      application: application.value.trim() || undefined,
      workTypeName: workType.value.trim() || undefined,
    })
    analyticsClient.trackAction('material_delivery', 'create_delivery', 'success')
    emit('update:open', false)
    emit('submitted', result.deliveryId)
  } catch (error: unknown) {
    console.error('반입자재 생성 실패:', error)
    analyticsClient.trackAction('material_delivery', 'create_delivery', 'fail')
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-[520px]">
      <DialogHeader>
        <DialogTitle>반입자재 생성</DialogTitle>
      </DialogHeader>

      <div class="space-y-5 py-2">
        <!-- 사진 업로드 -->
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <Label>사진</Label>
            <span class="text-xs text-muted-foreground">
              1~{{ MAX_IMAGES }}장, 다시 선택 시 교체됩니다
            </span>
          </div>
          <input
            type="file"
            multiple
            accept="image/*"
            class="block w-full text-sm text-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-input file:bg-muted file:text-sm file:font-medium hover:file:bg-muted/80 cursor-pointer"
            @change="onImagesChange"
          />
          <div v-if="images.length > 0" class="flex flex-wrap gap-2 mt-1">
            <div
              v-for="(_, i) in images"
              :key="i"
              class="relative w-[120px] h-[120px] rounded border border-border overflow-hidden group"
            >
              <img
                :src="previewUrls[i]"
                class="w-full h-full object-cover"
              />
              <button
                type="button"
                class="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                @click="removeImage(i)"
              >
                ✕
              </button>
            </div>
          </div>
          <p class="text-xs text-muted-foreground">
            선택 {{ images.length }} / {{ MAX_IMAGES }}장
          </p>
        </div>

        <!-- 사용부위 -->
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <Label>사용부위</Label>
            <span class="text-xs text-muted-foreground">선택 입력 (예: 지하1층 기둥)</span>
          </div>
          <Input
            v-model="application"
            placeholder="사용부위를 입력하세요"
            :disabled="isSaving"
          />
        </div>

        <!-- 공종 -->
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <Label>공종</Label>
            <span class="text-xs text-muted-foreground">선택 입력</span>
          </div>
          <Input
            v-model="workType"
            placeholder="철콘, 금속, 방수"
            :disabled="isSaving"
          />
        </div>
      </div>

      <DialogFooter class="flex-col items-end gap-2">
        <div class="flex gap-2">
          <Button
            variant="outline"
            :disabled="isSaving"
            @click="emit('update:open', false)"
          >
            취소
          </Button>
          <Button :disabled="isSaving || images.length === 0" @click="handleSave">
            {{ isSaving ? '생성 중...' : '생성' }}
          </Button>
        </div>
        <p v-if="isSaving" class="text-sm text-muted-foreground">
          사진 분석에 시간이 걸릴 수 있습니다. 기다려주세요.
        </p>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
