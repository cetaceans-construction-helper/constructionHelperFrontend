<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import SortableReferenceList from '@/shared/helper-ui/SortableReferenceList.vue'
import { useComponentTypeMaster } from '@/features/system-admin/view-model/standard/useComponentTypeMaster'

const {
  selectedIsStructure,
  componentTypes,
  newComponentTypeName,
  isCreating,
  isDeleting,
  addComponentType,
  deleteComponentType,
  updateComponentTypeName,
  reorderComponentTypes,
} = useComponentTypeMaster()

function selectIsStructure(value: boolean) {
  selectedIsStructure.value = selectedIsStructure.value === value ? null : value
}

const showDeleteDialog = ref(false)
const deleteTargetId = ref<number | null>(null)
const deleteTargetName = ref('')

function openDeleteDialog(id: number, name: string) {
  deleteTargetId.value = id
  deleteTargetName.value = name
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (deleteTargetId.value != null) {
    await deleteComponentType(deleteTargetId.value)
  }
  showDeleteDialog.value = false
}
</script>

<template>
  <div class="space-y-3">
    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">부재 구분</p>
        <div class="flex gap-2">
          <button
            class="flex-1 px-3 py-2 text-sm rounded-md border transition-colors"
            :class="selectedIsStructure === true ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-background border-border text-foreground hover:bg-muted'"
            @click="selectIsStructure(true)"
          >
            구조
          </button>
          <button
            class="flex-1 px-3 py-2 text-sm rounded-md border transition-colors"
            :class="selectedIsStructure === false ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-background border-border text-foreground hover:bg-muted'"
            @click="selectIsStructure(false)"
          >
            비구조
          </button>
        </div>
      </div>

      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">부재 타입 (ComponentType)</p>
        <div class="flex gap-1">
          <Input
            v-model="newComponentTypeName"
            placeholder="이름 입력"
            class="h-8 text-sm"
            :disabled="selectedIsStructure == null"
            @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addComponentType() }"
          />
          <Button
            size="sm"
            class="h-8 shrink-0"
            :disabled="isCreating || !newComponentTypeName.trim() || selectedIsStructure == null"
            @click="addComponentType"
          >
            추가
          </Button>
        </div>
        <SortableReferenceList
          :items="componentTypes"
          :disabled="isDeleting"
          :empty-message="selectedIsStructure == null ? '구조/비구조을 선택하세요' : '항목 없음'"
          @delete="(id, name) => openDeleteDialog(id, name)"
          @update-name="({ id, name }) => updateComponentTypeName(id, name)"
          @reorder="reorderComponentTypes"
        />
      </div>
    </div>

    <AlertDialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>삭제 확인</AlertDialogTitle>
          <AlertDialogDescription>'{{ deleteTargetName }}' 항목을 삭제하시겠습니까?</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction @click="confirmDelete">삭제</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
