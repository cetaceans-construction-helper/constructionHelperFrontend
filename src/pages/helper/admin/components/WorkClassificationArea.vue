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
import { useWorkClassification } from '../composables/useWorkClassification'

const {
  divisions,
  workTypes,
  subWorkTypes,
  workSteps,
  selectedDivisionId,
  selectedWorkTypeId,
  selectedSubWorkTypeId,
  newDivisionName,
  newWorkTypeName,
  newSubWorkTypeName,
  newWorkStepName,
  isCreating,
  isDeleting,
  loadDivisions,
  selectDivision,
  selectWorkType,
  selectSubWorkType,
  addDivision,
  addWorkType,
  addSubWorkType,
  addWorkStep,
  deleteDivision,
  deleteWorkType,
  deleteSubWorkType,
  deleteWorkStep,
} = useWorkClassification()

onMounted(() => {
  loadDivisions()
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
    <h3 class="text-sm font-semibold mb-3">공종분류</h3>
    <div class="grid grid-cols-4 gap-4">
      <!-- Division 컬럼 -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">분류 (Division)</p>
        <div class="flex gap-1">
          <Input
            v-model="newDivisionName"
            placeholder="이름 입력"
            class="h-8 text-sm"
            @keyup.enter="addDivision"
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
        <div class="space-y-1 max-h-48 overflow-y-auto">
          <div
            v-for="div in divisions"
            :key="div.id"
            class="flex items-center px-3 py-2 border rounded-md cursor-pointer text-sm transition-colors"
            :class="{
              'border-primary bg-primary/10 font-medium': selectedDivisionId === div.id,
              'border-border hover:bg-muted/50': selectedDivisionId !== div.id,
            }"
            @click="selectDivision(div.id)"
          >
            <span class="flex-1 truncate">{{ div.name }}</span>
            <button
              class="ml-1 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
              :disabled="isDeleting"
              @click.stop="openDeleteDialog(div.id, div.name, deleteDivision)"
            >
              <X class="w-3 h-3" />
            </button>
          </div>
          <p v-if="divisions.length === 0" class="text-xs text-muted-foreground py-2 text-center">
            항목 없음
          </p>
        </div>
      </div>

      <!-- WorkType 컬럼 -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">공종 (WorkType)</p>
        <div class="flex gap-1">
          <Input
            v-model="newWorkTypeName"
            placeholder="이름 입력"
            class="h-8 text-sm"
            :disabled="!selectedDivisionId"
            @keyup.enter="addWorkType"
          />
          <Button
            size="sm"
            class="h-8 shrink-0"
            :disabled="isCreating || !newWorkTypeName.trim() || !selectedDivisionId"
            @click="addWorkType"
          >
            추가
          </Button>
        </div>
        <div class="space-y-1 max-h-48 overflow-y-auto">
          <div
            v-for="wt in workTypes"
            :key="wt.id"
            class="flex items-center px-3 py-2 border rounded-md cursor-pointer text-sm transition-colors"
            :class="{
              'border-primary bg-primary/10 font-medium': selectedWorkTypeId === wt.id,
              'border-border hover:bg-muted/50': selectedWorkTypeId !== wt.id,
            }"
            @click="selectWorkType(wt.id)"
          >
            <span class="flex-1 truncate">{{ wt.name }}</span>
            <button
              class="ml-1 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
              :disabled="isDeleting"
              @click.stop="openDeleteDialog(wt.id, wt.name, deleteWorkType)"
            >
              <X class="w-3 h-3" />
            </button>
          </div>
          <p
            v-if="selectedDivisionId && workTypes.length === 0"
            class="text-xs text-muted-foreground py-2 text-center"
          >
            항목 없음
          </p>
          <p
            v-if="!selectedDivisionId"
            class="text-xs text-muted-foreground py-2 text-center"
          >
            분류를 선택하세요
          </p>
        </div>
      </div>

      <!-- SubWorkType 컬럼 -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">세부공종 (SubWorkType)</p>
        <div class="flex gap-1">
          <Input
            v-model="newSubWorkTypeName"
            placeholder="이름 입력"
            class="h-8 text-sm"
            :disabled="!selectedWorkTypeId"
            @keyup.enter="addSubWorkType"
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
        <div class="space-y-1 max-h-48 overflow-y-auto">
          <div
            v-for="swt in subWorkTypes"
            :key="swt.id"
            class="flex items-center px-3 py-2 border rounded-md cursor-pointer text-sm transition-colors"
            :class="{
              'border-primary bg-primary/10 font-medium': selectedSubWorkTypeId === swt.id,
              'border-border hover:bg-muted/50': selectedSubWorkTypeId !== swt.id,
            }"
            @click="selectSubWorkType(swt.id)"
          >
            <span class="flex-1 truncate">{{ swt.name }}</span>
            <button
              class="ml-1 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
              :disabled="isDeleting"
              @click.stop="openDeleteDialog(swt.id, swt.name, deleteSubWorkType)"
            >
              <X class="w-3 h-3" />
            </button>
          </div>
          <p
            v-if="selectedWorkTypeId && subWorkTypes.length === 0"
            class="text-xs text-muted-foreground py-2 text-center"
          >
            항목 없음
          </p>
          <p
            v-if="!selectedWorkTypeId"
            class="text-xs text-muted-foreground py-2 text-center"
          >
            공종을 선택하세요
          </p>
        </div>
      </div>

      <!-- WorkStep 컬럼 -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">작업절차 (WorkStep)</p>
        <div class="flex gap-1">
          <Input
            v-model="newWorkStepName"
            placeholder="이름 입력"
            class="h-8 text-sm"
            :disabled="!selectedSubWorkTypeId"
            @keyup.enter="addWorkStep"
          />
          <Button
            size="sm"
            class="h-8 shrink-0"
            :disabled="isCreating || !newWorkStepName.trim() || !selectedSubWorkTypeId"
            @click="addWorkStep"
          >
            추가
          </Button>
        </div>
        <div class="space-y-1 max-h-48 overflow-y-auto">
          <div
            v-for="ws in workSteps"
            :key="ws.id"
            class="flex items-center px-3 py-2 border rounded-md text-sm border-border"
          >
            <span class="flex-1 truncate">{{ ws.name }}</span>
            <button
              class="ml-1 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
              :disabled="isDeleting"
              @click.stop="openDeleteDialog(ws.id, ws.name, deleteWorkStep)"
            >
              <X class="w-3 h-3" />
            </button>
          </div>
          <p
            v-if="selectedSubWorkTypeId && workSteps.length === 0"
            class="text-xs text-muted-foreground py-2 text-center"
          >
            항목 없음
          </p>
          <p
            v-if="!selectedSubWorkTypeId"
            class="text-xs text-muted-foreground py-2 text-center"
          >
            세부공종을 선택하세요
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
