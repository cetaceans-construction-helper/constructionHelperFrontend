<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import SortableReferenceList from '@/shared/helper-ui/SortableReferenceList.vue'
import { useStandardLabor } from '@/features/system-admin/view-model/useStandardLabor'

const {
  laborTypes,
  newLaborTypeName,
  isCreating, isDeleting,
  loadLaborTypes,
  addLaborType, deleteLaborType, updateLaborTypeName,
} = useStandardLabor()

onMounted(() => { loadLaborTypes() })

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
    await deleteLaborType(deleteTargetId.value)
  }
  showDeleteDialog.value = false
}
</script>

<template>
  <div>
    <h3 class="text-sm font-semibold mb-3">표준 직종</h3>
    <div class="max-w-sm space-y-2">
      <p class="text-xs text-muted-foreground font-medium">직종</p>
      <div class="flex gap-1">
        <Input v-model="newLaborTypeName" placeholder="이름 입력" class="h-8 text-sm"
          @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addLaborType() }" />
        <Button size="sm" class="h-8 shrink-0" :disabled="isCreating || !newLaborTypeName.trim()" @click="addLaborType">추가</Button>
      </div>
      <SortableReferenceList :items="laborTypes" :selectable="false" :disabled="isDeleting"
        @delete="openDeleteDialog"
        @update-name="({ id, name }) => updateLaborTypeName(id, name)" />
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
