<script setup lang="ts">
import { ref, computed } from 'vue'
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
import { useRouter } from 'vue-router'
import { useThemeStore } from '@/stores/theme'

const router = useRouter()
const themeStore = useThemeStore()

// Section 정의 (1단계 구조)
const sections = [
  { id: 'process', label: '공정관리' },
  { id: 'material', label: '자재관리' },
  { id: 'safety', label: '안전관리' },
  { id: 'document', label: '문서관리' },
  { id: 'utility', label: '유용한 기능' },
]

// 각 Section별 Menu 정의 (2단계 구조)
const menusBySection: Record<string, { id: string; label: string }[]> = {
  process: [
    { id: 'schedule', label: '공정표' },
    { id: 'schedule-3d', label: '3D공정표' },
  ],
  material: [
    { id: 'invoice', label: '송장입력' },
    { id: 'material-list', label: '자재목록' },
  ],
  safety: [{ id: 'safety-placeholder', label: '(구현예정)' }],
  document: [
    { id: 'doc-manage', label: '문서관리' },
    { id: 'daily-report', label: '일일작업일보' },
    { id: 'material-inspection', label: '자재반입검수요청서' },
  ],
  utility: [{ id: 'utility-placeholder', label: '(구현예정)' }],
}

// 현재 선택된 Section
const currentSection = ref('process')

// 현재 선택된 Menu
const currentMenu = ref('schedule')

// 현재 Section의 Menu 목록
const currentMenus = computed(() => menusBySection[currentSection.value] || [])

// Section 변경 시 해당 Section의 첫 번째 Menu 선택
const selectSection = (sectionId: string) => {
  currentSection.value = sectionId
  const menus = menusBySection[sectionId]
  const firstMenu = menus?.[0]
  if (firstMenu) {
    currentMenu.value = firstMenu.id
  }
}

// 로그아웃
const handleLogout = () => {
  router.push('/')
}

// 메뉴 클릭 핸들러 (사이드바 닫기 포함)
const handleMenuClick = (menuId: string) => {
  currentMenu.value = menuId
  
  // 라우팅
  if (menuId === 'schedule') {
    router.push('/helper/schedule')
  } else if (menuId === 'schedule-3d') {
    router.push('/helper/schedule-3d')
  } else if (menuId === 'invoice') {
    router.push('/helper/material/invoice')
  } else if (menuId === 'material-list') {
    router.push('/helper/material/list')
  } else if (menuId === 'doc-manage') {
    router.push('/helper/document/manager')
  } else if (menuId === 'daily-report') {
    router.push('/helper/document/daily-report')
  } else if (menuId === 'material-inspection') {
    router.push('/helper/document/material-inspection')
  }
  
  // SidebarTrigger 버튼 찾아서 클릭하여 사이드바 닫기
  const triggerButton = document.querySelector('[data-sidebar="trigger"]') as HTMLButtonElement
  triggerButton?.click()
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
            <img
              src="https://storage.googleapis.com/conhelp_public/cetaceans_symbol_v1.png"
              alt="Cetaceans Logo"
              class="w-8 h-8 rounded object-contain"
            />
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
          <Button variant="outline" size="sm" @click="handleLogout">로그아웃</Button>
        </div>
      </header>

      <!-- Main Content Area -->
      <div class="flex flex-1 relative">
        <!-- Floating Sidebar (2단계: Menu) -->
        <Sidebar collapsible="offcanvas" class="border-r shadow-lg">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>{{ sections.find((s) => s.id === currentSection)?.label }}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem v-for="menu in currentMenus" :key="menu.id">
                    <SidebarMenuButton
                      :is-active="currentMenu === menu.id"
                      @click="handleMenuClick(menu.id)"
                    >
                      <span>{{ menu.label }}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter class="flex justify-center py-2">
            <Button
              variant="ghost"
              size="icon"
              @click="themeStore.toggleTheme"
              class="h-12 w-12"
            >
              <Sun v-if="!themeStore.isDark" class="size-6" />
              <Moon v-else class="size-6" />
            </Button>
          </SidebarFooter>
        </Sidebar>

        <!-- Toggle Button - 사이드바 외부에 고정, 사이드바 상태에 따라 위치 변경 -->
        <SidebarTrigger 
          class="fixed top-[60px] z-20 bg-background border border-border rounded-md transition-[left] duration-200 ease-linear left-[calc(var(--sidebar-width)+4px)] peer-data-[state=collapsed]:left-[4px] h-11 w-11 [&_svg]:size-6"
        />

        <!-- Content Area - 각 페이지 컴포넌트가 들어갈 영역 -->
        <div class="flex-1 w-full flex flex-col">
          <router-view />
        </div>
      </div>
    </div>
  </SidebarProvider>
</template>
