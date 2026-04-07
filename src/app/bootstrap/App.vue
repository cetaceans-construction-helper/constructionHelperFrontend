<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '@/features/auth/public'

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
