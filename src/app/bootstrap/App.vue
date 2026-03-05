<script setup lang="ts">
import { onMounted } from 'vue'
import { useThemeStore } from '@/shared/theme/theme-store'
import { useAuthStore } from '@/features/auth/public'

// 테마 스토어 초기화 (watch가 즉시 실행되어 dark 클래스 적용)
useThemeStore()

const authStore = useAuthStore()

// 앱 시작 시 인증 상태 초기화
onMounted(async () => {
  await authStore.initialize()
})
</script>

<template>
  <RouterView />
</template>

<style scoped></style>
