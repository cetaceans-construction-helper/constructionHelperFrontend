<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useWorkerManagement } from '../composables/useWorkerManagement'
import type { Worker, UpdateWorkerPayload } from '@/types/super'

const {
  filteredWorkers,
  isLoading,
  isUpdating,
  filterConfirmed,
  loadWorkers,
  updateWorker,
  toggleWorkerConfirmed,
} = useWorkerManagement()

// Edit Dialog
const isEditDialogOpen = ref(false)
const editingWorker = ref<Worker | null>(null)
const editForm = ref<UpdateWorkerPayload>({
  name: '',
  phoneNumber: '',
  registrationNumber: '',
  confirmed: false,
  registrationCardUrl: '',
})

const openEditDialog = (worker: Worker) => {
  editingWorker.value = worker
  editForm.value = {
    name: worker.workerName,
    phoneNumber: worker.phoneNumber,
    registrationNumber: worker.registrationNumber,
    confirmed: worker.confirmed,
    registrationCardUrl: worker.registrationCardUrl || '',
  }
  isEditDialogOpen.value = true
}

const handleUpdate = async () => {
  if (!editingWorker.value) return
  if (!editForm.value.name.trim() || !editForm.value.phoneNumber.trim()) {
    alert('이름과 전화번호를 입력해주세요.')
    return
  }
  const success = await updateWorker(editingWorker.value.id, editForm.value)
  if (success) {
    isEditDialogOpen.value = false
    editingWorker.value = null
  }
}

const handleToggleConfirmed = async (worker: Worker) => {
  await toggleWorkerConfirmed(worker)
}

onMounted(() => {
  loadWorkers()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-end items-center gap-4">
      <div class="w-40">
        <Select v-model="filterConfirmed">
          <SelectTrigger>
            <SelectValue placeholder="승인 상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="confirmed">승인됨</SelectItem>
            <SelectItem value="unconfirmed">미승인</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div class="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>전화번호</TableHead>
            <TableHead>주민등록번호</TableHead>
            <TableHead>승인상태</TableHead>
            <TableHead>등록증</TableHead>
            <TableHead class="text-right">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading">
            <TableCell colspan="6" class="text-center text-muted-foreground">
              로딩 중...
            </TableCell>
          </TableRow>
          <TableRow v-else-if="filteredWorkers.length === 0">
            <TableCell colspan="6" class="text-center text-muted-foreground">
              작업자가 없습니다.
            </TableCell>
          </TableRow>
          <TableRow v-for="worker in filteredWorkers" :key="worker.id">
            <TableCell class="font-medium">{{ worker.workerName }}</TableCell>
            <TableCell>{{ worker.phoneNumber }}</TableCell>
            <TableCell>{{ worker.registrationNumber }}</TableCell>
            <TableCell>
              <Badge :variant="worker.confirmed ? 'default' : 'secondary'">
                {{ worker.confirmed ? '승인' : '미승인' }}
              </Badge>
            </TableCell>
            <TableCell>
              <a
                v-if="worker.registrationCardUrl"
                :href="worker.registrationCardUrl"
                target="_blank"
                class="text-primary hover:underline"
              >
                보기
              </a>
              <span v-else class="text-muted-foreground">-</span>
            </TableCell>
            <TableCell class="text-right">
              <div class="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  @click="handleToggleConfirmed(worker)"
                  :disabled="isUpdating"
                >
                  {{ worker.confirmed ? '승인취소' : '승인' }}
                </Button>
                <Button variant="ghost" size="sm" @click="openEditDialog(worker)">
                  수정
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- 수정 Dialog -->
    <Dialog v-model:open="isEditDialogOpen">
      <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>작업자 정보 수정</DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid gap-2">
            <Label for="name">이름 *</Label>
            <Input id="name" v-model="editForm.name" placeholder="이름" />
          </div>
          <div class="grid gap-2">
            <Label for="phoneNumber">전화번호 *</Label>
            <Input id="phoneNumber" v-model="editForm.phoneNumber" placeholder="010-0000-0000" />
          </div>
          <div class="grid gap-2">
            <Label for="registrationNumber">주민등록번호 *</Label>
            <Input
              id="registrationNumber"
              v-model="editForm.registrationNumber"
              placeholder="000000-0000000"
            />
          </div>
          <div class="grid gap-2">
            <Label for="registrationCardUrl">등록증 URL</Label>
            <Input
              id="registrationCardUrl"
              v-model="editForm.registrationCardUrl"
              placeholder="https://..."
            />
          </div>
          <div class="flex items-center gap-2">
            <input
              id="confirmed"
              type="checkbox"
              v-model="editForm.confirmed"
              class="h-4 w-4 rounded border-gray-300"
            />
            <Label for="confirmed">승인됨</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="isEditDialogOpen = false">취소</Button>
          <Button @click="handleUpdate" :disabled="isUpdating">
            {{ isUpdating ? '저장 중...' : '저장' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
