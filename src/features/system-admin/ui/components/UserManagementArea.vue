<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Pencil } from 'lucide-vue-next'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Label } from '@/shared/ui/label'
import { useUserManagement } from '@/features/system-admin/view-model/useUserManagement'
import type { User, UpdateUserPayload } from '@/features/system-admin/model/system-admin-types'

const {
  users,
  companies,
  isLoading,
  isUpdating,
  loadUsers,
  loadCompanies,
  updateUser,
} = useUserManagement()

// 수정 Dialog
const isEditDialogOpen = ref(false)
const editingUser = ref<User | null>(null)
const editForm = ref({
  userName: '',
  phoneNumber: '',
  jobTitle: '',
  companyId: undefined as string | undefined,
})

// 원본 값 저장 (변경 감지용)
const originalForm = ref({
  userName: '',
  phoneNumber: '',
  jobTitle: '',
  companyId: undefined as string | undefined,
})

const openEditDialog = (user: User) => {
  editingUser.value = user
  const matchedCompany = companies.value.find((c) => c.companyName === user.companyName)
  const initial = {
    userName: user.userName,
    phoneNumber: user.phoneNumber,
    jobTitle: user.jobTitle || '',
    companyId: matchedCompany?.id || undefined,
  }
  editForm.value = { ...initial }
  originalForm.value = { ...initial }
  isEditDialogOpen.value = true
}

const handleUpdate = async () => {
  if (!editingUser.value) return
  const payload: UpdateUserPayload = {}
  if (editForm.value.userName !== originalForm.value.userName) {
    payload.userName = editForm.value.userName || null
  }
  if (editForm.value.phoneNumber !== originalForm.value.phoneNumber) {
    payload.phoneNumber = editForm.value.phoneNumber || null
  }
  if (editForm.value.jobTitle !== originalForm.value.jobTitle) {
    payload.jobTitle = editForm.value.jobTitle || null
  }
  if (editForm.value.companyId !== originalForm.value.companyId) {
    payload.companyId = editForm.value.companyId || null
  }
  if (Object.keys(payload).length === 0) {
    isEditDialogOpen.value = false
    return
  }
  const success = await updateUser(editingUser.value.id, payload)
  if (success) {
    isEditDialogOpen.value = false
    editingUser.value = null
  }
}

const clearCompany = () => {
  editForm.value.companyId = undefined
}

onMounted(async () => {
  await Promise.all([loadUsers(), loadCompanies()])
})
</script>

<template>
  <div class="space-y-4">
    <div class="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이메일</TableHead>
            <TableHead>이름</TableHead>
            <TableHead>전화번호</TableHead>
            <TableHead>직책</TableHead>
            <TableHead>소속회사</TableHead>
            <TableHead>역할</TableHead>
            <TableHead>상태</TableHead>
            <TableHead class="w-16 text-center">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading">
            <TableCell colspan="8" class="text-center text-muted-foreground">
              로딩 중...
            </TableCell>
          </TableRow>
          <TableRow v-else-if="users.length === 0">
            <TableCell colspan="8" class="text-center text-muted-foreground">
              등록된 사용자가 없습니다.
            </TableCell>
          </TableRow>
          <TableRow v-for="user in users" :key="user.id">
            <TableCell>{{ user.userEmail }}</TableCell>
            <TableCell class="font-medium">{{ user.userName }}</TableCell>
            <TableCell>{{ user.phoneNumber || '-' }}</TableCell>
            <TableCell>{{ user.jobTitle || '-' }}</TableCell>
            <TableCell>{{ user.companyName || '-' }}</TableCell>
            <TableCell>{{ user.systemRole }}</TableCell>
            <TableCell>{{ user.currentStatus }}</TableCell>
            <TableCell class="text-center">
              <button
                class="p-0.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"
                @click.stop="openEditDialog(user)"
              >
                <Pencil class="w-3 h-3" />
              </button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- 사용자 수정 Dialog -->
    <Dialog v-model:open="isEditDialogOpen">
      <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>사용자 정보 수정</DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid gap-2">
            <Label>이메일</Label>
            <Input :model-value="editingUser?.userEmail" disabled />
          </div>
          <div class="grid gap-2">
            <Label for="edit-userName">이름</Label>
            <Input id="edit-userName" v-model="editForm.userName" placeholder="이름" />
          </div>
          <div class="grid gap-2">
            <Label for="edit-phoneNumber">전화번호</Label>
            <Input id="edit-phoneNumber" v-model="editForm.phoneNumber" placeholder="01012345678" />
          </div>
          <div class="grid gap-2">
            <Label for="edit-jobTitle">직책</Label>
            <Input id="edit-jobTitle" v-model="editForm.jobTitle" placeholder="예: 현장소장, 공무팀장" />
          </div>
          <div class="grid gap-2">
            <Label>소속 회사</Label>
            <div class="flex gap-2">
              <Select
                :model-value="editForm.companyId ?? ''"
                @update:model-value="editForm.companyId = String($event)"
              >
                <SelectTrigger class="flex-1">
                  <SelectValue placeholder="회사 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="company in companies"
                    :key="company.id"
                    :value="company.id"
                  >
                    {{ company.companyName }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" @click="clearCompany">해제</Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="isEditDialogOpen = false">취소</Button>
          <Button :disabled="isUpdating" @click="handleUpdate">
            {{ isUpdating ? '저장 중...' : '저장' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
