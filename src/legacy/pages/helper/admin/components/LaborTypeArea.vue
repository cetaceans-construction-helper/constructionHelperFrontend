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
import { useLaborType } from '../composables/useLaborType'

const {
  divisions,
  workTypes,
  subWorkTypes,
  laborTypes,
  selectedDivisionId,
  selectedWorkTypeId,
  selectedSubWorkTypeId,
  newLaborTypeName,
  isCreating,
  isDeleting,
  loadDivisions,
  loadLaborTypes,
  selectDivision,
  selectWorkType,
  selectSubWorkType,
  addLaborType,
  deleteLaborType,
} = useLaborType()

onMounted(() => {
  loadDivisions()
  loadLaborTypes()
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

    <!-- 직종 추가 폼 -->
    <div class="grid grid-cols-4 gap-4 mb-4">
      <!-- Division 컬럼 -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">분류 (Division)</p>
        <div class="space-y-1 max-h-36 overflow-y-auto">
          <div
            v-for="div in divisions"
            :key="div.id"
            class="px-3 py-2 border rounded-md cursor-pointer text-sm transition-colors"
            :class="{
              'border-primary bg-primary/10 font-medium': selectedDivisionId === div.id,
              'border-border hover:bg-muted/50': selectedDivisionId !== div.id,
            }"
            @click="selectDivision(div.id)"
          >
            {{ div.name }}
          </div>
          <p v-if="divisions.length === 0" class="text-xs text-muted-foreground py-2 text-center">
            항목 없음
          </p>
        </div>
      </div>

      <!-- WorkType 컬럼 -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">공종 (WorkType) *필수</p>
        <div class="space-y-1 max-h-36 overflow-y-auto">
          <div
            v-for="wt in workTypes"
            :key="wt.id"
            class="px-3 py-2 border rounded-md cursor-pointer text-sm transition-colors"
            :class="{
              'border-primary bg-primary/10 font-medium': selectedWorkTypeId === wt.id,
              'border-border hover:bg-muted/50': selectedWorkTypeId !== wt.id,
            }"
            @click="selectWorkType(wt.id)"
          >
            {{ wt.name }}
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

      <!-- SubWorkType 컬럼 (선택사항) -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">세부공종 (선택사항)</p>
        <div class="space-y-1 max-h-36 overflow-y-auto">
          <!-- 선택 안함 옵션 -->
          <div
            v-if="selectedWorkTypeId"
            class="px-3 py-2 border rounded-md cursor-pointer text-sm transition-colors"
            :class="{
              'border-primary bg-primary/10 font-medium': selectedSubWorkTypeId === null,
              'border-border hover:bg-muted/50': selectedSubWorkTypeId !== null,
            }"
            @click="selectSubWorkType(null)"
          >
            (선택 안함)
          </div>
          <div
            v-for="swt in subWorkTypes"
            :key="swt.id"
            class="px-3 py-2 border rounded-md cursor-pointer text-sm transition-colors"
            :class="{
              'border-primary bg-primary/10 font-medium': selectedSubWorkTypeId === swt.id,
              'border-border hover:bg-muted/50': selectedSubWorkTypeId !== swt.id,
            }"
            @click="selectSubWorkType(swt.id)"
          >
            {{ swt.name }}
          </div>
          <p
            v-if="!selectedWorkTypeId"
            class="text-xs text-muted-foreground py-2 text-center"
          >
            공종을 선택하세요
          </p>
        </div>
      </div>

      <!-- 직종 입력 컬럼 -->
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">직종명 입력</p>
        <div class="flex gap-1">
          <Input
            v-model="newLaborTypeName"
            placeholder="직종명 입력"
            class="h-8 text-sm"
            :disabled="!selectedWorkTypeId"
            @keyup.enter="addLaborType"
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
        <p v-if="!selectedWorkTypeId" class="text-xs text-muted-foreground">
          공종을 선택하세요
        </p>
      </div>
    </div>

    <!-- 전체 직종 목록 -->
    <div class="mt-4">
      <p class="text-xs text-muted-foreground font-medium mb-2">등록된 직종 목록</p>
      <div class="border rounded-md max-h-48 overflow-y-auto">
        <table class="w-full text-sm">
          <thead class="bg-muted/50 sticky top-0">
            <tr>
              <th class="text-left px-3 py-2 font-medium">직종명</th>
              <th class="text-left px-3 py-2 font-medium">공종</th>
              <th class="text-left px-3 py-2 font-medium">세부공종</th>
              <th class="w-10 px-2"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="lt in laborTypes"
              :key="lt.id"
              class="border-t border-border"
            >
              <td class="px-3 py-2">{{ lt.name }}</td>
              <td class="px-3 py-2 text-muted-foreground">{{ lt.workTypeName }}</td>
              <td class="px-3 py-2 text-muted-foreground">{{ lt.subWorkTypeName || '-' }}</td>
              <td class="px-2 text-center">
                <button
                  class="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  :disabled="isDeleting"
                  @click="openDeleteDialog(lt.id, lt.name)"
                >
                  <X class="w-3 h-3" />
                </button>
              </td>
            </tr>
            <tr v-if="laborTypes.length === 0">
              <td colspan="4" class="px-3 py-4 text-center text-muted-foreground">
                등록된 직종이 없습니다
              </td>
            </tr>
          </tbody>
        </table>
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
