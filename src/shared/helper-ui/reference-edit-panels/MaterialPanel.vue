<script setup lang="ts">
import { ref } from 'vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import SortableReferenceList from '@/shared/helper-ui/SortableReferenceList.vue'
import { useMaterialMaster } from '@/features/system-admin/public'

const {
  materialTypes,
  materialSpecs,
  selectedMaterialTypeId,
  newMaterialTypeName,
  newMaterialTypeUnit,
  newMaterialSpecName,
  isCreating,
  isDeleting,
  loadMaterialTypes,
  selectMaterialType,
  addMaterialType,
  addMaterialSpec,
  deleteMaterialType,
  deleteMaterialSpec,
  updateMaterialType,
  updateMaterialSpecName,
  reorderMaterialTypes,
  reorderMaterialSpecs,
} = useMaterialMaster()

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

async function load() {
  await loadMaterialTypes()
}

defineExpose({ load })
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <div class="space-y-2">
      <p class="text-xs text-muted-foreground font-medium">자재유형</p>
      <div class="flex gap-1">
        <Input
          v-model="newMaterialTypeName"
          placeholder="이름 입력"
          class="h-8 text-sm flex-1"
          @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addMaterialType() }"
        />
        <Input
          v-model="newMaterialTypeUnit"
          placeholder="단위"
          class="h-8 text-sm w-20"
          @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addMaterialType() }"
        />
        <Button
          size="sm"
          class="h-8 shrink-0"
          :disabled="isCreating || !newMaterialTypeName.trim()"
          @click="addMaterialType"
        >
          추가
        </Button>
      </div>
      <SortableReferenceList
        :items="materialTypes"
        :selected-id="selectedMaterialTypeId"
        :disabled="isDeleting"
        :display-suffix="(mt: any) => mt.unit ? `(${mt.unit})` : ''"
        unit-editable
        @select="selectMaterialType"
        @delete="(id, name) => openDeleteDialog(id, name, deleteMaterialType)"
        @update-name="({ id, name, unit }) => updateMaterialType(id, name, unit)"
        @reorder="reorderMaterialTypes"
      />
    </div>

    <div class="space-y-2">
      <p class="text-xs text-muted-foreground font-medium">자재규격</p>
      <div class="flex gap-1">
        <Input
          v-model="newMaterialSpecName"
          placeholder="이름 입력"
          class="h-8 text-sm"
          :disabled="!selectedMaterialTypeId"
          @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addMaterialSpec() }"
        />
        <Button
          size="sm"
          class="h-8 shrink-0"
          :disabled="isCreating || !newMaterialSpecName.trim() || !selectedMaterialTypeId"
          @click="addMaterialSpec"
        >
          추가
        </Button>
      </div>
      <SortableReferenceList
        :items="materialSpecs"
        :selectable="false"
        :disabled="isDeleting"
        :empty-message="selectedMaterialTypeId ? '항목 없음' : '자재유형을 선택하세요'"
        @delete="(id, name) => openDeleteDialog(id, name, deleteMaterialSpec)"
        @update-name="({ id, name }) => updateMaterialSpecName(id, name)"
        @reorder="reorderMaterialSpecs"
      />
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
</template>
