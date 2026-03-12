<script setup lang="ts">
import { onMounted, ref } from 'vue'
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
import { useLaborType } from '@/features/project-admin/resource/view-model/useLaborType'

const {
  divisions,
  workTypes,
  laborTypes,
  selectedDivisionId,
  selectedWorkTypeId,
  newLaborTypeName,
  isCreating,
  isDeleting,
  loadDivisions,
  selectDivision,
  selectWorkType,
  addLaborType,
  deleteLaborType,
  updateLaborTypeName,
  reorderLaborTypes,
} = useLaborType()

onMounted(() => {
  loadDivisions()
})

// 삭제 다이얼로그 상태
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
    await deleteLaborType(deleteTargetId.value)
  }
  showDeleteDialog.value = false
}
</script>

<template>
  <div>
    <h3 class="text-sm font-semibold mb-3">직종 관리 (LaborType)</h3>
    <div class="grid grid-cols-3 gap-4">
      <!-- Division 컬럼 -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">분류 (Division)</p>
        <SortableReferenceList
          :items="divisions"
          :selected-id="selectedDivisionId"
          :selectable="true"
          :disabled="isDeleting"
          @select="selectDivision"
        />
      </div>

      <!-- WorkType 컬럼 -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">공종 (WorkType)</p>
        <SortableReferenceList
          :items="workTypes"
          :selected-id="selectedWorkTypeId"
          :selectable="true"
          :disabled="isDeleting"
          :empty-message="selectedDivisionId ? '항목 없음' : '분류를 선택하세요'"
          @select="selectWorkType"
        />
      </div>

      <!-- LaborType 컬럼 -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">직종 (LaborType)</p>
        <div class="flex gap-1">
          <Input
            v-model="newLaborTypeName"
            placeholder="직종명 입력"
            class="h-8 text-sm"
            :disabled="!selectedWorkTypeId"
            @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addLaborType() }"
          />
          <Button
            size="sm"
            class="h-8 shrink-0"
            :disabled="isCreating || !newLaborTypeName.trim() || !selectedWorkTypeId"
            @click="addLaborType"
          >
            추가
          </Button>
        </div>
        <SortableReferenceList
          :items="laborTypes"
          :selectable="false"
          :disabled="isDeleting"
          :empty-message="selectedWorkTypeId ? '항목 없음' : '공종을 선택하세요'"
          @delete="(id, name) => openDeleteDialog(id, name)"
          @update-name="({ id, name }) => updateLaborTypeName(id, name)"
          @reorder="reorderLaborTypes"
        />
      </div>
    </div>

    <AlertDialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>삭제 확인</AlertDialogTitle>
          <AlertDialogDescription>
            '{{ deleteTargetName }}' 직종을 삭제하시겠습니까?
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
