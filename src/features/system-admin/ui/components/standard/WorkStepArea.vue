<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/shared/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/shared/ui/dialog'
import SortableReferenceList from '@/shared/helper-ui/SortableReferenceList.vue'
import { useWorkStepMaster } from '@/features/system-admin/view-model/standard/useWorkStepMaster'

const {
  divisions, workTypes, subWorkTypes, componentTypes, workSteps,
  selectedDivisionId, selectedWorkTypeId, selectedSubWorkTypeId,
  newWorkStepName, newWorkStepComponentTypeId,
  isCreating, isDeleting,
  loadDivisions, loadComponentTypes,
  addWorkStep, deleteWorkStep, updateWorkStepName, updateWorkStepComponentType, reorderWorkSteps,
  getComponentTypeName,
} = useWorkStepMaster()

onMounted(() => {
  loadDivisions()
  loadComponentTypes()
})

// 삭제 다이얼로그
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
    await deleteWorkStep(deleteTargetId.value)
  }
  showDeleteDialog.value = false
}

// ComponentType 변경 다이얼로그
const showCtypeDialog = ref(false)
const ctypeTargetId = ref<number | null>(null)
const ctypeTargetName = ref('')
const ctypeSelected = ref<number | null>(null)

function openCtypeDialog(workStepId: number) {
  const ws = workSteps.value.find((w) => w.id === workStepId)
  if (!ws) return
  ctypeTargetId.value = ws.id
  ctypeTargetName.value = ws.name
  ctypeSelected.value = ws.componentTypeId ?? null
  showCtypeDialog.value = true
}

async function saveCtype() {
  if (ctypeTargetId.value != null && ctypeSelected.value != null) {
    await updateWorkStepComponentType(ctypeTargetId.value, ctypeSelected.value)
  }
  showCtypeDialog.value = false
}

function workStepSuffix(ws: { componentTypeId: number }): string {
  const name = getComponentTypeName(ws.componentTypeId)
  return name ? ` · ${name}` : ''
}
</script>

<template>
  <div>
    <h3 class="text-sm font-semibold mb-3">작업절차 (WorkStep)</h3>

    <!-- 상위 분류 셀렉터: 3단 -->
    <div class="grid grid-cols-3 gap-2 mb-4">
      <div class="space-y-1">
        <p class="text-xs text-muted-foreground font-medium">분류 (Division)</p>
        <Select :model-value="selectedDivisionId != null ? String(selectedDivisionId) : ''"
          @update:model-value="(v: any) => selectedDivisionId = v ? Number(v) : null">
          <SelectTrigger class="h-8 text-sm">
            <SelectValue placeholder="분류 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="d in divisions" :key="d.id" :value="String(d.id)">{{ d.name }}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-1">
        <p class="text-xs text-muted-foreground font-medium">공종 (WorkType)</p>
        <Select :model-value="selectedWorkTypeId != null ? String(selectedWorkTypeId) : ''" :disabled="!selectedDivisionId"
          @update:model-value="(v: any) => selectedWorkTypeId = v ? Number(v) : null">
          <SelectTrigger class="h-8 text-sm">
            <SelectValue :placeholder="selectedDivisionId ? '공종 선택' : '분류를 먼저 선택'" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="wt in workTypes" :key="wt.id" :value="String(wt.id)">
              {{ wt.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="space-y-1">
        <p class="text-xs text-muted-foreground font-medium">세부공종 (SubWorkType)</p>
        <Select :model-value="selectedSubWorkTypeId != null ? String(selectedSubWorkTypeId) : ''" :disabled="!selectedWorkTypeId"
          @update:model-value="(v: any) => selectedSubWorkTypeId = v ? Number(v) : null">
          <SelectTrigger class="h-8 text-sm">
            <SelectValue :placeholder="selectedWorkTypeId ? '세부공종 선택' : '공종을 먼저 선택'" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="swt in subWorkTypes" :key="swt.id" :value="String(swt.id)">{{ swt.name }}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <!-- WorkStep 생성 + 목록 -->
    <div class="space-y-2">
      <!-- ComponentType + 이름 입력 -->
      <div class="grid grid-cols-2 gap-2">
        <Select v-model="newWorkStepComponentTypeId" :disabled="!selectedSubWorkTypeId">
          <SelectTrigger class="h-8 text-sm">
            <SelectValue placeholder="부재타입 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="ct in componentTypes" :key="ct.id" :value="ct.id">{{ ct.name }}</SelectItem>
          </SelectContent>
        </Select>
        <div class="flex gap-1">
          <Input v-model="newWorkStepName" placeholder="작업절차 이름" class="h-8 text-sm"
            :disabled="!selectedSubWorkTypeId || newWorkStepComponentTypeId == null"
            @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addWorkStep() }" />
          <Button size="sm" class="h-8 shrink-0"
            :disabled="isCreating || !newWorkStepName.trim() || !selectedSubWorkTypeId || newWorkStepComponentTypeId == null"
            @click="addWorkStep">추가</Button>
        </div>
      </div>

      <SortableReferenceList :items="workSteps" :disabled="isDeleting"
        :empty-message="selectedSubWorkTypeId ? '항목 없음' : '세부공종을 선택하세요'"
        :display-suffix="(ws: any) => workStepSuffix(ws)"
        @select="(id) => openCtypeDialog(id)"
        @delete="(id, name) => openDeleteDialog(id, name)"
        @update-name="({ id, name }) => updateWorkStepName(id, name)"
        @reorder="reorderWorkSteps"
      />
    </div>

    <!-- 삭제 확인 -->
    <AlertDialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>삭제 확인</AlertDialogTitle>
          <AlertDialogDescription>'{{ deleteTargetName }}' 작업절차를 삭제하시겠습니까?</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction @click="confirmDelete">삭제</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- ComponentType 변경 다이얼로그 -->
    <Dialog :open="showCtypeDialog" @update:open="showCtypeDialog = $event">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>부재타입 변경 — {{ ctypeTargetName }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-2 py-2">
          <Select v-model="ctypeSelected">
            <SelectTrigger class="h-9">
              <SelectValue placeholder="부재타입 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="ct in componentTypes" :key="ct.id" :value="ct.id">{{ ct.name }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showCtypeDialog = false">취소</Button>
          <Button :disabled="ctypeSelected == null" @click="saveCtype">저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
