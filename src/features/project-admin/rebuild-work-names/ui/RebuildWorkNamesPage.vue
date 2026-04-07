<script setup lang="ts">
import { ref } from 'vue'
import PageContainer from '@/shared/helper-ui/PageContainer.vue'
import AreaCard from '@/shared/helper-ui/AreaCard.vue'
import { Button } from '@/shared/ui/button'
import { workApi } from '@/shared/network-core/apis/work'

const isLoading = ref(false)
const result = ref<string | null>(null)
const error = ref<string | null>(null)

async function handleRebuild() {
  isLoading.value = true
  result.value = null
  error.value = null
  try {
    const response = await workApi.rebuildAllWorkNames()
    result.value = response || '공정명 재생성이 완료되었습니다.'
  } catch (err: unknown) {
    console.error('공정명 재생성 실패:', err)
    const e = err as { response?: { data?: { message?: string } }; message?: string }
    error.value = e.response?.data?.message || e.message || '알 수 없는 오류가 발생했습니다.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <PageContainer title="공정명 재생성 (임시)">
    <AreaCard height="flex-1" min-height="300px">
      <div class="space-y-4">
        <p class="text-sm text-muted-foreground">
          모든 공정(Work)의 이름을 백엔드 규칙에 따라 다시 생성합니다.
          Section/Usage 비활성화 후 공정명을 갱신하려면 이 버튼을 눌러주세요.
        </p>

        <Button :disabled="isLoading" @click="handleRebuild">
          {{ isLoading ? '재생성 중...' : '공정명 재생성' }}
        </Button>

        <div v-if="result" class="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p class="text-sm text-green-700">{{ result }}</p>
        </div>

        <div v-if="error" class="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p class="text-sm text-red-700">{{ error }}</p>
        </div>
      </div>
    </AreaCard>
  </PageContainer>
</template>
