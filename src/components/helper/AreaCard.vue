<script setup lang="ts">
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface TabDefinition {
  value: string
  label: string
}

defineProps<{
  title?: string            // 헤더 타이틀
  height?: string           // 'flex-[0.7]', 'flex-1', 'flex-[0.5]' 등
  minHeight?: string        // 최소 높이 (기본: '300px')
  hasTabs?: boolean         // 탭 사용 여부 (기본: false)
  tabs?: TabDefinition[]    // 탭 정의
  defaultTab?: string       // 기본 선택 탭
}>()
</script>

<template>
  <!-- 탭이 없는 경우 -->
  <div
    v-if="!hasTabs"
    class="border border-border rounded-lg bg-card p-4 flex flex-col"
    :class="height || 'flex-[0.7]'"
    :style="{ minHeight: minHeight || '300px' }">
    <h3 v-if="title" class="text-lg font-semibold mb-3">{{ title }}</h3>
    <slot />
  </div>

  <!-- 탭이 있는 경우 -->
  <Tabs 
    v-else
    :default-value="defaultTab || tabs?.[0]?.value" 
    class="flex flex-col gap-0"
    :class="height || 'flex-[0.7]'">
    <TabsList class="h-auto w-full max-w-full bg-transparent gap-0 relative z-10 flex items-end rounded-none p-0">
      <TabsTrigger 
        v-for="tab in tabs" 
        :key="tab.value" 
        :value="tab.value"
        class="relative px-6 py-2.5 rounded-t-[10px] rounded-b-none border border-border border-b-0 bg-muted/50 transition-all duration-200 data-[state=active]:bg-card data-[state=active]:shadow-[0_2px_0_0_var(--card)] data-[state=active]:mb-[-1px] data-[state=inactive]:opacity-70 data-[state=inactive]:border-b data-[state=inactive]:border-b-border hover:bg-muted">
        {{ tab.label }}
      </TabsTrigger>
    </TabsList>
    
    <div 
      class="border border-border rounded-lg rounded-t-none bg-card p-4 flex-1 flex flex-col relative"
      :style="{ minHeight: minHeight || '300px' }">
      <TabsContent 
        v-for="tab in tabs"
        :key="tab.value"
        :value="tab.value"
        class="flex-1 flex flex-col m-0">
        <slot :name="`tab-${tab.value}`" />
      </TabsContent>
    </div>
  </Tabs>
</template>
