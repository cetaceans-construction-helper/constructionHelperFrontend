<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Sun, Moon } from 'lucide-vue-next'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRouter, useRoute } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import { useAuthStore } from '@/stores/auth'
import { useProjectStore } from '@/stores/project'
import { projectApi } from '@/api/project'
import type { Project } from '@/types/project'

const router = useRouter()
const route = useRoute()
const themeStore = useThemeStore()
const authStore = useAuthStore()
const projectStore = useProjectStore()

// Section 정의 (1단계 구조)
const sections = [
  { id: 'dashboard', label: '대시보드', path: '/helper/dashboard' },
  { id: 'process', label: '공정관리', path: '/helper/schedule' },
  { id: 'material', label: '자재관리', path: '/helper/material/invoice' },
  { id: 'safety', label: '안전관리', path: '/helper/safety' },
  { id: 'document', label: '문서관리', path: '/helper/document/manager' },
  { id: 'utility', label: '유용한 기능', path: '/helper/functions' },
  { id: 'admin', label: '관리자', path: '/helper/admin' },
]

// 각 Section별 Menu 정의 (2단계 구조)
const menusBySection: Record<string, { id: string; label: string; path: string }[]> = {
  process: [{ id: 'schedule', label: '공정표', path: '/helper/schedule' }],
  material: [
    { id: 'invoice', label: '송장입력', path: '/helper/material/invoice' },
    { id: 'list', label: '자재목록', path: '/helper/material/list' },
  ],
  safety: [{ id: 'placeholder', label: '(구현예정)', path: '/helper/safety' }],
  document: [
    { id: 'manager', label: '문서관리', path: '/helper/document/manager' },
    { id: 'daily-report', label: '일일작업일보', path: '/helper/document/daily-report' },
    {
      id: 'inspection',
      label: '자재반입검수요청서',
      path: '/helper/document/material-inspection',
    },
  ],
  utility: [{ id: 'placeholder', label: '(구현예정)', path: '/helper/functions' }],
  admin: [{ id: 'master-data', label: '기준정보 관리', path: '/helper/admin' }],
}

// URL 기반으로 현재 Section 감지
const currentSection = computed(() => {
  const path = route.path
  if (path.startsWith('/helper/dashboard')) return 'dashboard'
  if (path.startsWith('/helper/schedule')) return 'process'
  if (path.startsWith('/helper/material')) return 'material'
  if (path.startsWith('/helper/safety')) return 'safety'
  if (path.startsWith('/helper/document')) return 'document'
  if (path.startsWith('/helper/functions')) return 'utility'
  if (path.startsWith('/helper/admin')) return 'admin'
  return 'dashboard'
})

// 프로젝트 목록
const projects = ref<Project[]>([])
const selectedProject = computed({
  get: () => projectStore.selectedProjectId,
  set: (val) => val && projectStore.setProject(val)
})
const isLoadingProjects = ref(false)

onMounted(async () => {
  isLoadingProjects.value = true
  try {
    projects.value = await projectApi.getProjects()
    // 저장된 프로젝트가 없거나 유효하지 않은 경우에만 첫 번째 프로젝트 선택
    const savedProjectId = projectStore.selectedProjectId
    const isValidProject = projects.value.some(p => p.id === savedProjectId)

    if (!savedProjectId || !isValidProject) {
      const firstProject = projects.value[0]
      if (firstProject) {
        projectStore.setProject(firstProject.id)
      }
    }
  } catch (e) {
    console.error('Failed to load projects:', e)
  } finally {
    isLoadingProjects.value = false
  }
})

// 프로젝트 변경 시 페이지 새로고침
watch(
  () => projectStore.selectedProjectId,
  (newVal, oldVal) => {
    if (oldVal && newVal && oldVal !== newVal) {
      router.go(0)
    }
  }
)

// 현재 Section의 Menu 목록
const currentMenus = computed(() => menusBySection[currentSection.value] || [])

// Section 변경 시 해당 Section의 첫 번째 Menu로 이동
const selectSection = (sectionId: string) => {
  const section = sections.find((s) => s.id === sectionId)
  if (section) {
    router.push(section.path)
  }
}

// 메뉴 클릭 핸들러
const handleMenuClick = (path: string) => {
  router.push(path)
  closeSidebar()
}

// 사이드바 닫기
const closeSidebar = () => {
  const sidebar = document.querySelector('[data-slot="sidebar"][data-state="expanded"]')
  if (sidebar) {
    const triggerButton = document.querySelector('[data-sidebar="trigger"]') as HTMLButtonElement
    triggerButton?.click()
  }
}

// 로그아웃
const handleLogout = async () => {
  await authStore.logout()
  router.push('/')
}
</script>

<template>
  <SidebarProvider :default-open="false">
    <div class="min-h-screen flex flex-col w-full">
      <!-- Header with Sections (1단계: Section) -->
      <header class="border-b border-border bg-background">
        <div class="flex items-center justify-between p-2">
          <!-- Logo -->
          <div class="flex items-center gap-2 px-2">
            <span class="font-semibold hidden md:inline">건설업무도우미</span>
          </div>

          <!-- Section Buttons (Segmented Design) -->
          <div class="flex-1 flex justify-center">
            <div class="inline-flex rounded-lg bg-muted p-1">
              <Button
                v-for="section in sections"
                :key="section.id"
                :variant="currentSection === section.id ? 'default' : 'ghost'"
                size="sm"
                @click="selectSection(section.id)"
                class="rounded-md"
              >
                {{ section.label }}
              </Button>
            </div>
          </div>

          <!-- User Actions -->
          <div class="flex items-center gap-2">
            <Select v-model="selectedProject" :disabled="isLoadingProjects">
              <SelectTrigger class="w-48">
                <SelectValue :placeholder="isLoadingProjects ? '로딩 중...' : '프로젝트 선택'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="project in projects" :key="project.id" :value="project.id">
                  {{ project.projectName }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" @click="handleLogout">로그아웃</Button>
          </div>
        </div>
      </header>

      <!-- Main Content Area -->
      <div class="flex flex-1 relative">
        <!-- Floating Sidebar (2단계: Menu) -->
        <Sidebar collapsible="offcanvas" class="border-r shadow-lg">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>{{
                sections.find((s) => s.id === currentSection)?.label
              }}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem v-for="menu in currentMenus" :key="menu.id">
                    <SidebarMenuButton
                      :is-active="$route.path === menu.path"
                      @click="handleMenuClick(menu.path)"
                    >
                      <span>{{ menu.label }}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter class="flex justify-center py-2">
            <Button variant="ghost" size="icon" @click="themeStore.toggleTheme" class="h-12 w-12">
              <Sun v-if="!themeStore.isDark" class="size-6" />
              <Moon v-else class="size-6" />
            </Button>
          </SidebarFooter>
        </Sidebar>

        <!-- Toggle Button - 사이드바 외부에 고정 -->
        <SidebarTrigger
          class="fixed top-[60px] z-20 bg-background border border-border rounded-md transition-[left] duration-200 ease-linear left-[calc(var(--sidebar-width)+4px)] peer-data-[state=collapsed]:left-[4px] h-11 w-11 [&_svg]:size-6"
        />

        <!-- Content Area - RouterView로 각 페이지 렌더링 -->
        <div class="flex-1 w-full flex flex-col" @click="closeSidebar">
          <div class="p-4 flex-1 flex flex-col">
            <RouterView />
          </div>
        </div>
      </div>
    </div>
  </SidebarProvider>
</template>
