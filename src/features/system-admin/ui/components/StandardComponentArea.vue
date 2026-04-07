<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import SortableReferenceList from '@/shared/helper-ui/SortableReferenceList.vue'
import { useStandardComponent } from '@/features/system-admin/view-model/useStandardComponent'

const {
  componentDivisions, componentTypes,
  selectedComponentDivisionId,
  newComponentDivisionName, newComponentTypeName,
  isCreating, isDeleting,
  loadComponentDivisions, selectComponentDivision,
  addComponentDivision, addComponentType,
  deleteComponentDivision, deleteComponentType,
  updateComponentDivisionName, updateComponentTypeName,
} = useStandardComponent()

onMounted(() => { loadComponentDivisions() })

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
    <h3 class="text-sm font-semibold mb-3">표준 부재</h3>
    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">부위구분</p>
        <div class="flex gap-1">
          <Input v-model="newComponentDivisionName" placeholder="이름 입력" class="h-8 text-sm"
            @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addComponentDivision() }" />
          <Button size="sm" class="h-8 shrink-0" :disabled="isCreating || !newComponentDivisionName.trim()" @click="addComponentDivision">추가</Button>
        </div>
        <SortableReferenceList :items="componentDivisions" :selected-id="selectedComponentDivisionId" :disabled="isDeleting"
          @select="selectComponentDivision"
          @delete="(id, name) => openDeleteDialog(id, name, deleteComponentDivision)"
          @update-name="({ id, name }) => updateComponentDivisionName(id, name)" />
      </div>

      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">부위타입</p>
        <div class="flex gap-1">
          <Input v-model="newComponentTypeName" placeholder="이름 입력" class="h-8 text-sm" :disabled="!selectedComponentDivisionId"
            @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addComponentType() }" />
          <Button size="sm" class="h-8 shrink-0" :disabled="isCreating || !newComponentTypeName.trim() || !selectedComponentDivisionId" @click="addComponentType">추가</Button>
        </div>
        <SortableReferenceList :items="componentTypes" :selectable="false" :disabled="isDeleting"
          :empty-message="selectedComponentDivisionId ? '항목 없음' : '부위구분을 선택하세요'"
          @delete="(id, name) => openDeleteDialog(id, name, deleteComponentType)"
          @update-name="({ id, name }) => updateComponentTypeName(id, name)" />
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
