<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/view-model/auth-store'
import { analyticsClient } from '@/shared/analytics/analyticsClient'

const router = useRouter()
const authStore = useAuthStore()

// 폼 필드
const userEmail = ref('')
const userPassword = ref('')
const userPasswordConfirm = ref('')
const userName = ref('')
const phoneNumber = ref('')
const jobTitle = ref('')

onMounted(() => {
  authStore.clearError()
})

const handleSignup = async () => {
  analyticsClient.trackAuth('signup_attempt', undefined, {
    route_name: 'signup',
  })

  try {
    await authStore.signup({
      email: userEmail.value,
      password: userPassword.value,
      passwordConfirm: userPasswordConfirm.value,
      userName: userName.value,
      phoneNumber: phoneNumber.value,
      jobTitle: jobTitle.value || undefined,
    })

    // 회원가입 성공 - 로그인 페이지로 이동
    router.push({ path: '/login', query: { registered: 'true' } })
  } catch {
    // Error is handled in store
  }
}

const goBack = () => {
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <Card class="w-full max-w-md">
      <CardHeader>
        <CardTitle class="text-2xl text-center">회원가입</CardTitle>
        <CardDescription class="text-center">건설업무도우미 계정 생성</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div
          v-if="authStore.error && Object.keys(authStore.fieldErrors).length === 0"
          class="p-3 text-sm text-red-600 bg-red-50 rounded-md dark:bg-red-900/20 dark:text-red-400"
        >
          {{ authStore.error }}
        </div>

        <form class="space-y-4" @submit.prevent="handleSignup">
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
              placeholder="비밀번호를 입력하세요 (8자 이상)"
              :disabled="authStore.isLoading"
            />
            <p v-if="authStore.fieldErrors.userPassword" class="text-sm text-red-500">
              {{ authStore.fieldErrors.userPassword }}
            </p>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">비밀번호 확인</label>
            <Input
              v-model="userPasswordConfirm"
              type="password"
              placeholder="비밀번호를 다시 입력하세요"
              :disabled="authStore.isLoading"
            />
            <p v-if="authStore.fieldErrors.userPasswordConfirm" class="text-sm text-red-500">
              {{ authStore.fieldErrors.userPasswordConfirm }}
            </p>
            <p v-if="authStore.fieldErrors.passwordMatching" class="text-sm text-red-500">
              {{ authStore.fieldErrors.passwordMatching }}
            </p>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">이름</label>
            <Input
              v-model="userName"
              type="text"
              placeholder="이름을 입력하세요"
              :disabled="authStore.isLoading"
            />
            <p v-if="authStore.fieldErrors.userName" class="text-sm text-red-500">
              {{ authStore.fieldErrors.userName }}
            </p>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium"
              >전화번호 <span class="text-muted-foreground">(- 없이 입력)</span></label
            >
            <Input
              v-model="phoneNumber"
              type="text"
              placeholder="01012345678"
              :disabled="authStore.isLoading"
            />
            <p v-if="authStore.fieldErrors.phoneNumber" class="text-sm text-red-500">
              {{ authStore.fieldErrors.phoneNumber }}
            </p>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium"
              >직책 <span class="text-muted-foreground">(선택)</span></label
            >
            <Input
              v-model="jobTitle"
              type="text"
              placeholder="예: 현장소장, 공무팀장"
              :disabled="authStore.isLoading"
            />
            <p v-if="authStore.fieldErrors.jobTitle" class="text-sm text-red-500">
              {{ authStore.fieldErrors.jobTitle }}
            </p>
          </div>
          <div class="flex flex-col gap-2 pt-4">
            <Button type="submit" class="w-full" :disabled="authStore.isLoading">
              {{ authStore.isLoading ? '가입 중...' : '회원가입' }}
            </Button>
            <Button variant="outline" type="button" class="w-full" @click="goBack">
              돌아가기
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
