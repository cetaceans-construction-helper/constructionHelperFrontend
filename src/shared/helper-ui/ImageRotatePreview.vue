<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { X, RotateCw } from 'lucide-vue-next'
import { rotateImageFile } from '@/shared/utils/rotateImage'

const props = withDefaults(
  defineProps<{
    modelValue: File[]
    removable?: boolean
    hint?: string
  }>(),
  { removable: false, hint: '사진을 눌러서 회전' },
)

const emit = defineEmits<{
  'update:modelValue': [files: File[]]
}>()

const previewUrls = ref<Map<number, string>>(new Map())
const rotatingIndex = ref<number | null>(null)

function isImage(file: File): boolean {
  return file.type.startsWith('image/')
}

const hasFiles = computed(() => props.modelValue.length > 0)

function rebuildUrls() {
  for (const url of previewUrls.value.values()) {
    URL.revokeObjectURL(url)
  }
  const map = new Map<number, string>()
  props.modelValue.forEach((file, i) => {
    if (isImage(file)) {
      map.set(i, URL.createObjectURL(file))
    }
  })
  previewUrls.value = map
}

watch(() => props.modelValue, rebuildUrls, { immediate: true, deep: true })

onUnmounted(() => {
  for (const url of previewUrls.value.values()) {
    URL.revokeObjectURL(url)
  }
})

async function rotateAt(index: number) {
  const file = props.modelValue[index]
  if (!file || !isImage(file)) return
  rotatingIndex.value = index
  try {
    const rotated = await rotateImageFile(file, 90)
    const newFiles = [...props.modelValue]
    newFiles[index] = rotated
    emit('update:modelValue', newFiles)
  } finally {
    rotatingIndex.value = null
  }
}

function removeAt(index: number) {
  const newFiles = props.modelValue.filter((_, i) => i !== index)
  emit('update:modelValue', newFiles)
}
</script>

<template>
  <div v-if="hasFiles" class="space-y-1.5">
    <p class="text-xs text-muted-foreground">{{ hint }}</p>
    <div class="flex flex-wrap gap-2">
      <div
        v-for="(file, index) in modelValue"
        :key="`${file.name}-${index}`"
        class="relative group"
      >
        <!-- 이미지 썸네일 -->
        <div
          v-if="isImage(file)"
          class="w-[120px] h-[120px] rounded border border-border overflow-hidden cursor-pointer"
          :class="{ 'opacity-50': rotatingIndex === index }"
          @click="rotateAt(index)"
        >
          <img
            :src="previewUrls.get(index)"
            :alt="file.name"
            class="w-full h-full object-cover"
          />
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <RotateCw class="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
          </div>
        </div>
        <!-- PDF 아이콘 -->
        <div
          v-else
          class="w-[120px] h-[120px] rounded border border-border flex flex-col items-center justify-center bg-muted/50"
        >
          <span class="text-lg">PDF</span>
          <span class="text-[10px] text-muted-foreground truncate max-w-[72px]">{{ file.name }}</span>
        </div>
        <!-- 삭제 버튼 -->
        <button
          v-if="removable"
          class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          @click.stop="removeAt(index)"
        >
          <X class="w-3 h-3" />
        </button>
      </div>
    </div>
  </div>
</template>
