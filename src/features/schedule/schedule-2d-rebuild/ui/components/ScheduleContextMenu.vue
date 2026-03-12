<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Link2, Link2Off, Palette, Pencil, Plus } from 'lucide-vue-next'
import type {
  ScheduleContextMenuCommand,
  ScheduleContextMenuIcon,
  ScheduleContextMenuItem,
} from '@/features/schedule/schedule-2d-rebuild/view-model/schedule-interaction-state'

const VIEWPORT_MARGIN = 12

const props = defineProps<{
  open: boolean
  x: number
  y: number
  items: ScheduleContextMenuItem[]
}>()

const emit = defineEmits<{
  select: [command: ScheduleContextMenuCommand]
  close: []
}>()

const menuRef = ref<HTMLElement | null>(null)
const position = ref({ left: 0, top: 0 })

function resolveIcon(icon: ScheduleContextMenuIcon) {
  switch (icon) {
    case 'plus':
      return Plus
    case 'palette':
      return Palette
    case 'pencil':
      return Pencil
    case 'unlink':
      return Link2Off
    case 'link':
    default:
      return Link2
  }
}

async function syncPosition() {
  if (!props.open) return

  await nextTick()
  const element = menuRef.value
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
  if (target && menuRef.value?.contains(target)) return

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

watch(
  () => [props.open, props.x, props.y, props.items.length] as const,
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
      v-if="open && items.length > 0"
      ref="menuRef"
      data-schedule-context-menu
      class="fixed z-[100] min-w-56 rounded-lg border border-border bg-background/98 p-1.5 shadow-2xl backdrop-blur-sm"
      :style="{ left: `${position.left}px`, top: `${position.top}px` }"
    >
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors"
        :class="item.disabled
          ? 'cursor-not-allowed text-muted-foreground/60'
          : item.danger
            ? 'text-destructive hover:bg-destructive/10'
            : 'text-foreground hover:bg-muted'"
        :disabled="item.disabled"
        @click="emit('select', item.command)"
      >
        <component
          :is="resolveIcon(item.icon)"
          class="h-4 w-4 shrink-0"
        />
        {{ item.label }}
      </button>
    </div>
  </Teleport>
</template>
