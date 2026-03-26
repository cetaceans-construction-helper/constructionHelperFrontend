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

const showDeleteDialog = ref(false)
const deleteTargetId = ref<number | null>(null)
const deleteTargetName = ref('')
const deleteTargetType = ref<'zone' | 'floor'>('zone')

function openDeleteDialog(type: 'zone' | 'floor', id: number, name: string) {
  deleteTargetType.value = type
  deleteTargetId.value = id
  deleteTargetName.value = name
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (deleteTargetId.value != null) {
    if (deleteTargetType.value === 'zone') {
      await deleteZone(deleteTargetId.value)
    } else {
      await deleteFloor(deleteTargetId.value)
    }
  }
  showDeleteDialog.value = false
}

async function load() {
  await loadAll()
}

defineExpose({ load })
</script>

<template>
  <div class="grid grid-cols-2 gap-4">
    <!-- 구역 -->
    <div class="space-y-2">
      <h4 class="text-sm font-medium">구역</h4>
      <div class="flex gap-1">
        <Input
          v-model="newZone"
          placeholder="이름 입력"
          class="h-8 text-sm"
          @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addZone() }"
        />
        <Button
          size="sm"
          class="h-8 shrink-0"
          :disabled="isCreating.zone || !newZone.trim()"
          @click="addZone"
        >
          추가
        </Button>
      </div>
      <SortableReferenceList
        :items="zones"
        :selectable="false"
        :disabled="isDeleting.zone"
        @delete="(id, name) => openDeleteDialog('zone', id, name)"
        @update-name="({ id, name }) => updateZoneName(id, name)"
        @reorder="reorderZones"
      />
    </div>

    <!-- 층 -->
    <div class="space-y-2">
      <h4 class="text-sm font-medium">층</h4>
      <div class="flex gap-1">
        <Input
          v-model="newFloor"
          placeholder="이름 입력"
          class="h-8 text-sm"
          @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addFloor() }"
        />
        <Button
          size="sm"
          class="h-8 shrink-0"
          :disabled="isCreating.floor || !newFloor.trim()"
          @click="addFloor"
        >
          추가
        </Button>
      </div>
      <SortableReferenceList
        :items="floors"
        :selectable="false"
        :disabled="isDeleting.floor"
        @delete="(id, name) => openDeleteDialog('floor', id, name)"
        @update-name="({ id, name }) => updateFloorName(id, name)"
        @reorder="reorderFloors"
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
