<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import SortableReferenceList from '@/shared/helper-ui/SortableReferenceList.vue'
import { useWorkClassification } from '@/features/system-admin/view-model/standard/useWorkClassification'

const {
  divisions, filteredWorkTypes, subWorkTypes,
  selectedDivisionId, selectedIsStructure, selectedWorkTypeId, selectedSubWorkTypeId,
  newDivisionName, newWorkTypeName, newSubWorkTypeName,
  isCreating, isDeleting,
  loadDivisions, selectDivision, selectIsStructure, selectWorkType, selectSubWorkType,
  addDivision, addWorkType, addSubWorkType,
  deleteDivision, deleteWorkType, deleteSubWorkType,
  updateDivisionName, updateWorkTypeName, updateWorkTypeIsStructure, updateSubWorkTypeName,
  reorderDivisions, reorderWorkTypes, reorderSubWorkTypes,
} = useWorkClassification()

onMounted(() => {
  loadDivisions()
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

// 구조/비구조 변경 확인 다이얼로그 (현재 isStructure 의 반대 값으로 토글)
const showIsStructureDialog = ref(false)
const isStructureTargetId = ref<number | null>(null)
const isStructureTargetName = ref('')
const isStructureTargetValue = ref<boolean | null>(null)

function openIsStructureDialog(wt: { id: number; name: string; isStructure: boolean | null }) {
  isStructureTargetId.value = wt.id
  isStructureTargetName.value = wt.name
  // 현재 값의 반대로 토글 (null 이면 구조 로 전환)
  isStructureTargetValue.value = wt.isStructure === true ? false : true
  showIsStructureDialog.value = true
}

async function confirmIsStructureChange() {
  if (isStructureTargetId.value != null && isStructureTargetValue.value != null) {
    await updateWorkTypeIsStructure(isStructureTargetId.value, isStructureTargetValue.value)
  }
  showIsStructureDialog.value = false
}
</script>

<template>
  <div>
    <h3 class="text-sm font-semibold mb-3">공종분류</h3>
    <div class="grid grid-cols-[1fr_auto_1fr_1fr] gap-4">
      <!-- Division -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">분류 (Division)</p>
        <div class="flex gap-1">
          <Input v-model="newDivisionName" placeholder="이름 입력" class="h-8 text-sm"
            @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addDivision() }" />
          <Button size="sm" class="h-8 shrink-0" :disabled="isCreating || !newDivisionName.trim()" @click="addDivision">추가</Button>
        </div>
        <SortableReferenceList :items="divisions" :selected-id="selectedDivisionId" :disabled="isDeleting"
          @select="selectDivision"
          @delete="(id, name) => openDeleteDialog(id, name, deleteDivision)"
          @update-name="({ id, name }) => updateDivisionName(id, name)"
          @reorder="reorderDivisions"
        />
      </div>

      <!-- isStructure 필터 -->
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

      <!-- WorkType (isStructure 로 필터됨) -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">공종 (WorkType)</p>
        <div class="flex gap-1">
          <Input v-model="newWorkTypeName" placeholder="이름 입력" class="h-8 text-sm" :disabled="!selectedDivisionId || selectedIsStructure == null"
            @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addWorkType() }" />
          <Button size="sm" class="h-8 shrink-0" :disabled="isCreating || !newWorkTypeName.trim() || !selectedDivisionId || selectedIsStructure == null" @click="addWorkType">추가</Button>
        </div>
        <SortableReferenceList :items="filteredWorkTypes" :selected-id="selectedWorkTypeId" :disabled="isDeleting"
          :empty-message="!selectedDivisionId ? '분류를 선택하세요' : selectedIsStructure == null ? '구조/비구조을 선택하세요' : '항목 없음'"
          @select="selectWorkType"
          @delete="(id, name) => openDeleteDialog(id, name, deleteWorkType)"
          @update-name="({ id, name }) => updateWorkTypeName(id, name)"
          @reorder="reorderWorkTypes"
        >
          <template #edit-actions="{ item }">
            <button
              class="px-1.5 py-0.5 text-[10px] rounded border border-border text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
              :title="item.isStructure === true ? '비구조로 변경' : '구조로 변경'"
              @click.stop="openIsStructureDialog(item as any)"
            >
              {{ item.isStructure === true ? '→ 비구조' : '→ 구조' }}
            </button>
          </template>
        </SortableReferenceList>
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
          @select="selectSubWorkType"
          @delete="(id, name) => openDeleteDialog(id, name, deleteSubWorkType)"
          @update-name="({ id, name }) => updateSubWorkTypeName(id, name)"
          @reorder="reorderSubWorkTypes"
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

    <!-- 구조/비구조 변경 확인 -->
    <AlertDialog :open="showIsStructureDialog" @update:open="showIsStructureDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>구분 변경 확인</AlertDialogTitle>
          <AlertDialogDescription>
            '{{ isStructureTargetName }}' 공종을
            <strong>{{ isStructureTargetValue ? '구조' : '비구조' }}</strong>
            로 변경하시겠습니까?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction @click="confirmIsStructureChange">변경</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
