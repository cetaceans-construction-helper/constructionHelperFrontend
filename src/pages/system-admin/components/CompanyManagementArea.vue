<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { useCompanyManagement } from '../composables/useCompanyManagement'
import type { CreateCompanyPayload } from '@/types/super'

const { companies, isLoading, isCreating, loadCompanies, createCompany } = useCompanyManagement()

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
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading">
            <TableCell colspan="5" class="text-center text-muted-foreground">
              로딩 중...
            </TableCell>
          </TableRow>
          <TableRow v-else-if="companies.length === 0">
            <TableCell colspan="5" class="text-center text-muted-foreground">
              등록된 회사가 없습니다.
            </TableCell>
          </TableRow>
          <TableRow v-for="company in companies" :key="company.id">
            <TableCell class="font-medium">{{ company.companyName }}</TableCell>
            <TableCell>{{ company.displayName || '-' }}</TableCell>
            <TableCell>{{ company.registrationNumber || '-' }}</TableCell>
            <TableCell>{{ company.phoneNumber || '-' }}</TableCell>
            <TableCell>{{ company.companyAddress || '-' }}</TableCell>
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
  </div>
</template>
