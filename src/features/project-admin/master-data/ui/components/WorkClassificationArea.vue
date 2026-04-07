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
import { useWorkClassification } from '@/features/project-admin/master-data/view-model/useWorkClassification'

const {
  divisions, workTypes, subWorkTypes, workSteps,
  selectedDivisionId, selectedWorkTypeId, selectedSubWorkTypeId,
  newDivisionName, newWorkTypeName, newSubWorkTypeName, newWorkStepName,
  isCreating, isDeleting,
  loadDivisions, selectDivision, selectWorkType, selectSubWorkType,
  addDivision, addWorkType, addSubWorkType, addWorkStep,
  deleteDivision, deleteWorkType, deleteSubWorkType, deleteWorkStep,
  updateDivisionName, updateWorkTypeName, updateSubWorkTypeName, updateWorkStepName,
  reorderDivisions, reorderWorkTypes, reorderSubWorkTypes, reorderWorkSteps,
  stdDivisions, stdWorkTypes, stdSubWorkTypes, stdWorkSteps,
  loadStdDivisions,
  setDivisionStandard, setWorkTypeStandard, setSubWorkTypeStandard, setWorkStepStandard,
} = useWorkClassification()

onMounted(() => {
  loadDivisions()
  loadStdDivisions()
})

// 삭제 다이얼로그
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

// 표준 매핑 다이얼로그
const showStdDialog = ref(false)
const stdDialogTargetId = ref<number | null>(null)
const stdDialogTargetName = ref('')
const stdDialogSelectedStdId = ref<number | null>(null)
const stdDialogOptions = ref<{ id: number; name: string }[]>([])
const stdDialogSaveFn = ref<((id: number, stdId: number | null) => Promise<void>) | null>(null)

type StdItem = { id: number; name: string; standardId?: number | null; [key: string]: unknown }

function openStdDialog(id: number, items: StdItem[], stdOptions: { id: number; name: string }[], saveFn: (id: number, stdId: number | null) => Promise<void>) {
  const item = items.find((i) => i.id === id)
  if (!item) return
  stdDialogTargetId.value = id
  stdDialogTargetName.value = item.name
  stdDialogSelectedStdId.value = item.standardId ?? null
  stdDialogOptions.value = stdOptions
  stdDialogSaveFn.value = saveFn
  showStdDialog.value = true
}

async function saveStdMapping() {
  if (stdDialogTargetId.value != null && stdDialogSaveFn.value) {
    await stdDialogSaveFn.value(stdDialogTargetId.value, stdDialogSelectedStdId.value)
  }
  showStdDialog.value = false
}
</script>

<template>
  <div>
    <h3 class="text-sm font-semibold mb-3">공종분류</h3>
    <div class="grid grid-cols-4 gap-4">
      <!-- Division -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">분류 (Division)</p>
        <div class="flex gap-1">
          <Input v-model="newDivisionName" placeholder="이름 입력" class="h-8 text-sm"
            @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addDivision() }" />
          <Button size="sm" class="h-8 shrink-0" :disabled="isCreating || !newDivisionName.trim()" @click="addDivision">추가</Button>
        </div>
        <SortableReferenceList :items="divisions" :selected-id="selectedDivisionId" :disabled="isDeleting"
          standard-mappable
          @select="selectDivision"
          @delete="(id, name) => openDeleteDialog(id, name, deleteDivision)"
          @update-name="({ id, name }) => updateDivisionName(id, name)"
          @reorder="reorderDivisions"
          @map-standard="(id) => openStdDialog(id, divisions, stdDivisions, setDivisionStandard)"
        />
      </div>

      <!-- WorkType -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">공종 (WorkType)</p>
        <div class="flex gap-1">
          <Input v-model="newWorkTypeName" placeholder="이름 입력" class="h-8 text-sm" :disabled="!selectedDivisionId"
            @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addWorkType() }" />
          <Button size="sm" class="h-8 shrink-0" :disabled="isCreating || !newWorkTypeName.trim() || !selectedDivisionId" @click="addWorkType">추가</Button>
        </div>
        <SortableReferenceList :items="workTypes" :selected-id="selectedWorkTypeId" :disabled="isDeleting"
          :empty-message="selectedDivisionId ? '항목 없음' : '분류를 선택하세요'"
          unit-editable unit-key="displayName" unit-label="표시이름"
          :display-suffix="(wt: any) => wt.displayName ? `(${wt.displayName})` : ''"
          standard-mappable
          @select="selectWorkType"
          @delete="(id, name) => openDeleteDialog(id, name, deleteWorkType)"
          @update-name="({ id, name, unit }) => updateWorkTypeName(id, name, unit)"
          @reorder="reorderWorkTypes"
          @map-standard="(id) => openStdDialog(id, workTypes, stdWorkTypes, setWorkTypeStandard)"
        />
      </div>

      <!-- SubWorkType -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">세부공종 (SubWorkType)</p>
        <div class="flex gap-1">
          <Input v-model="newSubWorkTypeName" placeholder="이름 입력" class="h-8 text-sm" :disabled="!selectedWorkTypeId"
            @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addSubWorkType() }" />
          <Button size="sm" class="h-8 shrink-0" :disabled="isCreating || !newSubWorkTypeName.trim() || !selectedWorkTypeId" @click="addSubWorkType">추가</Button>
        </div>
        <SortableReferenceList :items="subWorkTypes" :selected-id="selectedSubWorkTypeId" :disabled="isDeleting"
          :empty-message="selectedWorkTypeId ? '항목 없음' : '공종을 선택하세요'"
          standard-mappable
          @select="selectSubWorkType"
          @delete="(id, name) => openDeleteDialog(id, name, deleteSubWorkType)"
          @update-name="({ id, name }) => updateSubWorkTypeName(id, name)"
          @reorder="reorderSubWorkTypes"
          @map-standard="(id) => openStdDialog(id, subWorkTypes, stdSubWorkTypes, setSubWorkTypeStandard)"
        />
      </div>

      <!-- WorkStep -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">작업절차 (WorkStep)</p>
        <div class="flex gap-1">
          <Input v-model="newWorkStepName" placeholder="이름 입력" class="h-8 text-sm" :disabled="!selectedSubWorkTypeId"
            @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addWorkStep() }" />
          <Button size="sm" class="h-8 shrink-0" :disabled="isCreating || !newWorkStepName.trim() || !selectedSubWorkTypeId" @click="addWorkStep">추가</Button>
        </div>
        <SortableReferenceList :items="workSteps" :selectable="false" :disabled="isDeleting"
          :empty-message="selectedSubWorkTypeId ? '항목 없음' : '세부공종을 선택하세요'"
          standard-mappable
          @delete="(id, name) => openDeleteDialog(id, name, deleteWorkStep)"
          @update-name="({ id, name }) => updateWorkStepName(id, name)"
          @reorder="reorderWorkSteps"
          @map-standard="(id) => openStdDialog(id, workSteps, stdWorkSteps, setWorkStepStandard)"
        />
      </div>
    </div>

    <!-- 삭제 확인 -->
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

    <!-- 표준 매핑 다이얼로그 -->
    <Dialog :open="showStdDialog" @update:open="showStdDialog = $event">
      <DialogContent class="max-w-sm">
        <DialogHeader>
          <DialogTitle>표준 매핑 — {{ stdDialogTargetName }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-2 py-2">
          <Select v-model="stdDialogSelectedStdId">
            <SelectTrigger class="h-9">
              <SelectValue placeholder="표준 항목 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="std in stdDialogOptions" :key="std.id" :value="std.id">{{ std.name }}</SelectItem>
            </SelectContent>
          </Select>
          <button v-if="stdDialogSelectedStdId" class="text-xs text-muted-foreground hover:text-foreground"
            @click="stdDialogSelectedStdId = null">매핑 해제</button>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showStdDialog = false">취소</Button>
          <Button @click="saveStdMapping">저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
