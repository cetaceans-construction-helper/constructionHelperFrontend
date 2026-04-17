<script setup lang="ts">
import { ref } from 'vue'
import { X } from 'lucide-vue-next'
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
import { useComponentCode } from '@/features/project-admin/master-data/public'

const {
  selectedIsStructure,
  componentTypes,
  componentCodes,
  selectedComponentTypeId,
  newComponentCode,
  isCreatingCode,
  isDeletingCode,
  addComponentCode,
  deleteComponentCode,
} = useComponentCode()

function selectIsStructure(value: boolean) {
  selectedIsStructure.value = selectedIsStructure.value === value ? null : value
}

function selectComponentType(id: number) {
  selectedComponentTypeId.value = id
}

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
  // no-op; panel 내부에서 토글로 로드
}

defineExpose({ load })
</script>

<template>
  <div class="grid grid-cols-3 gap-4">
    <div class="space-y-2">
      <p class="text-xs text-muted-foreground font-medium">부재 구분</p>
      <div class="flex gap-2">
        <button
          class="flex-1 px-3 py-2 text-sm rounded-md border transition-colors"
          :class="selectedIsStructure === true ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-background border-border text-foreground hover:bg-muted'"
          @click="selectIsStructure(true)"
        >
          구조
        </button>
        <button
          class="flex-1 px-3 py-2 text-sm rounded-md border transition-colors"
          :class="selectedIsStructure === false ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-background border-border text-foreground hover:bg-muted'"
          @click="selectIsStructure(false)"
        >
          비구조
        </button>
      </div>
    </div>

    <div class="space-y-2">
      <p class="text-xs text-muted-foreground font-medium">부재 타입</p>
      <p class="text-[10px] text-muted-foreground">※ 시스템 관리자가 관리합니다. 여기서는 선택만 가능.</p>
      <SortableReferenceList
        :items="componentTypes"
        :selected-id="selectedComponentTypeId"
        :sortable="false"
        :deletable="false"
        :editable="false"
        :empty-message="selectedIsStructure == null ? '구조/비구조을 선택하세요' : '항목 없음'"
        @select="selectComponentType"
      />
    </div>

    <div class="space-y-2">
      <p class="text-xs text-muted-foreground font-medium">부재 코드</p>
      <div class="flex gap-1">
        <Input
          v-model="newComponentCode"
          placeholder="코드 입력"
          class="h-8 text-sm"
          :disabled="selectedComponentTypeId == null"
          @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addComponentCode() }"
        />
        <Button
          size="sm"
          class="h-8 shrink-0"
          :disabled="isCreatingCode || !newComponentCode.trim() || selectedComponentTypeId == null"
          @click="addComponentCode"
        >
          추가
        </Button>
      </div>
      <div class="space-y-1 max-h-48 overflow-y-auto">
        <div
          v-for="cc in componentCodes"
          :key="cc.id"
          class="flex items-center px-3 py-2 border rounded-md text-sm border-border"
        >
          <span class="flex-1 truncate">{{ cc.code }}</span>
          <button
            class="ml-1 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
            :disabled="isDeletingCode"
            @click.stop="openDeleteDialog(cc.id, cc.code, deleteComponentCode)"
          >
            <X class="w-3 h-3" />
          </button>
        </div>
        <p
          v-if="selectedComponentTypeId != null && componentCodes.length === 0"
          class="text-xs text-muted-foreground py-2 text-center"
        >
          항목 없음
        </p>
        <p
          v-if="selectedComponentTypeId == null"
          class="text-xs text-muted-foreground py-2 text-center"
        >
          부재 타입을 선택하세요
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
</template>
