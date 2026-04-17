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
import { useWorkClassification } from '@/features/system-admin/public'

const {
  divisions,
  filteredWorkTypes,
  subWorkTypes,
  selectedDivisionId,
  selectedIsStructure,
  selectedWorkTypeId,
  selectedSubWorkTypeId,
  newDivisionName,
  newWorkTypeName,
  newSubWorkTypeName,
  isCreating,
  isDeleting,
  loadDivisions,
  selectDivision,
  selectIsStructure,
  selectWorkType,
  selectSubWorkType,
  addDivision,
  addWorkType,
  addSubWorkType,
  deleteDivision,
  deleteWorkType,
  deleteSubWorkType,
  updateDivisionName,
  updateWorkTypeName,
  updateSubWorkTypeName,
  reorderDivisions,
  reorderWorkTypes,
  reorderSubWorkTypes,
} = useWorkClassification()

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
  await loadDivisions()
}

defineExpose({ load })
</script>

<template>
  <div class="grid grid-cols-[1fr_auto_1fr_1fr] gap-4">
    <div class="space-y-2">
      <p class="text-xs text-muted-foreground font-medium">분류</p>
      <div class="flex gap-1">
        <Input
          v-model="newDivisionName"
          placeholder="이름 입력"
          class="h-8 text-sm"
          @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addDivision() }"
        />
        <Button
          size="sm"
          class="h-8 shrink-0"
          :disabled="isCreating || !newDivisionName.trim()"
          @click="addDivision"
        >
          추가
        </Button>
      </div>
      <SortableReferenceList
        :items="divisions"
        :selected-id="selectedDivisionId"
        :disabled="isDeleting"
        @select="selectDivision"
        @delete="(id, name) => openDeleteDialog(id, name, deleteDivision)"
        @update-name="({ id, name }) => updateDivisionName(id, name)"
        @reorder="reorderDivisions"
      />
    </div>

    <div class="space-y-2 w-24">
      <p class="text-xs text-muted-foreground font-medium">구분</p>
      <div class="flex flex-col gap-1" :class="!selectedDivisionId ? 'opacity-50 pointer-events-none' : ''">
        <button
          class="px-2 py-2 text-sm rounded-md border transition-colors"
          :class="selectedIsStructure === true ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-background border-border text-foreground hover:bg-muted'"
          @click="selectIsStructure(true)"
        >
          구조
        </button>
        <button
          class="px-2 py-2 text-sm rounded-md border transition-colors"
          :class="selectedIsStructure === false ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-background border-border text-foreground hover:bg-muted'"
          @click="selectIsStructure(false)"
        >
          비구조
        </button>
      </div>
    </div>

    <div class="space-y-2">
      <p class="text-xs text-muted-foreground font-medium">공종</p>
      <div class="flex gap-1">
        <Input
          v-model="newWorkTypeName"
          placeholder="이름 입력"
          class="h-8 text-sm"
          :disabled="!selectedDivisionId || selectedIsStructure == null"
          @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addWorkType() }"
        />
        <Button
          size="sm"
          class="h-8 shrink-0"
          :disabled="isCreating || !newWorkTypeName.trim() || !selectedDivisionId || selectedIsStructure == null"
          @click="addWorkType"
        >
          추가
        </Button>
      </div>
      <SortableReferenceList
        :items="filteredWorkTypes"
        :selected-id="selectedWorkTypeId"
        :disabled="isDeleting"
        :empty-message="!selectedDivisionId ? '분류를 선택하세요' : selectedIsStructure == null ? '구조/비구조을 선택하세요' : '항목 없음'"
        @select="selectWorkType"
        @delete="(id, name) => openDeleteDialog(id, name, deleteWorkType)"
        @update-name="({ id, name }) => updateWorkTypeName(id, name)"
        @reorder="reorderWorkTypes"
      />
    </div>

    <div class="space-y-2">
      <p class="text-xs text-muted-foreground font-medium">세부공종</p>
      <div class="flex gap-1">
        <Input
          v-model="newSubWorkTypeName"
          placeholder="이름 입력"
          class="h-8 text-sm"
          :disabled="!selectedWorkTypeId"
          @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addSubWorkType() }"
        />
        <Button
          size="sm"
          class="h-8 shrink-0"
          :disabled="isCreating || !newSubWorkTypeName.trim() || !selectedWorkTypeId"
          @click="addSubWorkType"
        >
          추가
        </Button>
      </div>
      <SortableReferenceList
        :items="subWorkTypes"
        :selected-id="selectedSubWorkTypeId"
        :disabled="isDeleting"
        :empty-message="selectedWorkTypeId ? '항목 없음' : '공종을 선택하세요'"
        @select="selectSubWorkType"
        @delete="(id, name) => openDeleteDialog(id, name, deleteSubWorkType)"
        @update-name="({ id, name }) => updateSubWorkTypeName(id, name)"
        @reorder="reorderSubWorkTypes"
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
