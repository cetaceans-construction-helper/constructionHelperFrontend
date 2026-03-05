<script setup lang="ts">
import { ref, computed, watch } from 'vue'

interface Tab {
  value: string
  label: string
}

const props = defineProps<{
  tabs: Tab[]
  defaultTab?: string
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const activeTab = ref(props.modelValue || props.defaultTab || props.tabs[0]?.value)

// 외부에서 modelValue가 변경되면 내부 상태 동기화
watch(() => props.modelValue, (newVal) => {
  if (newVal && newVal !== activeTab.value) {
    activeTab.value = newVal
  }
})

// 탭 변경 함수
const changeTab = (tabValue: string) => {
  activeTab.value = tabValue
  emit('update:modelValue', tabValue)
}

// 슬롯에 현재 활성 탭 정보 전달
const slotProps = computed(() => ({ activeTab: activeTab.value }))
</script>

<template>
  <div class="w-[30rem] flex-shrink-0 border border-border rounded-lg flex flex-col">
    <!-- 탭 헤더 -->
    <div class="flex border-b border-border bg-muted/30 rounded-t-lg">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        class="flex-1 px-4 py-2 text-sm font-medium transition-colors"
        :class="activeTab === tab.value
          ? 'bg-background text-foreground border-b-2 border-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'"
        @click="changeTab(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 탭 콘텐츠 -->
    <div class="flex-1 p-4 overflow-auto">
      <slot v-bind="slotProps" />
    </div>
  </div>
</template>
