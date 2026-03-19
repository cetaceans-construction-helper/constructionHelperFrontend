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
import { useLocationMaster } from '@/features/project-admin/master-data/public'
import type { ReferenceEditType } from '@/shared/helper-ui/reference-edit-panels/types'

const props = defineProps<{
  locationType: Extract<ReferenceEditType, 'zone' | 'floor'>
}>()

const {
  zones,
  floors,
  newZone,
  newFloor,
  isCreating,
  isDeleting,
  loadAll,
  addZone,
  addFloor,
  deleteZone,
  deleteFloor,
  updateZoneName,
  updateFloorName,
  reorderZones,
  reorderFloors,
} = useLocationMaster()

const config = {
  zone: {
    items: zones,
    input: newZone,
    key: 'zone',
    add: addZone,
    deleteFn: deleteZone,
    updateName: updateZoneName,
    reorder: reorderZones,
  },
  floor: {
    items: floors,
    input: newFloor,
    key: 'floor',
    add: addFloor,
    deleteFn: deleteFloor,
    updateName: updateFloorName,
    reorder: reorderFloors,
  },
} as const

const col = config[props.locationType]

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
    await col.deleteFn(deleteTargetId.value)
  }
  showDeleteDialog.value = false
}

async function load() {
  await loadAll()
}

defineExpose({ load })
</script>

<template>
  <div class="space-y-2">
    <div class="flex gap-1">
      <Input
        v-model="col.input.value"
        placeholder="이름 입력"
        class="h-8 text-sm"
        @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) col.add() }"
      />
      <Button
        size="sm"
        class="h-8 shrink-0"
        :disabled="isCreating[col.key] || !col.input.value.trim()"
        @click="col.add"
      >
        추가
      </Button>
    </div>
    <SortableReferenceList
      :items="col.items.value"
      :selectable="false"
      :disabled="isDeleting[col.key]"
      @delete="(id, name) => openDeleteDialog(id, name)"
      @update-name="({ id, name }) => col.updateName(id, name)"
      @reorder="col.reorder"
    />
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
