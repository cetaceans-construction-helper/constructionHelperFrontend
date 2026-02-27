<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import CompanyManagementArea from './components/CompanyManagementArea.vue'
import ProjectManagementArea from './components/ProjectManagementArea.vue'
import RoleManagementArea from './components/RoleManagementArea.vue'
import MappingManagementArea from './components/MappingManagementArea.vue'
import WorkerManagementArea from './components/WorkerManagementArea.vue'

const router = useRouter()
const authStore = useAuthStore()

const handleLogout = async () => {
  await authStore.logout()
  router.push('/')
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Header -->
    <header class="sticky top-0 z-10 border-b border-border bg-background p-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">시스템 관리자</h1>
        <div class="flex items-center gap-4">
          <span class="text-sm text-muted-foreground">
            {{ authStore.user?.userName }} ({{ authStore.user?.systemRole }})
          </span>
          <Button variant="outline" @click="handleLogout">로그아웃</Button>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="p-6 space-y-6">
      <!-- 회사 관리 -->
      <Card>
        <CardHeader>
          <CardTitle>회사 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <CompanyManagementArea />
        </CardContent>
      </Card>

      <!-- 프로젝트 관리 -->
      <Card>
        <CardHeader>
          <CardTitle>프로젝트 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectManagementArea />
        </CardContent>
      </Card>

      <!-- 역할 관리 -->
      <Card>
        <CardHeader>
          <CardTitle>역할 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <RoleManagementArea />
        </CardContent>
      </Card>

      <!-- 매핑 관리 -->
      <Card>
        <CardHeader>
          <CardTitle>매핑 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <MappingManagementArea />
        </CardContent>
      </Card>

      <!-- 작업자 관리 -->
      <Card>
        <CardHeader>
          <CardTitle>작업자 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkerManagementArea />
        </CardContent>
      </Card>
    </main>
  </div>
</template>
