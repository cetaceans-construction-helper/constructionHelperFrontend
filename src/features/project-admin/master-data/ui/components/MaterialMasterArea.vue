<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import SortableReferenceList from '@/shared/helper-ui/SortableReferenceList.vue'
import { useMaterialMaster } from '@/features/project-admin/master-data/view-model/useMaterialMaster'

const {
  materialTypes, materialSpecs, selectedMaterialTypeId,
  newMaterialTypeName, newMaterialTypeUnit, newMaterialSpecName,
  isCreating, isDeleting,
  loadMaterialTypes, selectMaterialType,
  addMaterialType, addMaterialSpec, deleteMaterialType, deleteMaterialSpec,
  updateMaterialType, updateMaterialSpecName,
  reorderMaterialTypes, reorderMaterialSpecs,
  stdMaterialTypes, stdMaterialSpecs,
  loadStdMaterialTypes, setMaterialTypeStandard, setMaterialSpecStandard,
} = useMaterialMaster()

onMounted(() => {
  loadMaterialTypes()
  loadStdMaterialTypes()
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
    <h3 class="text-sm font-semibold mb-3">자재분류</h3>
    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">자재유형 (MaterialType)</p>
        <div class="flex gap-1">
          <Input v-model="newMaterialTypeName" placeholder="이름 입력" class="h-8 text-sm flex-1"
            @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addMaterialType() }" />
          <Input v-model="newMaterialTypeUnit" placeholder="단위" class="h-8 text-sm w-20"
            @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addMaterialType() }" />
          <Button size="sm" class="h-8 shrink-0" :disabled="isCreating || !newMaterialTypeName.trim()" @click="addMaterialType">추가</Button>
        </div>
        <SortableReferenceList :items="materialTypes" :selected-id="selectedMaterialTypeId" :disabled="isDeleting"
          :display-suffix="(mt: any) => mt.unit ? `(${mt.unit})` : ''" unit-editable
          standard-mappable
          @select="selectMaterialType"
          @delete="(id, name) => openDeleteDialog(id, name, deleteMaterialType)"
          @update-name="({ id, name, unit }) => updateMaterialType(id, name, unit)"
          @reorder="reorderMaterialTypes"
          @map-standard="(id) => openStdDialog(id, materialTypes, stdMaterialTypes, setMaterialTypeStandard)"
        />
      </div>

      <div class="space-y-2">
        <p class="text-xs text-muted-foreground font-medium">자재규격 (MaterialSpec)</p>
        <div class="flex gap-1">
          <Input v-model="newMaterialSpecName" placeholder="이름 입력" class="h-8 text-sm" :disabled="!selectedMaterialTypeId"
            @keydown.enter="(e: KeyboardEvent) => { if (!e.isComposing) addMaterialSpec() }" />
          <Button size="sm" class="h-8 shrink-0" :disabled="isCreating || !newMaterialSpecName.trim() || !selectedMaterialTypeId" @click="addMaterialSpec">추가</Button>
        </div>
        <SortableReferenceList :items="materialSpecs" :selectable="false" :disabled="isDeleting"
          :empty-message="selectedMaterialTypeId ? '항목 없음' : '자재유형을 선택하세요'"
          standard-mappable
          @delete="(id, name) => openDeleteDialog(id, name, deleteMaterialSpec)"
          @update-name="({ id, name }) => updateMaterialSpecName(id, name)"
          @reorder="reorderMaterialSpecs"
          @map-standard="(id) => openStdDialog(id, materialSpecs, stdMaterialSpecs, setMaterialSpecStandard)"
        />
      </div>
    </div>

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
