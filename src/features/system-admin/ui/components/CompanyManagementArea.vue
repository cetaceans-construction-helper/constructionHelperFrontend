<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Pencil, X } from 'lucide-vue-next'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import { Label } from '@/shared/ui/label'
import { useCompanyManagement } from '@/features/system-admin/view-model/useCompanyManagement'
import type { Company, CreateCompanyPayload, UpdateCompanyPayload } from '@/features/system-admin/model/system-admin-types'

const {
  companies,
  isLoading,
  isCreating,
  isUpdating,
  isDeleting,
  loadCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
} = useCompanyManagement()

// 생성 Dialog
const isDialogOpen = ref(false)
const form = ref<CreateCompanyPayload>({
  name: '',
  address: '',
  registrationNumber: '',
  phoneNumber: '',
  bankingAccount: '',
  displayName: '',
})

const resetForm = () => {
  form.value = {
    name: '',
    address: '',
    registrationNumber: '',
    phoneNumber: '',
    bankingAccount: '',
    displayName: '',
  }
}

const handleCreate = async () => {
  if (!form.value.name.trim()) {
    alert('회사명을 입력해주세요.')
    return
  }
  const success = await createCompany(form.value)
  if (success) {
    isDialogOpen.value = false
    resetForm()
  }
}

const openDialog = () => {
  resetForm()
  isDialogOpen.value = true
}

// 수정 Dialog
const isEditDialogOpen = ref(false)
const editingCompany = ref<Company | null>(null)
const editForm = ref<UpdateCompanyPayload>({
  name: '',
  address: '',
  registrationNumber: '',
  phoneNumber: '',
  bankingAccount: '',
  displayName: '',
})

const openEditDialog = (company: Company) => {
  editingCompany.value = company
  editForm.value = {
    name: company.companyName,
    address: company.companyAddress || '',
    registrationNumber: company.registrationNumber || '',
    phoneNumber: company.phoneNumber || '',
    bankingAccount: company.bankingAccount || '',
    displayName: company.displayName || '',
  }
  isEditDialogOpen.value = true
}

const handleUpdate = async () => {
  if (!editingCompany.value) return
  if (!editForm.value.name.trim()) {
    alert('회사명을 입력해주세요.')
    return
  }
  const success = await updateCompany(editingCompany.value.id, editForm.value)
  if (success) {
    isEditDialogOpen.value = false
    editingCompany.value = null
  }
}

// 삭제 Dialog
const showDeleteDialog = ref(false)
const deleteTargetId = ref<string | null>(null)
const deleteTargetName = ref('')

const openDeleteDialog = (company: Company) => {
  deleteTargetId.value = company.id
  deleteTargetName.value = company.companyName
  showDeleteDialog.value = true
}

const confirmDelete = async () => {
  if (deleteTargetId.value) {
    await deleteCompany(deleteTargetId.value)
  }
  showDeleteDialog.value = false
}

onMounted(() => {
  loadCompanies()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-end">
      <Button @click="openDialog">회사 추가</Button>
    </div>

    <div class="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>회사명</TableHead>
            <TableHead>표시명</TableHead>
            <TableHead>사업자번호</TableHead>
            <TableHead>전화번호</TableHead>
            <TableHead>주소</TableHead>
            <TableHead class="w-16 text-center">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading">
            <TableCell colspan="6" class="text-center text-muted-foreground">
              로딩 중...
            </TableCell>
          </TableRow>
          <TableRow v-else-if="companies.length === 0">
            <TableCell colspan="6" class="text-center text-muted-foreground">
              등록된 회사가 없습니다.
            </TableCell>
          </TableRow>
          <TableRow v-for="company in companies" :key="company.id">
            <TableCell class="font-medium">{{ company.companyName }}</TableCell>
            <TableCell>{{ company.displayName || '-' }}</TableCell>
            <TableCell>{{ company.registrationNumber || '-' }}</TableCell>
            <TableCell>{{ company.phoneNumber || '-' }}</TableCell>
            <TableCell>{{ company.companyAddress || '-' }}</TableCell>
            <TableCell class="text-center">
              <div class="flex justify-center items-center gap-1">
                <button
                  class="p-0.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"
                  @click.stop="openEditDialog(company)"
                >
                  <Pencil class="w-3 h-3" />
                </button>
                <button
                  class="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  :disabled="isDeleting"
                  @click.stop="openDeleteDialog(company)"
                >
                  <X class="w-3 h-3" />
                </button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- 회사 추가 Dialog -->
    <Dialog v-model:open="isDialogOpen">
      <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>회사 추가</DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid gap-2">
            <Label for="name">회사명 *</Label>
            <Input id="name" v-model="form.name" placeholder="회사명 입력" />
          </div>
          <div class="grid gap-2">
            <Label for="displayName">표시명</Label>
            <Input id="displayName" v-model="form.displayName" placeholder="표시명 입력 (선택)" />
          </div>
          <div class="grid gap-2">
            <Label for="registrationNumber">사업자번호</Label>
            <Input
              id="registrationNumber"
              v-model="form.registrationNumber"
              placeholder="000-00-00000"
            />
          </div>
          <div class="grid gap-2">
            <Label for="phoneNumber">전화번호</Label>
            <Input id="phoneNumber" v-model="form.phoneNumber" placeholder="02-0000-0000" />
          </div>
          <div class="grid gap-2">
            <Label for="address">주소</Label>
            <Input id="address" v-model="form.address" placeholder="회사 주소" />
          </div>
          <div class="grid gap-2">
            <Label for="bankingAccount">계좌정보</Label>
            <Input id="bankingAccount" v-model="form.bankingAccount" placeholder="은행 계좌번호" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="isDialogOpen = false">취소</Button>
          <Button @click="handleCreate" :disabled="isCreating">
            {{ isCreating ? '생성 중...' : '추가' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 회사 수정 Dialog -->
    <Dialog v-model:open="isEditDialogOpen">
      <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>회사 정보 수정</DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid gap-2">
            <Label for="edit-name">회사명 *</Label>
            <Input id="edit-name" v-model="editForm.name" placeholder="회사명 입력" />
          </div>
          <div class="grid gap-2">
            <Label for="edit-displayName">표시명</Label>
            <Input id="edit-displayName" v-model="editForm.displayName" placeholder="표시명 입력 (선택)" />
          </div>
          <div class="grid gap-2">
            <Label for="edit-registrationNumber">사업자번호</Label>
            <Input
              id="edit-registrationNumber"
              v-model="editForm.registrationNumber"
              placeholder="000-00-00000"
            />
          </div>
          <div class="grid gap-2">
            <Label for="edit-phoneNumber">전화번호</Label>
            <Input id="edit-phoneNumber" v-model="editForm.phoneNumber" placeholder="02-0000-0000" />
          </div>
          <div class="grid gap-2">
            <Label for="edit-address">주소</Label>
            <Input id="edit-address" v-model="editForm.address" placeholder="회사 주소" />
          </div>
          <div class="grid gap-2">
            <Label for="edit-bankingAccount">계좌정보</Label>
            <Input id="edit-bankingAccount" v-model="editForm.bankingAccount" placeholder="은행 계좌번호" />
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

    <!-- 삭제 확인 다이얼로그 -->
    <AlertDialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>삭제 확인</AlertDialogTitle>
          <AlertDialogDescription>
            '{{ deleteTargetName }}' 회사를 삭제하시겠습니까?
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
