<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useLocationMaster } from '../composables/useLocationMaster'

const {
  zones,
  floors,
  sections,
  usages,
  newZone,
  newFloor,
  newSection,
  newUsage,
  isCreating,
  isDeleting,
  loadAll,
  addZone,
  addFloor,
  addSection,
  addUsage,
  deleteZone,
  deleteFloor,
  deleteSection,
  deleteUsage,
} = useLocationMaster()

onMounted(() => {
  loadAll()
})

const columns = [
  { label: 'Zone', items: zones, input: newZone, creating: 'zone', deleting: 'zone', add: addZone, deleteFn: deleteZone },
  { label: 'Floor', items: floors, input: newFloor, creating: 'floor', deleting: 'floor', add: addFloor, deleteFn: deleteFloor },
  { label: 'Section', items: sections, input: newSection, creating: 'section', deleting: 'section', add: addSection, deleteFn: deleteSection },
  { label: 'Usage', items: usages, input: newUsage, creating: 'usage', deleting: 'usage', add: addUsage, deleteFn: deleteUsage },
]

// 삭제 다이얼로그 상태
const showDeleteDialog = ref(false)
const deleteTargetId = ref<number | null>(null)
const deleteTargetName = ref('')
const deleteAction = ref<((id: number) => Promise<void>) | null>(null)

function openDeleteDialog(id: number, name: string, fn: (id: number) => Promise<void>) {
  deleteTargetId.value = id
  deleteTargetName.value = name
  deleteAction.value = fn
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (deleteTargetId.value != null && deleteAction.value) {
    await deleteAction.value(deleteTargetId.value)
  }
  showDeleteDialog.value = false
}
</script>

<template>
  <div>
    <h3 class="text-sm font-semibold mb-3">위치분류</h3>
    <div class="grid grid-cols-4 gap-4">
      <div v-for="col in columns" :key="col.label" class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">{{ col.label }}</p>
        <div class="flex gap-1">
          <Input
            v-model="col.input.value"
            placeholder="이름 입력"
            class="h-8 text-sm"
            @keyup.enter="col.add"
          />
          <Button
            size="sm"
            class="h-8 shrink-0"
            :disabled="isCreating[col.creating] || !col.input.value.trim()"
            @click="col.add"
          >
            추가
          </Button>
        </div>
        <div class="space-y-1 max-h-48 overflow-y-auto">
          <div
            v-for="item in col.items.value"
            :key="item.id"
            class="flex items-center px-3 py-2 border border-border rounded-md text-sm"
          >
            <span class="flex-1 truncate">{{ item.name }}</span>
            <button
              class="ml-1 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
              :disabled="isDeleting[col.deleting]"
              @click.stop="openDeleteDialog(item.id, item.name, col.deleteFn)"
            >
              <X class="w-3 h-3" />
            </button>
          </div>
          <p
            v-if="col.items.value.length === 0"
            class="text-xs text-muted-foreground py-2 text-center"
          >
            항목 없음
          </p>
        </div>
      </div>
    </div>

    <AlertDialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>삭제 확인</AlertDialogTitle>
          <AlertDialogDescription>
            '{{ deleteTargetName }}' 항목을 삭제하시겠습니까?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction @click="confirmDelete">삭제</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
