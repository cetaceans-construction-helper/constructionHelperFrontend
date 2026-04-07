<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import SortableReferenceList from '@/shared/helper-ui/SortableReferenceList.vue'
import { useStandardMaterial } from '@/features/system-admin/view-model/useStandardMaterial'

const {
  materialTypes, materialSpecs,
  selectedMaterialTypeId,
  newMaterialTypeName, newMaterialSpecName,
  isCreating, isDeleting,
  loadMaterialTypes, selectMaterialType,
  addMaterialType, addMaterialSpec,
  deleteMaterialType, deleteMaterialSpec,
  updateMaterialTypeName, updateMaterialSpecName,
} = useStandardMaterial()

onMounted(() => { loadMaterialTypes() })

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
    <h3 class="text-sm font-semibold mb-3">표준 자재</h3>
    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">자재타입</p>
        <div class="flex gap-1">
          <Input v-model="newMaterialTypeName" placeholder="이름 입력" class="h-8 text-sm"
            @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addMaterialType() }" />
          <Button size="sm" class="h-8 shrink-0" :disabled="isCreating || !newMaterialTypeName.trim()" @click="addMaterialType">추가</Button>
        </div>
        <SortableReferenceList :items="materialTypes" :selected-id="selectedMaterialTypeId" :disabled="isDeleting"
          @select="selectMaterialType"
          @delete="(id, name) => openDeleteDialog(id, name, deleteMaterialType)"
          @update-name="({ id, name }) => updateMaterialTypeName(id, name)" />
      </div>

      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">자재규격</p>
        <div class="flex gap-1">
          <Input v-model="newMaterialSpecName" placeholder="이름 입력" class="h-8 text-sm" :disabled="!selectedMaterialTypeId"
            @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addMaterialSpec() }" />
          <Button size="sm" class="h-8 shrink-0" :disabled="isCreating || !newMaterialSpecName.trim() || !selectedMaterialTypeId" @click="addMaterialSpec">추가</Button>
        </div>
        <SortableReferenceList :items="materialSpecs" :selectable="false" :disabled="isDeleting"
          :empty-message="selectedMaterialTypeId ? '항목 없음' : '자재타입을 선택하세요'"
          @delete="(id, name) => openDeleteDialog(id, name, deleteMaterialSpec)"
          @update-name="({ id, name }) => updateMaterialSpecName(id, name)" />
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
