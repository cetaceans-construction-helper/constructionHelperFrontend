<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { Button } from '@/shared/ui/button'
import {
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
  CalendarOff,
  Upload,
  Globe,
  Map,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
} from 'lucide-vue-next'
import type { Component } from 'vue'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/shared/ui/sidebar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/features/auth/public'
import { useProjectStore } from '@/app/context/stores/project'
import { projectApi } from '@/shared/network-core/apis/project'
import { analyticsClient } from '@/shared/analytics/analyticsClient'
import type { Project } from '@/shared/network-core/contracts/project'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const projectStore = useProjectStore()
type ProjectSelectionState = 'manual' | 'auto_initial' | 'auto_recovery'

// Section 정의 (1단계 구조)
const sections = [
  { id: 'dashboard', label: '대시보드', shortLabel: '대시', path: '/helper/dashboard' },
  { id: 'document', label: '문서생성', shortLabel: '문서', path: '/helper/document/daily-report' },
  { id: 'process', label: '공정관리', shortLabel: '공정', path: '/helper/schedule/2d' },
  { id: '3d-model', label: '3D모델', shortLabel: '3D', path: '/helper/3d-model' },
  // { id: 'attendance', label: '출역관리', shortLabel: '출역', path: '/helper/attendance/input' },
  { id: 'material', label: '자원관리', shortLabel: '자원', path: '/helper/material/delivery' },
  // { id: 'floor-plan', label: '도면관리', shortLabel: '도면', path: '/helper/floor-plan' },
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
    // { id: '2d-schedule', label: '2D공정표', path: '/helper/schedule/2d', icon: Grid2x2 },
    // { id: '3d-schedule', label: '3D공정표', path: '/helper/schedule/3d', icon: Box },
  ],
  // attendance: [
  //   { id: 'attendance-input', label: '출역입력', path: '/helper/attendance/input', icon: UserPlus },
  //   { id: 'worker-register', label: '작업자등록', path: '/helper/attendance/register', icon: UserCog },
  // ],
  material: [
    { id: 'incoming', label: '반입자재', path: '/helper/material/delivery', icon: PackagePlus },
    // { id: 'order', label: '자재발주서', path: '/helper/material/order', icon: FileText },
    { id: 'cumulative-attendance', label: '출역집계', path: '/helper/functions/cumulative-attendance', icon: CalendarCheck },
  ],
  'floor-plan': [],
  document: [],
  admin: [
    { id: 'master-data', label: '기준정보 관리', path: '/helper/admin', icon: Database },
    { id: 'document-number', label: '문서 설정', path: '/helper/admin/document-number', icon: FileText },
    { id: 'daily-report-setting', label: '작업일보', path: '/helper/admin/daily-report', icon: FileText },
    { id: 'holiday', label: '휴일관리', path: '/helper/admin/holiday', icon: CalendarOff },
    { id: 'bulk-deployment', label: '대량 출역 입력', path: '/helper/admin/bulk-deployment', icon: Upload },
    { id: 'homepage-setting', label: '홈페이지 입력정보', path: '/helper/admin/homepage-setting', icon: Globe },
  ],
}

// 문서생성 아코디언 메뉴 트리
interface DocumentMenuItem {
  id: string
  label: string
  path?: string
  children?: DocumentMenuItem[]
}

const documentMenus: DocumentMenuItem[] = [
  {
    id: 'work-docs', label: '작업관련 서류', children: [
      { id: 'daily-report', label: '작업일보', path: '/helper/document/daily-report' },
      { id: 'construction-plan', label: '시공계획서' },
      { id: 'work-plan', label: '작업계획서' },
      { id: 'detail-drawing-approval', label: '시공상세도 승인요청서' },
      { id: 'weekend-work-plan', label: '주말작업계획서' },
      { id: 'inspection-request', label: '검측요청서' },
      { id: 'weekly-meeting', label: '주간회의록' },
    ],
  },
  {
    id: 'material-quality-docs', label: '자재 및 품질관련 서류', children: [
      {
        id: 'concrete', label: '콘크리트', children: [
          { id: 'factory-inspection', label: '공장검수' },
          { id: 'pouring-plan', label: '타설계획서' },
          { id: 'concrete-acceptance-test', label: '콘크리트 받아들이기 시험' },
          { id: 'concrete-compression-test', label: '콘크리트 압축강도 시험' },
          { id: 'concrete-ledger', label: '콘크리트 관리대장' },
        ],
      },
      { id: 'supplier-approval', label: '자재공급원 승인요청서' },
      { id: 'material-inspection', label: '자재 반입 검수요청서', path: '/helper/document/material-inspection' },
      { id: 'material-ledger', label: '자재수불대장' },
      { id: 'quality-test-summary', label: '품질 시험 성과 총괄표' },
    ],
  },
  {
    id: 'supervision-docs', label: '감리서류', children: [
      { id: 'work-instruction-reply', label: '작업지시서 회신' },
    ],
  },
  {
    id: 'company-docs', label: '회사서류', children: [
      { id: 'quality-meeting', label: '품질점검회의록' },
    ],
  },
  { id: 'misc-admin-docs', label: '기타행정서류' },
]

const expandedDocMenuIds = ref(new Set<string>())

function toggleDocMenu(id: string) {
  const next = new Set(expandedDocMenuIds.value)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  expandedDocMenuIds.value = next
}

// URL 기반으로 현재 Section 감지
const currentSection = computed(() => {
  const path = route.path
  if (path.startsWith('/helper/dashboard')) return 'dashboard'
  if (path.startsWith('/helper/3d-model')) return '3d-model'
  if (path.startsWith('/helper/schedule')) return 'process'
  // if (path.startsWith('/helper/attendance')) return 'attendance'
  if (path.startsWith('/helper/material')) return 'material'
  if (path.startsWith('/helper/floor-plan')) return 'floor-plan'
  if (path.startsWith('/helper/document')) return 'document'
  if (path.startsWith('/helper/functions')) return 'material'
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

// 세로모드 감지
const isPortrait = ref(false)
const sidebarOpen = ref(false)

// 메뉴 클릭 핸들러
const handleMenuClick = (path: string) => {
  router.push(path)
  if (isPortrait.value) sidebarOpen.value = false
}

// 로그아웃
const handleLogout = async () => {
  await authStore.logout()
  router.push('/')
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

const portraitMql = window.matchMedia('(max-aspect-ratio: 1/1)')
const onPortraitChange = (e: MediaQueryListEvent | MediaQueryList) => {
  isPortrait.value = e.matches
}

onMounted(() => {
  onPortraitChange(portraitMql)
  portraitMql.addEventListener('change', onPortraitChange)
  window.addEventListener('keydown', handleTildeKey)
})

onUnmounted(() => {
  portraitMql.removeEventListener('change', onPortraitChange)
  window.removeEventListener('keydown', handleTildeKey)
})
</script>

<template>
  <SidebarProvider v-model:open="sidebarOpen">
    <div class="min-h-screen flex flex-col w-full">
      <!-- Header with Sections (1단계: Section) -->
      <header class="sticky top-0 z-40 border-b border-border bg-background" :class="isPortrait ? 'h-[50px]' : 'h-[65px]'">
        <div class="flex items-center justify-between p-3 h-full">
          <!-- Logo -->
          <div class="flex items-center gap-3 px-3 shrink-0">
            <img src="@/app/public-home/assets/logo.png" alt="CONELP" :class="isPortrait ? 'h-6' : 'h-8'" />
          </div>

          <!-- Section Buttons (Segmented Design) — 세로모드 숨김 -->
          <div v-if="!isPortrait" class="flex-1 flex justify-center min-w-0">
            <div class="inline-flex rounded-lg bg-muted p-1.5">
              <Button
                v-for="section in sections"
                :key="section.id"
                :variant="currentSection === section.id ? 'default' : 'ghost'"
                @click="selectSection(section.id)"
                class="rounded-md text-base px-4 py-2"
              >
                {{ section.label }}
              </Button>
            </div>
          </div>

          <!-- User Actions -->
          <div class="flex items-center gap-3 shrink-0 ml-auto">
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
        <Sidebar
          v-if="currentSection !== 'dashboard' && currentSection !== 'process' && currentSection !== '3d-model'"
          :collapsible="isPortrait ? 'offcanvas' : 'none'"
          class="border-r shadow-lg"
          :style="currentSection === 'document' ? { '--sidebar-width': '240px' } : {}"
        >
          <SidebarContent>
            <!-- 문서생성: 아코디언 트리 메뉴 -->
            <template v-if="currentSection === 'document'">
              <SidebarGroup v-for="group in documentMenus" :key="group.id" class="p-0 px-2">
                <!-- 1단계: 그룹 헤더 -->
                <SidebarGroupLabel
                  v-if="group.children"
                  class="cursor-pointer select-none text-sm h-8"
                  @click="toggleDocMenu(group.id)"
                >
                  <component :is="expandedDocMenuIds.has(group.id) ? ChevronDown : ChevronRight" class="h-4 w-4 shrink-0" />
                  <span>{{ group.label }}</span>
                </SidebarGroupLabel>
                <SidebarGroupLabel
                  v-else
                  class="cursor-pointer select-none text-sm h-8"
                  @click="group.path && handleMenuClick(group.path)"
                >
                  <span>{{ group.label }}</span>
                </SidebarGroupLabel>

                <!-- 2단계 -->
                <SidebarGroupContent v-if="group.children && expandedDocMenuIds.has(group.id)">
                  <SidebarMenu>
                    <SidebarMenuItem v-for="item in group.children" :key="item.id">
                      <!-- 2단계 with children -->
                      <template v-if="item.children">
                        <SidebarMenuButton class="pl-6 text-sm" @click="toggleDocMenu(item.id)">
                          <component :is="expandedDocMenuIds.has(item.id) ? ChevronDown : ChevronRight" class="h-3.5 w-3.5 shrink-0" />
                          <span>{{ item.label }}</span>
                        </SidebarMenuButton>
                        <!-- 3단계 -->
                        <SidebarMenuSub v-if="expandedDocMenuIds.has(item.id)" class="ml-6 border-l-0">
                          <SidebarMenuSubItem v-for="sub in item.children" :key="sub.id">
                            <SidebarMenuSubButton
                              class="pl-4 text-sm"
                              :is-active="sub.path ? $route.path === sub.path : false"
                              @click="sub.path && handleMenuClick(sub.path)"
                            >
                              {{ sub.label }}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </template>

                      <!-- 2단계 leaf -->
                      <SidebarMenuButton
                        v-else
                        class="pl-6 text-sm"
                        :is-active="item.path ? $route.path === item.path : false"
                        @click="item.path && handleMenuClick(item.path)"
                      >
                        <span>{{ item.label }}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </template>

            <!-- 기타 섹션: 기존 플랫 메뉴 -->
            <SidebarGroup v-else>
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
        </Sidebar>

        <!-- 세로모드 햄버거 버튼 -->
        <button
          v-if="isPortrait && currentSection !== 'dashboard' && currentSection !== 'process' && currentSection !== '3d-model'"
          class="fixed top-[69px] z-50 p-2 bg-primary text-primary-foreground rounded-md shadow-sm transition-[left] duration-200 ease-linear"
          :style="{ left: sidebarOpen ? `calc(${currentSection === 'document' ? '240px' : 'var(--sidebar-width)'} + 4px)` : '4px' }"
          @click="sidebarOpen = !sidebarOpen"
        >
          <component :is="sidebarOpen ? ChevronLeft : ChevronRight" class="h-5 w-5" />
        </button>

        <!-- Content Area - RouterView로 각 페이지 렌더링 -->
        <div class="flex-1 w-full flex flex-col" @click="isPortrait && sidebarOpen ? (sidebarOpen = false) : undefined">
          <div class="flex-1 flex flex-col min-h-0" :class="currentSection === 'process' || currentSection === '3d-model' ? '' : 'p-4'">
            <RouterView />
          </div>
        </div>
      </div>

      <!-- Footer 네비게이션 (세로모드) -->
      <footer v-if="isPortrait" class="sticky bottom-0 z-40 border-t border-border bg-background">
        <div class="grid h-14" :style="{ gridTemplateColumns: `repeat(${sections.length}, 1fr)` }">
          <Button
            v-for="section in sections"
            :key="section.id"
            :variant="currentSection === section.id ? 'default' : 'ghost'"
            @click="selectSection(section.id)"
            class="rounded-none text-base font-bold h-full"
          >
            {{ section.shortLabel }}
          </Button>
        </div>
      </footer>
    </div>
  </SidebarProvider>
</template>

<style>
.sidebar-menu-icon {
  display: none;
}
</style>
