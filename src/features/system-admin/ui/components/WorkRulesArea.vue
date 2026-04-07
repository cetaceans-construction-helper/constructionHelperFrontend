<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/shared/ui/table'
import { Pencil, Check, X, Trash2 } from 'lucide-vue-next'
import { useWorkRules } from '@/features/system-admin/view-model/useWorkRules'

const {
  workRules, isLoading, isCreating, isDeleting,
  stdDivisions, stdWorkTypes, stdSubWorkTypes,
  filterDivisionId, filterWorkTypeId, filterSubWorkTypeId,
  formMode, formWorkTypeId, formSubWorkTypeId, formRules,
  editingId, editingRules,
  loadStdDivisions, loadStdWorkTypes, loadStdSubWorkTypes,
  loadWorkRules, createWorkRule,
  startEditing, cancelEditing, updateWorkRule, deleteWorkRule,
} = useWorkRules()

// 생성 폼용 표준 데이터
const formDivisionId = ref<number | null>(null)
const formStdWorkTypes = ref<{ id: number; name: string }[]>([])
const formStdSubWorkTypes = ref<{ id: number; name: string }[]>([])

onMounted(async () => {
  await loadStdDivisions()
  await loadWorkRules()
})

// 필터 캐스케이딩
watch(filterDivisionId, async (id) => {
  filterWorkTypeId.value = null
  filterSubWorkTypeId.value = null
  stdWorkTypes.value = []
  stdSubWorkTypes.value = []
  if (id) await loadStdWorkTypes(id)
  await loadWorkRules()
})

watch(filterWorkTypeId, async (id) => {
  filterSubWorkTypeId.value = null
  stdSubWorkTypes.value = []
  if (id) await loadStdSubWorkTypes(id)
  await loadWorkRules()
})

watch(filterSubWorkTypeId, async () => {
  await loadWorkRules()
})

// 폼 캐스케이딩
watch(formDivisionId, async (id) => {
  formWorkTypeId.value = null
  formSubWorkTypeId.value = null
  formStdWorkTypes.value = []
  formStdSubWorkTypes.value = []
  if (id) {
    const { standardApi } = await import('@/shared/network-core/apis/standard')
    formStdWorkTypes.value = await standardApi.workType.getList(id)
  }
})

watch(formWorkTypeId, async (id) => {
  formSubWorkTypeId.value = null
  formStdSubWorkTypes.value = []
  if (id && formMode.value === 'subWorkType') {
    const { standardApi } = await import('@/shared/network-core/apis/standard')
    formStdSubWorkTypes.value = await standardApi.subWorkType.getList(id)
  }
})

const showDeleteDialog = ref(false)
const deleteTargetId = ref<number | null>(null)

function openDeleteDialog(id: number) {
  deleteTargetId.value = id
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (deleteTargetId.value != null) {
    await deleteWorkRule(deleteTargetId.value)
  }
  showDeleteDialog.value = false
}

function getWorkTypeName(stdWorkTypeId: number | null) {
  if (!stdWorkTypeId) return '-'
  return `공종 #${stdWorkTypeId}`
}

function getSubWorkTypeName(stdSubWorkTypeId: number | null) {
  if (!stdSubWorkTypeId) return '-'
  return `소공종 #${stdSubWorkTypeId}`
}
</script>

<template>
  <div>
    <h3 class="text-sm font-semibold mb-3">작업 규칙</h3>

    <!-- 필터 -->
    <div class="flex gap-2 mb-4">
      <Select v-model="filterDivisionId">
        <SelectTrigger class="w-40 h-8 text-sm">
          <SelectValue placeholder="공사구분 필터" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="d in stdDivisions" :key="d.id" :value="d.id">{{ d.name }}</SelectItem>
        </SelectContent>
      </Select>
      <Select v-model="filterWorkTypeId" :disabled="!filterDivisionId">
        <SelectTrigger class="w-40 h-8 text-sm">
          <SelectValue placeholder="공종 필터" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="wt in stdWorkTypes" :key="wt.id" :value="wt.id">{{ wt.name }}</SelectItem>
        </SelectContent>
      </Select>
      <Select v-model="filterSubWorkTypeId" :disabled="!filterWorkTypeId">
        <SelectTrigger class="w-40 h-8 text-sm">
          <SelectValue placeholder="소공종 필터" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="swt in stdSubWorkTypes" :key="swt.id" :value="swt.id">{{ swt.name }}</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" class="h-8" @click="filterDivisionId = null; filterWorkTypeId = null; filterSubWorkTypeId = null">
        초기화
      </Button>
    </div>

    <!-- 생성 폼 -->
    <div class="border rounded-md p-4 mb-4 space-y-3">
      <p class="text-xs font-medium text-muted-foreground">새 작업 규칙 추가</p>
      <div class="flex gap-2 items-center">
        <label class="text-sm">대상:</label>
        <Button size="sm" :variant="formMode === 'workType' ? 'default' : 'outline'" class="h-7"
          @click="formMode = 'workType'">공종</Button>
        <Button size="sm" :variant="formMode === 'subWorkType' ? 'default' : 'outline'" class="h-7"
          @click="formMode = 'subWorkType'">소공종</Button>
      </div>
      <div class="flex gap-2">
        <Select v-model="formDivisionId">
          <SelectTrigger class="w-40 h-8 text-sm">
            <SelectValue placeholder="공사구분" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="d in stdDivisions" :key="d.id" :value="d.id">{{ d.name }}</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="formWorkTypeId" :disabled="!formDivisionId">
          <SelectTrigger class="w-40 h-8 text-sm">
            <SelectValue placeholder="공종" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="wt in formStdWorkTypes" :key="wt.id" :value="wt.id">{{ wt.name }}</SelectItem>
          </SelectContent>
        </Select>
        <Select v-if="formMode === 'subWorkType'" v-model="formSubWorkTypeId" :disabled="!formWorkTypeId">
          <SelectTrigger class="w-40 h-8 text-sm">
            <SelectValue placeholder="소공종" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="swt in formStdSubWorkTypes" :key="swt.id" :value="swt.id">{{ swt.name }}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <textarea
        v-model="formRules"
        placeholder="작업 규칙 내용 입력"
        class="w-full border rounded-md p-2 text-sm min-h-[80px] bg-background resize-y"
      />
      <Button size="sm" :disabled="isCreating || !formRules.trim()" @click="createWorkRule">추가</Button>
    </div>

    <!-- 목록 -->
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead class="w-16">ID</TableHead>
          <TableHead class="w-32">공종</TableHead>
          <TableHead class="w-32">소공종</TableHead>
          <TableHead>규칙</TableHead>
          <TableHead class="w-24">작업</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-if="isLoading">
          <TableCell :colspan="5" class="text-center text-muted-foreground">로딩 중...</TableCell>
        </TableRow>
        <TableRow v-else-if="workRules.length === 0">
          <TableCell :colspan="5" class="text-center text-muted-foreground">작업 규칙이 없습니다</TableCell>
        </TableRow>
        <TableRow v-for="rule in workRules" :key="rule.id">
          <TableCell class="text-xs text-muted-foreground">{{ rule.id }}</TableCell>
          <TableCell class="text-sm">{{ getWorkTypeName(rule.stdWorkTypeId) }}</TableCell>
          <TableCell class="text-sm">{{ getSubWorkTypeName(rule.stdSubWorkTypeId) }}</TableCell>
          <TableCell>
            <template v-if="editingId === rule.id">
              <textarea
                v-model="editingRules"
                class="w-full border rounded-md p-1 text-sm min-h-[60px] bg-background resize-y"
                @keydown.escape="cancelEditing"
              />
            </template>
            <template v-else>
              <p class="text-sm whitespace-pre-wrap">{{ rule.rules }}</p>
            </template>
          </TableCell>
          <TableCell>
            <div class="flex gap-1">
              <template v-if="editingId === rule.id">
                <button class="p-1 rounded hover:bg-primary/10 text-primary" @click="updateWorkRule">
                  <Check class="w-4 h-4" />
                </button>
                <button class="p-1 rounded hover:bg-muted text-muted-foreground" @click="cancelEditing">
                  <X class="w-4 h-4" />
                </button>
              </template>
              <template v-else>
                <button class="p-1 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary" @click="startEditing(rule)">
                  <Pencil class="w-4 h-4" />
                </button>
                <button class="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive" :disabled="isDeleting" @click="openDeleteDialog(rule.id)">
                  <Trash2 class="w-4 h-4" />
                </button>
              </template>
            </div>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <AlertDialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>삭제 확인</AlertDialogTitle>
          <AlertDialogDescription>이 작업 규칙을 삭제하시겠습니까?</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction @click="confirmDelete">삭제</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
