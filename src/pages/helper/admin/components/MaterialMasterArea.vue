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
import { useMaterialMaster } from '../composables/useMaterialMaster'

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
        <div class="space-y-1 max-h-48 overflow-y-auto">
          <div
            v-for="mt in materialTypes"
            :key="mt.id"
            class="flex items-center px-3 py-2 border rounded-md cursor-pointer text-sm transition-colors"
            :class="{
              'border-primary bg-primary/10 font-medium': selectedMaterialTypeId === mt.id,
              'border-border hover:bg-muted/50': selectedMaterialTypeId !== mt.id,
            }"
            @click="selectMaterialType(mt.id)"
          >
            <span class="flex-1 truncate">
              {{ mt.name }}
              <span v-if="mt.unit" class="text-muted-foreground">({{ mt.unit }})</span>
            </span>
            <button
              class="ml-1 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
              :disabled="isDeleting"
              @click.stop="openDeleteDialog(mt.id, mt.name, deleteMaterialType)"
            >
              <X class="w-3 h-3" />
            </button>
          </div>
          <p v-if="materialTypes.length === 0" class="text-xs text-muted-foreground py-2 text-center">
            항목 없음
          </p>
        </div>
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
        <div class="space-y-1 max-h-48 overflow-y-auto">
          <div
            v-for="ms in materialSpecs"
            :key="ms.id"
            class="flex items-center px-3 py-2 border rounded-md text-sm border-border"
          >
            <span class="flex-1 truncate">{{ ms.name }}</span>
            <button
              class="ml-1 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
              :disabled="isDeleting"
              @click.stop="openDeleteDialog(ms.id, ms.name, deleteMaterialSpec)"
            >
              <X class="w-3 h-3" />
            </button>
          </div>
          <p
            v-if="selectedMaterialTypeId && materialSpecs.length === 0"
            class="text-xs text-muted-foreground py-2 text-center"
          >
            항목 없음
          </p>
          <p
            v-if="!selectedMaterialTypeId"
            class="text-xs text-muted-foreground py-2 text-center"
          >
            자재유형을 선택하세요
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
