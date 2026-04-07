<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import SortableReferenceList from '@/shared/helper-ui/SortableReferenceList.vue'
import { useStandardEquipment } from '@/features/system-admin/view-model/useStandardEquipment'

const {
  equipmentTypes, equipmentSpecs,
  selectedEquipmentTypeId,
  newEquipmentTypeName, newEquipmentSpecName,
  isCreating, isDeleting,
  loadEquipmentTypes, selectEquipmentType,
  addEquipmentType, addEquipmentSpec,
  deleteEquipmentType, deleteEquipmentSpec,
  updateEquipmentTypeName, updateEquipmentSpecName,
} = useStandardEquipment()

onMounted(() => { loadEquipmentTypes() })

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
    <h3 class="text-sm font-semibold mb-3">표준 장비</h3>
    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">장비타입</p>
        <div class="flex gap-1">
          <Input v-model="newEquipmentTypeName" placeholder="이름 입력" class="h-8 text-sm"
            @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addEquipmentType() }" />
          <Button size="sm" class="h-8 shrink-0" :disabled="isCreating || !newEquipmentTypeName.trim()" @click="addEquipmentType">추가</Button>
        </div>
        <SortableReferenceList :items="equipmentTypes" :selected-id="selectedEquipmentTypeId" :disabled="isDeleting"
          @select="selectEquipmentType"
          @delete="(id, name) => openDeleteDialog(id, name, deleteEquipmentType)"
          @update-name="({ id, name }) => updateEquipmentTypeName(id, name)" />
      </div>

      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">장비규격</p>
        <div class="flex gap-1">
          <Input v-model="newEquipmentSpecName" placeholder="이름 입력" class="h-8 text-sm" :disabled="!selectedEquipmentTypeId"
            @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addEquipmentSpec() }" />
          <Button size="sm" class="h-8 shrink-0" :disabled="isCreating || !newEquipmentSpecName.trim() || !selectedEquipmentTypeId" @click="addEquipmentSpec">추가</Button>
        </div>
        <SortableReferenceList :items="equipmentSpecs" :selectable="false" :disabled="isDeleting"
          :empty-message="selectedEquipmentTypeId ? '항목 없음' : '장비타입을 선택하세요'"
          @delete="(id, name) => openDeleteDialog(id, name, deleteEquipmentSpec)"
          @update-name="({ id, name }) => updateEquipmentSpecName(id, name)" />
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
