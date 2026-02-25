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
import { useEquipmentMaster } from '../composables/useEquipmentMaster'

const {
  equipmentTypes,
  equipmentSpecs,
  selectedEquipmentTypeId,
  newEquipmentTypeName,
  newEquipmentSpecName,
  isCreating,
  isDeleting,
  loadEquipmentTypes,
  selectEquipmentType,
  addEquipmentType,
  addEquipmentSpec,
  deleteEquipmentType,
  deleteEquipmentSpec,
} = useEquipmentMaster()

onMounted(() => {
  loadEquipmentTypes()
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
    <h3 class="text-sm font-semibold mb-3">장비분류</h3>
    <div class="grid grid-cols-2 gap-4">
      <!-- EquipmentType 컬럼 -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">장비유형 (EquipmentType)</p>
        <div class="flex gap-1">
          <Input
            v-model="newEquipmentTypeName"
            placeholder="이름 입력"
            class="h-8 text-sm flex-1"
            @keyup.enter="addEquipmentType"
          />
          <Button
            size="sm"
            class="h-8 shrink-0"
            :disabled="isCreating || !newEquipmentTypeName.trim()"
            @click="addEquipmentType"
          >
            추가
          </Button>
        </div>
        <div class="space-y-1 max-h-48 overflow-y-auto">
          <div
            v-for="et in equipmentTypes"
            :key="et.id"
            class="flex items-center px-3 py-2 border rounded-md cursor-pointer text-sm transition-colors"
            :class="{
              'border-primary bg-primary/10 font-medium': selectedEquipmentTypeId === et.id,
              'border-border hover:bg-muted/50': selectedEquipmentTypeId !== et.id,
            }"
            @click="selectEquipmentType(et.id)"
          >
            <span class="flex-1 truncate">{{ et.name }}</span>
            <button
              class="ml-1 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
              :disabled="isDeleting"
              @click.stop="openDeleteDialog(et.id, et.name, deleteEquipmentType)"
            >
              <X class="w-3 h-3" />
            </button>
          </div>
          <p v-if="equipmentTypes.length === 0" class="text-xs text-muted-foreground py-2 text-center">
            항목 없음
          </p>
        </div>
      </div>

      <!-- EquipmentSpec 컬럼 -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">장비규격 (EquipmentSpec)</p>
        <div class="flex gap-1">
          <Input
            v-model="newEquipmentSpecName"
            placeholder="이름 입력"
            class="h-8 text-sm"
            :disabled="!selectedEquipmentTypeId"
            @keyup.enter="addEquipmentSpec"
          />
          <Button
            size="sm"
            class="h-8 shrink-0"
            :disabled="isCreating || !newEquipmentSpecName.trim() || !selectedEquipmentTypeId"
            @click="addEquipmentSpec"
          >
            추가
          </Button>
        </div>
        <div class="space-y-1 max-h-48 overflow-y-auto">
          <div
            v-for="es in equipmentSpecs"
            :key="es.id"
            class="flex items-center px-3 py-2 border rounded-md text-sm border-border"
          >
            <span class="flex-1 truncate">{{ es.name }}</span>
            <button
              class="ml-1 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
              :disabled="isDeleting"
              @click.stop="openDeleteDialog(es.id, es.name, deleteEquipmentSpec)"
            >
              <X class="w-3 h-3" />
            </button>
          </div>
          <p
            v-if="selectedEquipmentTypeId && equipmentSpecs.length === 0"
            class="text-xs text-muted-foreground py-2 text-center"
          >
            항목 없음
          </p>
          <p
            v-if="!selectedEquipmentTypeId"
            class="text-xs text-muted-foreground py-2 text-center"
          >
            장비유형을 선택하세요
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
