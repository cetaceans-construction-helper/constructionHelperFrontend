<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const userEmail = ref('')
const userPassword = ref('')

onMounted(() => {
  authStore.clearError()
})

const handleLogin = async () => {
  try {
    await authStore.login({ userEmail: userEmail.value, userPassword: userPassword.value }) //로그인 잠시 해제

    // Redirect to intended destination or default to /helper/dashboard
    const redirect = route.query.redirect as string
    router.push(redirect || '/helper/dashboard')
  } catch {
    // Error is handled in store
  }
}

const goBack = () => {
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <Card class="w-full max-w-md">
      <CardHeader>
        <CardTitle class="text-2xl text-center">로그인</CardTitle>
        <CardDescription class="text-center">건설업무도우미에 로그인하세요</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div
          v-if="authStore.error && Object.keys(authStore.fieldErrors).length === 0"
          class="p-3 text-sm text-red-600 bg-red-50 rounded-md dark:bg-red-900/20 dark:text-red-400"
        >
          {{ authStore.error }}
        </div>

        <form class="space-y-4" @submit.prevent="handleLogin">
          <div class="space-y-2">
            <label class="text-sm font-medium">이메일</label>
            <Input
              v-model="userEmail"
              type="text"
              placeholder="이메일을 입력하세요"
              :disabled="authStore.isLoading"
            />
            <p v-if="authStore.fieldErrors.userEmail" class="text-sm text-red-500">
              {{ authStore.fieldErrors.userEmail }}
            </p>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">비밀번호</label>
            <Input
              v-model="userPassword"
              type="password"
              placeholder="비밀번호를 입력하세요"
              :disabled="authStore.isLoading"
            />
            <p v-if="authStore.fieldErrors.userPassword" class="text-sm text-red-500">
              {{ authStore.fieldErrors.userPassword }}
            </p>
          </div>
          <div class="flex flex-col gap-2 pt-4">
            <Button type="submit" class="w-full" :disabled="authStore.isLoading">
              {{ authStore.isLoading ? '로그인 중...' : '로그인' }}
            </Button>
            <Button variant="outline" type="button" class="w-full" @click="goBack">
              돌아가기
            </Button>
          </div>
        </form>

        <div class="text-center text-sm text-muted-foreground pt-2">
          계정이 없으신가요?
          <Button variant="link" class="px-1" @click="router.push('/signup')">
            회원가입
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
