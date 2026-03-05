<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth/public'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/shared/ui/sidebar'
import CompanyManagementArea from '@/features/system-admin/ui/components/CompanyManagementArea.vue'
import ProjectManagementArea from '@/features/system-admin/ui/components/ProjectManagementArea.vue'
import RoleManagementArea from '@/features/system-admin/ui/components/RoleManagementArea.vue'
import MappingManagementArea from '@/features/system-admin/ui/components/MappingManagementArea.vue'
import WorkerManagementArea from '@/features/system-admin/ui/components/WorkerManagementArea.vue'

const router = useRouter()
const authStore = useAuthStore()

type MenuId = 'project' | 'worker' | 'company' | 'common'

const menus: { id: MenuId; label: string }[] = [
  { id: 'project', label: '프로젝트관리' },
  { id: 'worker', label: '작업자관리' },
  { id: 'company', label: '회사관리' },
  { id: 'common', label: '공용 설정' },
]

const activeMenu = ref<MenuId>('project')

const handleLogout = async () => {
  await authStore.logout()
  router.push('/')
}

const handleTabKey = (e: KeyboardEvent) => {
  if (e.key !== 'Tab') return
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

  e.preventDefault()
  const currentIndex = menus.findIndex((m) => m.id === activeMenu.value)
  const nextIndex = e.shiftKey
    ? (currentIndex - 1 + menus.length) % menus.length
    : (currentIndex + 1) % menus.length
  const next = menus[nextIndex]
  if (next) activeMenu.value = next.id
}

onMounted(() => {
  window.addEventListener('keydown', handleTabKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleTabKey)
})
</script>

<template>
  <SidebarProvider :default-open="true">
    <div class="min-h-screen flex flex-col w-full bg-background">
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

      <!-- Main: Sidebar + Content -->
      <div class="flex flex-1">
        <Sidebar collapsible="none" class="border-r">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem v-for="menu in menus" :key="menu.id">
                    <SidebarMenuButton
                      :is-active="activeMenu === menu.id"
                      @click="activeMenu = menu.id"
                    >
                      <span>{{ menu.label }}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <!-- Content -->
        <main class="flex-1 p-6 space-y-6">
          <template v-if="activeMenu === 'project'">
            <Card>
              <CardHeader>
                <CardTitle>프로젝트 관리</CardTitle>
              </CardHeader>
              <CardContent>
                <ProjectManagementArea />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>매핑 관리</CardTitle>
              </CardHeader>
              <CardContent>
                <MappingManagementArea />
              </CardContent>
            </Card>
          </template>

          <template v-if="activeMenu === 'worker'">
            <Card>
              <CardHeader>
                <CardTitle>작업자 관리</CardTitle>
              </CardHeader>
              <CardContent>
                <WorkerManagementArea />
              </CardContent>
            </Card>
          </template>

          <template v-if="activeMenu === 'company'">
            <Card>
              <CardHeader>
                <CardTitle>회사 관리</CardTitle>
              </CardHeader>
              <CardContent>
                <CompanyManagementArea />
              </CardContent>
            </Card>
          </template>

          <template v-if="activeMenu === 'common'">
            <Card>
              <CardHeader>
                <CardTitle>역할 관리</CardTitle>
              </CardHeader>
              <CardContent>
                <RoleManagementArea />
              </CardContent>
            </Card>
          </template>
        </main>
      </div>
    </div>
  </SidebarProvider>
</template>
