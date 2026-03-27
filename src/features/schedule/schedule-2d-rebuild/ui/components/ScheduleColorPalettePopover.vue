<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  SCHEDULE_PROCESS_COLOR_OPTIONS,
  getProcessToneColors,
  normalizeHexColor,
} from '@/features/schedule/schedule-2d-rebuild/model/schedule-process-colors'

const VIEWPORT_MARGIN = 12

const props = withDefaults(defineProps<{
  open: boolean
  x: number
  y: number
  title?: string
  subtitle?: string
  selectedColorHex?: string | null
  showReset?: boolean
  resetActive?: boolean
  resetLabel?: string
}>(), {
  title: '색상 선택',
  subtitle: '',
  selectedColorHex: null,
  showReset: false,
  resetActive: false,
  resetLabel: '자동 색 사용',
})

const emit = defineEmits<{
  close: []
  select: [colorHex: string | null]
}>()

const popoverRef = ref<HTMLElement | null>(null)
const position = ref({ left: 0, top: 0 })

const normalizedSelectedColorHex = computed(() => normalizeHexColor(props.selectedColorHex))

async function syncPosition() {
  if (!props.open) return

  await nextTick()
  const element = popoverRef.value
  if (!element) return

  const rect = element.getBoundingClientRect()
  position.value = {
    left: Math.min(props.x, window.innerWidth - rect.width - VIEWPORT_MARGIN),
    top: Math.min(props.y, window.innerHeight - rect.height - VIEWPORT_MARGIN),
  }
}

function handleWindowPointerDown(event: PointerEvent) {
  if (!props.open) return

  const target = event.target as Node | null
  if (target && popoverRef.value?.contains(target)) return

  emit('close')
}

function handleWindowKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
  }
}

function handleWindowScroll() {
  if (props.open) {
    emit('close')
  }
}

function isOptionSelected(colorHex: string) {
  return normalizedSelectedColorHex.value === normalizeHexColor(colorHex)
}

watch(
  () => [props.open, props.x, props.y, props.selectedColorHex] as const,
  () => {
    void syncPosition()
  },
)

onMounted(() => {
  window.addEventListener('pointerdown', handleWindowPointerDown)
  window.addEventListener('keydown', handleWindowKeyDown)
  window.addEventListener('scroll', handleWindowScroll, true)
  window.addEventListener('resize', handleWindowScroll)
})

onUnmounted(() => {
  window.removeEventListener('pointerdown', handleWindowPointerDown)
  window.removeEventListener('keydown', handleWindowKeyDown)
  window.removeEventListener('scroll', handleWindowScroll, true)
  window.removeEventListener('resize', handleWindowScroll)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="popoverRef"
      class="fixed z-[110] w-80 rounded-xl border border-border bg-background/98 p-3 shadow-2xl backdrop-blur-sm"
      :style="{ left: `${position.left}px`, top: `${position.top}px` }"
    >
      <div class="mb-3 flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-sm font-semibold text-foreground">{{ title }}</p>
          <p v-if="subtitle" class="mt-1 text-xs text-muted-foreground">{{ subtitle }}</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          @click="emit('close')"
        >
          닫기
        </button>
      </div>

      <button
        v-if="showReset"
        type="button"
        class="mb-3 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors"
        :class="resetActive
          ? 'border-slate-400 bg-slate-100 text-slate-800'
          : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'"
        @click="emit('select', null)"
      >
        <span>{{ resetLabel }}</span>
        <span class="text-xs">기본</span>
      </button>

      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="option in SCHEDULE_PROCESS_COLOR_OPTIONS"
          :key="option.id"
          type="button"
          class="rounded-xl border p-2 text-left transition-all"
          :class="isOptionSelected(option.colorHex)
            ? 'border-slate-900 bg-slate-50 shadow-[0_0_0_1px_rgba(15,23,42,0.12)]'
            : 'border-border hover:bg-muted/70'"
          @click="emit('select', option.colorHex)"
        >
          <div class="overflow-hidden rounded-lg border border-border/70 bg-white shadow-sm">
            <div
              class="h-4"
              :style="{ backgroundColor: getProcessToneColors(option.colorHex, 'parent').fillColorHex }"
            />
            <div
              class="h-4 border-t border-white/40"
              :style="{ backgroundColor: getProcessToneColors(option.colorHex, 'child').fillColorHex }"
            />
          </div>
          <p class="mt-2 text-xs font-medium text-foreground">{{ option.name }}</p>
        </button>
      </div>
    </div>
  </Teleport>
</template>
