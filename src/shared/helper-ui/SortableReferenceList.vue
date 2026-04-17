<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import draggable from 'vuedraggable'
import { Menu, Pencil, Check, X } from 'lucide-vue-next'
import { Input } from '@/shared/ui/input'

interface ListItem {
  id: number
  [key: string]: unknown
}

const props = withDefaults(
  defineProps<{
    items: ListItem[]
    selectedId?: number | null
    displayKey?: string
    displaySuffix?: (item: ListItem) => string
    disabled?: boolean
    emptyMessage?: string
    selectable?: boolean
    unitEditable?: boolean
    unitKey?: string
    unitLabel?: string
  }>(),
  {
    selectedId: null,
    displayKey: 'name',
    displaySuffix: undefined,
    disabled: false,
    emptyMessage: '항목 없음',
    selectable: true,
    unitEditable: false,
    unitKey: 'unit',
    unitLabel: '단위',
  },
)

const emit = defineEmits<{
  select: [id: number]
  delete: [id: number, name: string]
  'update-name': [payload: { id: number; name: string; unit?: string }]
  reorder: [ids: number[]]
}>()

const localItems = ref<ListItem[]>([])
const editingId = ref<number | null>(null)
const editingName = ref('')
const editingUnit = ref('')
const editInputRef = ref<InstanceType<typeof Input> | null>(null)
const editUnitInputRef = ref<InstanceType<typeof Input> | null>(null)

watch(
  () => props.items,
  (newItems) => {
    localItems.value = [...newItems]
  },
  { immediate: true, deep: true },
)

function onDragEnd() {
  const ids = localItems.value.map((item) => item.id)
  emit('reorder', ids)
}

function onItemClick(id: number) {
  if (props.selectable && editingId.value !== id) {
    emit('select', id)
  }
}

function startEditing(item: ListItem) {
  editingId.value = item.id
  editingName.value = String(item[props.displayKey] ?? '')
  if (props.unitEditable) {
    editingUnit.value = String(item[props.unitKey] ?? '')
  }
  nextTick(() => {
    const inputEl = editInputRef.value?.$el?.querySelector('input') as HTMLInputElement | undefined
    inputEl?.focus()
    inputEl?.select()
  })
}

function confirmEdit() {
  if (editingId.value == null) return
  const trimmed = editingName.value.trim()
  if (trimmed) {
    const payload: { id: number; name: string; unit?: string } = { id: editingId.value, name: trimmed }
    if (props.unitEditable) {
      payload.unit = editingUnit.value.trim()
    }
    emit('update-name', payload)
  }
  editingId.value = null
  editingName.value = ''
  editingUnit.value = ''
}

function cancelEdit() {
  editingId.value = null
  editingName.value = ''
  editingUnit.value = ''
}

function onEditKeydown(e: KeyboardEvent) {
  if (e.isComposing) return
  if (e.key === 'Enter') {
    confirmEdit()
  } else if (e.key === 'Escape') {
    cancelEdit()
  }
}

// 편집 중일 때 편집 행 바깥 클릭 시 편집 해제 (변경 내용 저장 후 종료)
function handleOutsidePointer(e: PointerEvent) {
  if (editingId.value == null) return
  const target = e.target as HTMLElement | null
  if (!target) return
  // Reka UI 의 AlertDialog 등 Portal 로 body 로 이동한 요소 클릭 시 편집 유지
  if (target.closest('[data-editing-row="true"]') || target.closest('[role="dialog"]')) return
  confirmEdit()
}

watch(editingId, (id) => {
  if (id != null) {
    document.addEventListener('pointerdown', handleOutsidePointer, true)
  } else {
    document.removeEventListener('pointerdown', handleOutsidePointer, true)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointer, true)
})
</script>

<template>
  <div class="space-y-1 max-h-48 overflow-y-auto">
    <draggable
      v-model="localItems"
      item-key="id"
      handle=".drag-handle"
      :animation="200"
      :disabled="disabled"
      @end="onDragEnd"
    >
      <template #item="{ element }">
        <div
          class="group flex items-center gap-1 px-2 py-1.5 border rounded-md text-sm transition-colors mb-1"
          :class="{
            'border-primary bg-primary/10 font-medium': selectable && selectedId === element.id,
            'border-border hover:bg-muted/50': !selectable || selectedId !== element.id,
            'cursor-pointer': selectable && editingId !== element.id,
          }"
          :data-editing-row="editingId === element.id ? 'true' : undefined"
          @click="onItemClick(element.id)"
        >
          <!-- 드래그 핸들 -->
          <button
            class="drag-handle p-0.5 rounded text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0"
            @click.stop
          >
            <Menu class="w-3.5 h-3.5" />
          </button>

          <!-- 이름 표시 / 수정 Input -->
          <template v-if="editingId === element.id">
            <Input
              ref="editInputRef"
              v-model="editingName"
              class="h-6 text-sm"
              :class="unitEditable ? 'basis-3/5 min-w-0' : 'flex-1'"
              @keydown="onEditKeydown"
              @click.stop
            />
            <Input
              v-if="unitEditable"
              ref="editUnitInputRef"
              v-model="editingUnit"
              :placeholder="unitLabel"
              class="h-6 text-sm basis-2/5 min-w-0"
              @keydown="onEditKeydown"
              @click.stop
            />
          </template>
          <template v-else>
            <span class="flex-1 truncate">
              {{ element[displayKey] }}
              <span v-if="displaySuffix" class="text-muted-foreground">{{
                displaySuffix(element)
              }}</span>
            </span>
          </template>

          <!-- 편집 모드 전용 커스텀 액션 슬롯 -->
          <slot v-if="editingId === element.id" name="edit-actions" :item="element" />

          <!-- 수정 버튼 (Pencil / Check) -->
          <button
            v-if="editingId === element.id"
            class="p-0.5 rounded hover:bg-primary/10 text-primary shrink-0"
            @click.stop="confirmEdit"
          >
            <Check class="w-3.5 h-3.5" />
          </button>
          <button
            v-else
            class="p-0.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            :disabled="disabled"
            @click.stop="startEditing(element)"
          >
            <Pencil class="w-3 h-3" />
          </button>

          <!-- 삭제 버튼 -->
          <button
            class="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            :disabled="disabled"
            @click.stop="emit('delete', element.id, element[displayKey])"
          >
            <X class="w-3 h-3" />
          </button>
        </div>
      </template>
    </draggable>
    <p v-if="localItems.length === 0" class="text-xs text-muted-foreground py-2 text-center">
      {{ emptyMessage }}
    </p>
  </div>
</template>
