<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { useRouter } from 'vue-router'

const router = useRouter()

const navigateToLogin = () => {
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <header class="flex items-center justify-between p-4 border-b border-border">
      <div class="flex items-center gap-2">
        <span class="text-xl font-bold">건설업무도우미</span>
      </div>
      <Button @click="navigateToLogin">로그인</Button>
    </header>

    <!-- Main Content -->
    <main class="flex-1 flex items-center justify-center">
      <div class="text-center space-y-4">
        <h1 class="text-4xl font-bold">건설업무도우미</h1>
        <p class="text-muted-foreground">효율적인 건설 프로젝트 관리를 위한 솔루션</p>
      </div>
    </main>

    <!-- Footer / Contact Us -->
    <footer class="p-6 border-t border-border">
      <div class="max-w-4xl mx-auto">
        <h2 class="text-lg font-semibold mb-4">Contact Us</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
          <div>
            <p class="font-medium text-foreground">이메일</p>
            <p>master@cetaceans.kr</p>
          </div>
          <div>
            <p class="font-medium text-foreground">전화</p>
            <p>010-9912-3292</p>
          </div>
          <div>
            <p class="font-medium text-foreground">주소</p>
            <p>서울특별시 양천구 목동동로 202, 상가 205호</p>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
