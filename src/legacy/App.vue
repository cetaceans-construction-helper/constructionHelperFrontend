<script setup lang="ts">
import { onMounted } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'

// 테마 스토어 초기화 (watch가 즉시 실행되어 dark 클래스 적용)
useThemeStore()

const authStore = useAuthStore()

// 앱 시작 시 토큰 갱신 시도 (HMR에서도 로그인 유지)
onMounted(async () => {
  try {
    await authApi.refresh()
    authStore.user = await authApi.me()
  } catch {
    // 실패하면 로그인 필요 (최초 방문 또는 Refresh Token 만료)
    authStore.user = null
  }
  authStore.isInitialized = true
})
</script>

<template>
  <RouterView />
</template>

<style scoped></style>
