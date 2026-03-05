<script setup lang="ts">
import { onMounted, ref } from 'vue'
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
import SortableReferenceList from '@/components/helper/SortableReferenceList.vue'
import { useMaterialMaster } from '@/features/project-admin/master-data/view-model/useMaterialMaster'

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

onMounted(() => {
  loadMaterialTypes()
})

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
    <h3 class="text-sm font-semibold mb-3">자재분류</h3>
    <div class="grid grid-cols-2 gap-4">
      <!-- MaterialType 컬럼 -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">자재유형 (MaterialType)</p>
        <div class="flex gap-1">
          <Input
            v-model="newMaterialTypeName"
            placeholder="이름 입력"
            class="h-8 text-sm flex-1"
            @keyup.enter="addMaterialType"
          />
          <Input
            v-model="newMaterialTypeUnit"
            placeholder="단위"
            class="h-8 text-sm w-20"
            @keyup.enter="addMaterialType"
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

      <!-- MaterialSpec 컬럼 -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">자재규격 (MaterialSpec)</p>
        <div class="flex gap-1">
          <Input
            v-model="newMaterialSpecName"
            placeholder="이름 입력"
            class="h-8 text-sm"
            :disabled="!selectedMaterialTypeId"
            @keyup.enter="addMaterialSpec"
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
  </div>
</template>
