<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useMappingManagement } from '../composables/useMappingManagement'
import type { CreateCompanyToProjectPayload, CreateUserToProjectPayload } from '@/types/super'

const {
  companies,
  projects,
  companyRoles,
  systemRoles,
  workTypes,
  isLoadingWorkTypes,
  loadWorkTypes,
  companyToProjectList,
  isLoadingCompanyToProject,
  isCreatingCompanyToProject,
  companyToProjectFilter,
  createCompanyToProject,
  userToProjectList,
  isLoadingUserToProject,
  isCreatingUserToProject,
  userToProjectFilter,
  createUserToProject,
  loadAll,
} = useMappingManagement()

// Company-Project Dialog
const isCompanyToProjectDialogOpen = ref(false)
const companyToProjectForm = ref<CreateCompanyToProjectPayload>({
  companyId: '',
  projectId: '',
  roleId: 0,
  workTypeId: undefined,
})

const resetCompanyToProjectForm = () => {
  companyToProjectForm.value = {
    companyId: '',
    projectId: '',
    roleId: 0,
    workTypeId: undefined,
  }
}

// 프로젝트 선택 시 해당 프로젝트의 공종 목록 로드
watch(
  () => companyToProjectForm.value.projectId,
  (projectId) => {
    companyToProjectForm.value.workTypeId = undefined
    if (projectId) {
      loadWorkTypes(projectId)
    }
  }
)

const handleCreateCompanyToProject = async () => {
  if (!companyToProjectForm.value.companyId || !companyToProjectForm.value.projectId || !companyToProjectForm.value.roleId) {
    alert('회사, 프로젝트, 역할을 선택해주세요.')
    return
  }
  const success = await createCompanyToProject(companyToProjectForm.value)
  if (success) {
    isCompanyToProjectDialogOpen.value = false
    resetCompanyToProjectForm()
  }
}

// User-Project Dialog
const isUserToProjectDialogOpen = ref(false)
const userToProjectForm = ref<CreateUserToProjectPayload & { userId: string }>({
  userId: '',
  projectId: '',
  companyToProjectId: 0,
  projectRole: '',
  systemRoleId: 0,
})

const resetUserToProjectForm = () => {
  userToProjectForm.value = {
    userId: '',
    projectId: '',
    companyToProjectId: 0,
    projectRole: '',
    systemRoleId: 0,
  }
}

const handleCreateUserToProject = async () => {
  if (!userToProjectForm.value.userId || !userToProjectForm.value.projectId || !userToProjectForm.value.companyToProjectId || !userToProjectForm.value.systemRoleId) {
    alert('모든 필수 항목을 입력해주세요.')
    return
  }
  const success = await createUserToProject(userToProjectForm.value)
  if (success) {
    isUserToProjectDialogOpen.value = false
    resetUserToProjectForm()
  }
}

onMounted(() => {
  loadAll()
})
</script>

<template>
  <div class="space-y-8">
    <!-- 회사-프로젝트 매핑 -->
    <div class="space-y-4">
      <div class="flex justify-between items-center">
        <h4 class="font-semibold">회사-프로젝트 매핑</h4>
        <Button @click="isCompanyToProjectDialogOpen = true">매핑 추가</Button>
      </div>

      <!-- 필터 -->
      <div class="flex gap-4">
        <div class="w-48">
          <Select v-model="companyToProjectFilter.projectId">
            <SelectTrigger>
              <SelectValue placeholder="프로젝트 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">전체</SelectItem>
              <SelectItem v-for="p in projects" :key="p.id" :value="p.id">
                {{ p.projectName }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="w-48">
          <Select v-model="companyToProjectFilter.companyId">
            <SelectTrigger>
              <SelectValue placeholder="회사 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">전체</SelectItem>
              <SelectItem v-for="c in companies" :key="c.id" :value="c.id">
                {{ c.companyName }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div class="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>프로젝트</TableHead>
              <TableHead>회사</TableHead>
              <TableHead>역할</TableHead>
              <TableHead>공종</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="isLoadingCompanyToProject">
              <TableCell colspan="4" class="text-center text-muted-foreground">
                로딩 중...
              </TableCell>
            </TableRow>
            <TableRow v-else-if="companyToProjectList.length === 0">
              <TableCell colspan="4" class="text-center text-muted-foreground">
                매핑이 없습니다.
              </TableCell>
            </TableRow>
            <TableRow v-for="mapping in companyToProjectList" :key="mapping.id">
              <TableCell>{{ mapping.projectName }}</TableCell>
              <TableCell>{{ mapping.companyName }}</TableCell>
              <TableCell>{{ mapping.roleName }}</TableCell>
              <TableCell>{{ mapping.workTypeName || '-' }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>

    <Separator />

    <!-- 사용자-프로젝트 매핑 -->
    <div class="space-y-4">
      <div class="flex justify-between items-center">
        <h4 class="font-semibold">사용자-프로젝트 매핑</h4>
        <Button @click="isUserToProjectDialogOpen = true">매핑 추가</Button>
      </div>

      <!-- 필터 -->
      <div class="flex gap-4">
        <div class="w-48">
          <Select v-model="userToProjectFilter.projectId">
            <SelectTrigger>
              <SelectValue placeholder="프로젝트 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">전체</SelectItem>
              <SelectItem v-for="p in projects" :key="p.id" :value="p.id">
                {{ p.projectName }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div class="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>프로젝트</TableHead>
              <TableHead>사용자</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead>소속회사</TableHead>
              <TableHead>프로젝트 직책</TableHead>
              <TableHead>시스템 역할</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="isLoadingUserToProject">
              <TableCell colspan="6" class="text-center text-muted-foreground">
                로딩 중...
              </TableCell>
            </TableRow>
            <TableRow v-else-if="userToProjectList.length === 0">
              <TableCell colspan="6" class="text-center text-muted-foreground">
                매핑이 없습니다.
              </TableCell>
            </TableRow>
            <TableRow v-for="mapping in userToProjectList" :key="mapping.id">
              <TableCell>{{ mapping.projectName }}</TableCell>
              <TableCell>{{ mapping.userName }}</TableCell>
              <TableCell>{{ mapping.userEmail }}</TableCell>
              <TableCell>{{ mapping.companyName }}</TableCell>
              <TableCell>{{ mapping.projectRole || '-' }}</TableCell>
              <TableCell>{{ mapping.systemRoleName }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>

    <!-- 회사-프로젝트 매핑 추가 Dialog -->
    <Dialog v-model:open="isCompanyToProjectDialogOpen">
      <DialogContent class="sm:max-w-[500px]" @interact-outside.prevent>
        <DialogHeader>
          <DialogTitle>회사-프로젝트 매핑 추가</DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid gap-2">
            <Label>프로젝트 *</Label>
            <Select v-model="companyToProjectForm.projectId">
              <SelectTrigger>
                <SelectValue placeholder="프로젝트 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="p in projects" :key="p.id" :value="p.id">
                  {{ p.projectName }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-2">
            <Label>회사 *</Label>
            <Select v-model="companyToProjectForm.companyId">
              <SelectTrigger>
                <SelectValue placeholder="회사 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="c in companies" :key="c.id" :value="c.id">
                  {{ c.companyName }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-2">
            <Label>회사 역할 *</Label>
            <Select v-model="companyToProjectForm.roleId">
              <SelectTrigger>
                <SelectValue placeholder="역할 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="r in companyRoles" :key="r.id" :value="r.id">
                  {{ r.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-2">
            <Label>공종</Label>
            <Select
              v-model="companyToProjectForm.workTypeId"
              :disabled="!companyToProjectForm.projectId || isLoadingWorkTypes"
            >
              <SelectTrigger>
                <SelectValue :placeholder="isLoadingWorkTypes ? '로딩 중...' : '공종 선택 (선택사항)'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="w in workTypes" :key="w.id" :value="w.id">
                  {{ w.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="isCompanyToProjectDialogOpen = false">취소</Button>
          <Button @click="handleCreateCompanyToProject" :disabled="isCreatingCompanyToProject">
            {{ isCreatingCompanyToProject ? '생성 중...' : '추가' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 사용자-프로젝트 매핑 추가 Dialog -->
    <Dialog v-model:open="isUserToProjectDialogOpen">
      <DialogContent class="sm:max-w-[500px]" @interact-outside.prevent>
        <DialogHeader>
          <DialogTitle>사용자-프로젝트 매핑 추가</DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid gap-2">
            <Label>사용자 ID *</Label>
            <Input v-model="userToProjectForm.userId" placeholder="사용자 UUID 입력" />
          </div>
          <div class="grid gap-2">
            <Label>프로젝트 *</Label>
            <Select v-model="userToProjectForm.projectId">
              <SelectTrigger>
                <SelectValue placeholder="프로젝트 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="p in projects" :key="p.id" :value="p.id">
                  {{ p.projectName }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-2">
            <Label>소속 (회사-프로젝트 매핑 ID) *</Label>
            <Select v-model="userToProjectForm.companyToProjectId">
              <SelectTrigger>
                <SelectValue placeholder="소속 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="m in companyToProjectList" :key="m.id" :value="m.id">
                  {{ m.companyName }} - {{ m.roleName }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-2">
            <Label>프로젝트 직책</Label>
            <Input v-model="userToProjectForm.projectRole" placeholder="예: 현장소장" />
          </div>
          <div class="grid gap-2">
            <Label>시스템 역할 *</Label>
            <Select v-model="userToProjectForm.systemRoleId">
              <SelectTrigger>
                <SelectValue placeholder="시스템 역할 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="r in systemRoles" :key="r.id" :value="r.id">
                  {{ r.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="isUserToProjectDialogOpen = false">취소</Button>
          <Button @click="handleCreateUserToProject" :disabled="isCreatingUserToProject">
            {{ isCreatingUserToProject ? '생성 중...' : '추가' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
