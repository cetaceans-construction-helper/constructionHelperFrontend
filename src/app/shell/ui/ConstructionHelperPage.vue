<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { Button } from '@/shared/ui/button'
import {
  Sun,
  Moon,
  Grid2x2,
  Box,
  UserPlus,
  UserCog,
  FileText,
  PackagePlus,
  PackageMinus,
  Package,
  Shield,
  FolderOpen,
  CalendarCheck,
  ClipboardCheck,
  Wrench,
  Database,
  Users,
  FileCheck,
  CalendarOff,
  Upload,
  RefreshCw,
} from 'lucide-vue-next'
import type { Component } from 'vue'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from '@/shared/ui/sidebar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { useRouter, useRoute } from 'vue-router'
import { useThemeStore } from '@/shared/theme/theme-store'
import { useAuthStore } from '@/features/auth/public'
import { useProjectStore } from '@/app/context/stores/project'
import { projectApi } from '@/shared/network-core/apis/project'
import { analyticsClient } from '@/shared/analytics/analyticsClient'
import type { Project } from '@/shared/network-core/contracts/project'

const router = useRouter()
const route = useRoute()
const themeStore = useThemeStore()
const authStore = useAuthStore()
const projectStore = useProjectStore()
type ProjectSelectionState = 'manual' | 'auto_initial' | 'auto_recovery'

// Section 정의 (1단계 구조)
const sections = [
  { id: 'dashboard', label: '대시보드', shortLabel: '대시', path: '/helper/dashboard' },
  { id: 'process', label: '공정관리', shortLabel: '공정', path: '/helper/schedule/2d' },
  { id: 'attendance', label: '출역관리', shortLabel: '출역', path: '/helper/attendance/input' },
  { id: 'material', label: '자재관리', shortLabel: '자재', path: '/helper/material/order' },
  { id: 'safety', label: '안전관리', shortLabel: '안전', path: '/helper/safety' },
  { id: 'document', label: '문서관리', shortLabel: '문서', path: '/helper/document/manager' },
  { id: 'utility', label: '유용한 기능', shortLabel: '기능', path: '/helper/functions' },
  { id: 'admin', label: '관리자', shortLabel: '관리', path: '/helper/admin' },
]

// 각 Section별 Menu 정의 (2단계 구조)
interface MenuItem {
  id: string
  label: string
  path: string
  icon: Component
}

const menusBySection: Record<string, MenuItem[]> = {
  process: [
    { id: '2d-schedule', label: '2D공정표', path: '/helper/schedule/2d', icon: Grid2x2 },
    { id: '3d-schedule', label: '3D공정표', path: '/helper/schedule/3d', icon: Box },
  ],
  attendance: [
    { id: 'attendance-input', label: '출역입력', path: '/helper/attendance/input', icon: UserPlus },
    { id: 'worker-register', label: '작업자등록', path: '/helper/attendance/register', icon: UserCog },
  ],
  material: [
    { id: 'order', label: '자재발주서', path: '/helper/material/order', icon: FileText },
    { id: 'incoming', label: '반입자재', path: '/helper/material/incoming', icon: PackagePlus },
    { id: 'outgoing', label: '반출자재', path: '/helper/material/outgoing', icon: PackageMinus },
    { id: 'remaining', label: '잔여자재', path: '/helper/material/remaining', icon: Package },
  ],
  safety: [{ id: 'placeholder', label: '(구현예정)', path: '/helper/safety', icon: Shield }],
  document: [
    { id: 'manager', label: '문서관리', path: '/helper/document/manager', icon: FolderOpen },
    { id: 'daily-report', label: '일일작업일보', path: '/helper/document/daily-report', icon: CalendarCheck },
    {
      id: 'inspection',
      label: '자재반입검수요청서',
      path: '/helper/document/material-inspection',
      icon: ClipboardCheck,
    },
  ],
  utility: [{ id: 'placeholder', label: '(구현예정)', path: '/helper/functions', icon: Wrench }],
  admin: [
    { id: 'master-data', label: '기준정보 관리', path: '/helper/admin', icon: Database },
    { id: 'resource-info', label: '자원정보 관리', path: '/helper/admin/resource', icon: Users },
    { id: 'document-setting', label: '자재검수요청서', path: '/helper/admin/document', icon: FileCheck },
    { id: 'daily-report-setting', label: '작업일보', path: '/helper/admin/daily-report', icon: FileText },
    { id: 'holiday', label: '휴일관리', path: '/helper/admin/holiday', icon: CalendarOff },
    { id: 'bulk-deployment', label: '대량 출역 입력', path: '/helper/admin/bulk-deployment', icon: Upload },
    { id: 'rebuild-work-names', label: '공정명 재생성 (임시)', path: '/helper/admin/rebuild-work-names', icon: RefreshCw },
  ],
}

// URL 기반으로 현재 Section 감지
const currentSection = computed(() => {
  const path = route.path
  if (path.startsWith('/helper/dashboard')) return 'dashboard'
  if (path.startsWith('/helper/schedule')) return 'process'
  if (path.startsWith('/helper/attendance')) return 'attendance'
  if (path.startsWith('/helper/material')) return 'material'
  if (path.startsWith('/helper/safety')) return 'safety'
  if (path.startsWith('/helper/document')) return 'document'
  if (path.startsWith('/helper/functions')) return 'utility'
  if (path.startsWith('/helper/admin')) return 'admin'
  return 'dashboard'
})

// 프로젝트 목록
const projects = ref<Project[]>([])

const selectProject = (projectId: string, selectionState: ProjectSelectionState) => {
  const previousProjectId = projectStore.selectedProjectId
  if (previousProjectId === projectId) return

  projectStore.setProject(projectId)
  analyticsClient.trackProjectSelected({
    projectId,
    previousProjectId,
    selectionState,
    routeName: route.name,
    routePath: route.fullPath,
  })
}

const selectedProject = computed({
  get: () => projectStore.selectedProjectId,
  set: (val) => val && selectProject(val, 'manual')
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
        selectProject(firstProject.id, savedProjectId ? 'auto_recovery' : 'auto_initial')
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

// Tab 키로 다음 메뉴 전환
const handleTabKey = (e: KeyboardEvent) => {
  if (e.key !== 'Tab') return
  const menus = currentMenus.value
  if (menus.length <= 1) return

  e.preventDefault()
  const currentIndex = menus.findIndex((m) => route.path === m.path)
  const nextIndex = e.shiftKey
    ? (currentIndex - 1 + menus.length) % menus.length
    : (currentIndex + 1) % menus.length
  const nextMenu = menus[nextIndex]
  if (nextMenu) router.push(nextMenu.path)
}

// ~ 키로 다음 섹션 이동 (Shift+~ 이전 섹션)
const handleTildeKey = (e: KeyboardEvent) => {
  if (e.key !== '`' && e.key !== '~' && e.key !== '₩') return
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

  e.preventDefault()
  const idx = sections.findIndex((s) => s.id === currentSection.value)
  const nextIdx = e.shiftKey
    ? (idx - 1 + sections.length) % sections.length
    : (idx + 1) % sections.length
  const next = sections[nextIdx]
  if (next) selectSection(next.id)
}

onMounted(() => {
  window.addEventListener('keydown', handleTabKey)
  window.addEventListener('keydown', handleTildeKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleTabKey)
  window.removeEventListener('keydown', handleTildeKey)
})
</script>

<template>
  <SidebarProvider :default-open="false">
    <div class="min-h-screen flex flex-col w-full">
      <!-- Header with Sections (1단계: Section) -->
      <header class="border-b border-border bg-background">
        <div class="flex items-center justify-between p-3">
          <!-- Logo -->
          <div class="flex items-center gap-3 px-3 shrink-0 hidden [@media(min-aspect-ratio:3/2)]:flex">
            <span class="font-semibold text-2xl whitespace-nowrap">건설업무도우미</span>
          </div>

          <!-- Section Buttons (Segmented Design) -->
          <div class="flex-1 flex justify-center min-w-0">
            <div class="inline-flex rounded-lg bg-muted p-1.5">
              <Button
                v-for="section in sections"
                :key="section.id"
                :variant="currentSection === section.id ? 'default' : 'ghost'"
                @click="selectSection(section.id)"
                class="rounded-md text-base px-2 [@media(min-aspect-ratio:1/1)]:px-4 py-2"
              >
                <span class="hidden [@media(min-aspect-ratio:1/1)]:inline">{{ section.label }}</span>
                <span class="[@media(min-aspect-ratio:1/1)]:hidden">{{ section.shortLabel }}</span>
              </Button>
            </div>
          </div>

          <!-- User Actions -->
          <div class="flex items-center gap-3 shrink-0">
            <Select v-model="selectedProject" :disabled="isLoadingProjects">
              <SelectTrigger class="w-40 [@media(min-aspect-ratio:3/2)]:w-72 h-10 text-base">
                <SelectValue :placeholder="isLoadingProjects ? '로딩 중...' : '프로젝트 선택'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="project in projects" :key="project.id" :value="project.id">
                  {{ project.projectName }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" @click="handleLogout" class="text-xs [@media(min-aspect-ratio:3/2)]:text-base px-2 py-1 [@media(min-aspect-ratio:3/2)]:px-4 [@media(min-aspect-ratio:3/2)]:py-2 shrink-0">로그아웃</Button>
          </div>
        </div>
      </header>

      <!-- Main Content Area -->
      <div class="flex flex-1 relative">
        <!-- Floating Sidebar (2단계: Menu) - 대시보드에서는 숨김 -->
        <Sidebar v-if="currentSection !== 'dashboard'" collapsible="none" class="border-r shadow-lg">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem v-for="menu in currentMenus" :key="menu.id">
                    <SidebarMenuButton
                      :is-active="$route.path === menu.path"
                      @click="handleMenuClick(menu.path)"
                    >
                      <component :is="menu.icon" class="sidebar-menu-icon" />
                      <span class="sidebar-menu-label">{{ menu.label }}</span>
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

        <!-- Toggle Button - 사이드바 외부에 고정 (대시보드에서는 숨김) -->
        <!-- <SidebarTrigger
          v-if="currentSection !== 'dashboard'"
          class="fixed top-[60px] z-20 bg-background border border-border rounded-md transition-[left] duration-200 ease-linear left-[calc(var(--sidebar-width)+4px)] peer-data-[state=collapsed]:left-[4px] h-11 w-11 [&_svg]:size-6"
        /> -->

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

<style>
.sidebar-menu-icon {
  display: none;
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}

@media (max-aspect-ratio: 1/1) {
  [data-slot="sidebar-wrapper"] {
    --sidebar-width: 3.5rem !important;
  }

  .sidebar-menu-icon {
    display: block;
  }

  .sidebar-menu-label {
    display: none;
  }

}
</style>
