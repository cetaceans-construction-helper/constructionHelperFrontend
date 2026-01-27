<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import SideTabBox from '@/components/helper/SideTabBox.vue'

defineProps<{
  isLoading: boolean
  loadProgress: number
  loadError: string | null
}>()

const emit = defineEmits<{
  rotateLeft: []
  rotateRight: []
}>()
</script>

<template>
  <div class="flex gap-4 h-full">
    <!-- 3D 뷰어 영역 -->
    <div class="relative flex-1 min-w-0">
      <div class="border border-border rounded-lg overflow-hidden w-full h-full">
        <slot name="canvas" />
      </div>

      <!-- 로딩 상태 표시 -->
      <div
        v-if="isLoading"
        class="absolute top-4 left-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg"
      >
        <p class="text-sm font-medium">3D 모델 로딩 중...</p>
        <div class="mt-2 w-48 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            class="h-full bg-blue-500 transition-all duration-300"
            :style="{ width: `${loadProgress}%` }"
          />
        </div>
        <p class="mt-1 text-xs text-gray-500">{{ loadProgress.toFixed(1) }}%</p>
      </div>

      <!-- 에러 표시 -->
      <div
        v-if="loadError"
        class="absolute top-4 left-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg shadow-lg"
      >
        <p class="text-sm font-medium text-red-600 dark:text-red-400">모델 로드 실패</p>
        <p class="mt-1 text-xs text-red-500 dark:text-red-300">{{ loadError }}</p>
      </div>

      <!-- 왼쪽 회전 버튼 -->
      <Button
        variant="outline"
        size="icon"
        class="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 h-16 w-16"
        @click="emit('rotateLeft')"
      >
        <ChevronLeft class="h-10 w-10" />
      </Button>

      <!-- 오른쪽 회전 버튼 -->
      <Button
        variant="outline"
        size="icon"
        class="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 h-16 w-16"
        @click="emit('rotateRight')"
      >
        <ChevronRight class="h-10 w-10" />
      </Button>

      <!-- 사용법 안내 -->
      <div class="absolute bottom-3 right-3 text-xs text-muted-foreground/60 bg-background/50 px-2 py-1 rounded">
        Ctrl + 휠: 줌
      </div>
    </div>

    <!-- 우측 탭 박스 -->
    <SideTabBox
      :tabs="[
        { value: 'info', label: '정보' },
        { value: 'schedule', label: '일정' },
        { value: 'material', label: '자재' }
      ]"
      default-tab="info"
    >
      <template #default="{ activeTab }">
        <div v-if="activeTab === 'info'" class="text-sm text-muted-foreground">
          객체를 선택하면 상세 정보가 표시됩니다.
        </div>
        <div v-else-if="activeTab === 'schedule'" class="text-sm text-muted-foreground">
          일정 정보가 표시됩니다.
        </div>
        <div v-else-if="activeTab === 'material'" class="text-sm text-muted-foreground">
          자재 정보가 표시됩니다.
        </div>
      </template>
    </SideTabBox>
  </div>
</template>
