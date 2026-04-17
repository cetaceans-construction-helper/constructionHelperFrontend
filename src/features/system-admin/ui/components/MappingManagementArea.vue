<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Pencil, X } from 'lucide-vue-next'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
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
import { Input } from '@/shared/ui/input'
import { Separator } from '@/shared/ui/separator'
import { useMappingManagement } from '@/features/system-admin/view-model/useMappingManagement'
import { systemAdminApi } from '@/features/system-admin/infra/system-admin-api'
import type {
  CreateCompanyToProjectPayload,
  CreateUserToProjectPayload,
  CompanyToProject,
  UserToProject,
  UpdateCompanyToProjectPayload,
  UpdateUserToProjectPayload,
} from '@/features/system-admin/model/system-admin-types'

const {
  companies,
  projects,
  companyRoles,
  systemRoles,
  workTypes,
  users,
  isLoadingWorkTypes,
  loadWorkTypes,
  companyToProjectList,
  isLoadingCompanyToProject,
  isCreatingCompanyToProject,
  isDeletingCompanyToProject,
  isUpdatingCompanyToProject,
  companyToProjectFilter,
  createCompanyToProject,
  updateCompanyToProject,
  deleteCompanyToProject,
  userToProjectList,
  isLoadingUserToProject,
  isCreatingUserToProject,
  isDeletingUserToProject,
  isUpdatingUserToProject,
  userToProjectFilter,
  createUserToProject,
  updateUserToProject,
  deleteUserToProject,
  loadAll,
} = useMappingManagement()

// Company-Project 생성 Dialog
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

// Company-Project 수정 Dialog
const isEditCompanyToProjectDialogOpen = ref(false)
const editingCompanyToProject = ref<CompanyToProject | null>(null)
const editCompanyToProjectForm = ref<UpdateCompanyToProjectPayload>({
  roleId: 0,
  workTypeId: undefined,
})

const openEditCompanyToProjectDialog = (mapping: CompanyToProject) => {
  editingCompanyToProject.value = mapping
  editCompanyToProjectForm.value = {
    roleId: mapping.roleId,
    workTypeId: mapping.workTypeId ?? undefined,
  }
  // 해당 프로젝트의 공종 목록 로드
  loadWorkTypes(mapping.projectId)
  isEditCompanyToProjectDialogOpen.value = true
}

const handleUpdateCompanyToProject = async () => {
  if (!editingCompanyToProject.value) return
  if (!editCompanyToProjectForm.value.roleId) {
    alert('역할을 선택해주세요.')
    return
  }
  const success = await updateCompanyToProject(editingCompanyToProject.value.id, editCompanyToProjectForm.value)
  if (success) {
    isEditCompanyToProjectDialogOpen.value = false
    editingCompanyToProject.value = null
  }
}

// User-Project 생성 Dialog
const isUserToProjectDialogOpen = ref(false)
const userToProjectForm = ref<CreateUserToProjectPayload>({
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

// 다이얼로그 전용: 테이블의 companyToProjectFilter 와 독립적으로 선택한 프로젝트의 CompanyToProject 를 직접 로드
const dialogCompanyToProjectList = ref<CompanyToProject[]>([])
const isLoadingDialogCompanyToProject = ref(false)

async function loadDialogCompanyToProjectList(projectId: string) {
  if (!projectId) {
    dialogCompanyToProjectList.value = []
    return
  }
  isLoadingDialogCompanyToProject.value = true
  try {
    dialogCompanyToProjectList.value = await systemAdminApi.getCompanyToProjectList({ projectId })
  } catch (error) {
    console.error('회사-프로젝트 매핑 (다이얼로그용) 로드 실패:', error)
    dialogCompanyToProjectList.value = []
  } finally {
    isLoadingDialogCompanyToProject.value = false
  }
}

// 선택된 사용자의 회사 id
const selectedUserCompanyId = computed(() => {
  const u = users.value.find((x) => x.id === userToProjectForm.value.userId)
  return u?.companyId
})

// 편집 중 사용자의 회사 id
const editingUserCompanyId = computed(() => {
  const u = editingUserToProject.value
    ? users.value.find((x) => x.id === editingUserToProject.value!.userId)
    : undefined
  return u?.companyId
})

// 추가 Dialog: 선택한 프로젝트의 전체 회사 매핑 (상단), 사용자 회사 매칭이 있으면 자동 선택
const filteredCompanyToProjectForCreate = computed(() =>
  dialogCompanyToProjectList.value.filter((m) => m.projectId === userToProjectForm.value.projectId),
)

// 수정 Dialog: 편집 대상 프로젝트의 전체 회사 매핑
const filteredCompanyToProjectForEdit = computed(() =>
  dialogCompanyToProjectList.value.filter(
    (m) => m.projectId === editingUserToProject.value?.projectId,
  ),
)

// 프로젝트 변경 시: 해당 프로젝트의 매핑 재로드
watch(
  () => userToProjectForm.value.projectId,
  async (projectId) => {
    userToProjectForm.value.companyToProjectId = 0
    if (projectId) {
      await loadDialogCompanyToProjectList(projectId)
      // 사용자 회사와 일치하는 매핑이 있으면 자동 선택
      const match = dialogCompanyToProjectList.value.find(
        (m) => m.companyId === selectedUserCompanyId.value,
      )
      if (match) userToProjectForm.value.companyToProjectId = match.id
    }
  },
)

// 사용자 변경 시: 이미 로드된 매핑에서 사용자 회사 일치하는거 자동 선택
watch(
  () => userToProjectForm.value.userId,
  () => {
    if (!userToProjectForm.value.projectId) return
    const match = dialogCompanyToProjectList.value.find(
      (m) => m.companyId === selectedUserCompanyId.value,
    )
    if (match) userToProjectForm.value.companyToProjectId = match.id
  },
)

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

// User-Project 수정 Dialog
const isEditUserToProjectDialogOpen = ref(false)
const editingUserToProject = ref<UserToProject | null>(null)
const editUserToProjectForm = ref<UpdateUserToProjectPayload>({
  companyToProjectId: 0,
  projectRole: '',
  systemRoleId: 0,
})

const openEditUserToProjectDialog = async (mapping: UserToProject) => {
  editingUserToProject.value = mapping
  editUserToProjectForm.value = {
    companyToProjectId: mapping.companyToProjectId,
    projectRole: mapping.projectRole || '',
    systemRoleId: mapping.systemRoleId,
  }
  await loadDialogCompanyToProjectList(mapping.projectId)
  isEditUserToProjectDialogOpen.value = true
}

const handleUpdateUserToProject = async () => {
  if (!editingUserToProject.value) return
  if (!editUserToProjectForm.value.companyToProjectId || !editUserToProjectForm.value.systemRoleId) {
    alert('소속과 시스템 역할을 선택해주세요.')
    return
  }
  const success = await updateUserToProject(editingUserToProject.value.id, editUserToProjectForm.value)
  if (success) {
    isEditUserToProjectDialogOpen.value = false
    editingUserToProject.value = null
  }
}

// 삭제 다이얼로그 상태
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

onMounted(() => {
  loadAll()
})
</script>

<template>
  <div class="space-y-8">
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
              <TableHead class="w-16 text-center">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="isLoadingUserToProject">
              <TableCell colspan="7" class="text-center text-muted-foreground">
                로딩 중...
              </TableCell>
            </TableRow>
            <TableRow v-else-if="userToProjectList.length === 0">
              <TableCell colspan="7" class="text-center text-muted-foreground">
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
              <TableCell class="text-center">
                <div class="flex justify-center items-center gap-1">
                  <button
                    class="p-0.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"
                    @click.stop="openEditUserToProjectDialog(mapping)"
                  >
                    <Pencil class="w-3 h-3" />
                  </button>
                  <button
                    class="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    :disabled="isDeletingUserToProject"
                    @click.stop="openDeleteDialog(mapping.id, `${mapping.userName} - ${mapping.projectName}`, deleteUserToProject)"
                  >
                    <X class="w-3 h-3" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>

    <Separator />

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
              <TableHead class="w-16 text-center">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="isLoadingCompanyToProject">
              <TableCell colspan="5" class="text-center text-muted-foreground">
                로딩 중...
              </TableCell>
            </TableRow>
            <TableRow v-else-if="companyToProjectList.length === 0">
              <TableCell colspan="5" class="text-center text-muted-foreground">
                매핑이 없습니다.
              </TableCell>
            </TableRow>
            <TableRow v-for="mapping in companyToProjectList" :key="mapping.id">
              <TableCell>{{ mapping.projectName }}</TableCell>
              <TableCell>{{ mapping.companyName }}</TableCell>
              <TableCell>{{ mapping.roleName }}</TableCell>
              <TableCell>{{ mapping.workTypeName || '-' }}</TableCell>
              <TableCell class="text-center">
                <div class="flex justify-center items-center gap-1">
                  <button
                    class="p-0.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"
                    @click.stop="openEditCompanyToProjectDialog(mapping)"
                  >
                    <Pencil class="w-3 h-3" />
                  </button>
                  <button
                    class="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    :disabled="isDeletingCompanyToProject"
                    @click.stop="openDeleteDialog(mapping.id, `${mapping.companyName} - ${mapping.projectName}`, deleteCompanyToProject)"
                  >
                    <X class="w-3 h-3" />
                  </button>
                </div>
              </TableCell>
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

    <!-- 회사-프로젝트 매핑 수정 Dialog -->
    <Dialog v-model:open="isEditCompanyToProjectDialogOpen">
      <DialogContent class="sm:max-w-[500px]" @interact-outside.prevent>
        <DialogHeader>
          <DialogTitle>회사-프로젝트 매핑 수정</DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid gap-2">
            <Label>프로젝트</Label>
            <Input :model-value="editingCompanyToProject?.projectName" disabled />
          </div>
          <div class="grid gap-2">
            <Label>회사</Label>
            <Input :model-value="editingCompanyToProject?.companyName" disabled />
          </div>
          <div class="grid gap-2">
            <Label>회사 역할 *</Label>
            <Select v-model="editCompanyToProjectForm.roleId">
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
              v-model="editCompanyToProjectForm.workTypeId"
              :disabled="isLoadingWorkTypes"
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
          <Button variant="outline" @click="isEditCompanyToProjectDialogOpen = false">취소</Button>
          <Button @click="handleUpdateCompanyToProject" :disabled="isUpdatingCompanyToProject">
            {{ isUpdatingCompanyToProject ? '저장 중...' : '저장' }}
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
            <Label>사용자 *</Label>
            <Select v-model="userToProjectForm.userId">
              <SelectTrigger>
                <SelectValue placeholder="사용자 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="u in users" :key="u.id" :value="u.id">
                  {{ u.userName }} ({{ u.phoneNumber }})
                </SelectItem>
              </SelectContent>
            </Select>
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
            <Label>소속회사 *</Label>
            <Select v-model="userToProjectForm.companyToProjectId" :disabled="!userToProjectForm.projectId || isLoadingDialogCompanyToProject">
              <SelectTrigger>
                <SelectValue :placeholder="isLoadingDialogCompanyToProject ? '로딩 중...' : (filteredCompanyToProjectForCreate.length === 0 ? '이 프로젝트에 매핑된 회사 없음' : '소속회사 선택')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="m in filteredCompanyToProjectForCreate" :key="m.id" :value="m.id">
                  {{ m.companyName }}<span v-if="selectedUserCompanyId === m.companyId" class="text-xs text-primary ml-1">(사용자 회사)</span>
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

    <!-- 사용자-프로젝트 매핑 수정 Dialog -->
    <Dialog v-model:open="isEditUserToProjectDialogOpen">
      <DialogContent class="sm:max-w-[500px]" @interact-outside.prevent>
        <DialogHeader>
          <DialogTitle>사용자-프로젝트 매핑 수정</DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid gap-2">
            <Label>사용자</Label>
            <Input :model-value="editingUserToProject ? `${editingUserToProject.userName} (${editingUserToProject.userEmail})` : ''" disabled />
          </div>
          <div class="grid gap-2">
            <Label>프로젝트</Label>
            <Input :model-value="editingUserToProject?.projectName" disabled />
          </div>
          <div class="grid gap-2">
            <Label>소속회사 *</Label>
            <Select v-model="editUserToProjectForm.companyToProjectId" :disabled="isLoadingDialogCompanyToProject">
              <SelectTrigger>
                <SelectValue :placeholder="isLoadingDialogCompanyToProject ? '로딩 중...' : (filteredCompanyToProjectForEdit.length === 0 ? '이 프로젝트에 매핑된 회사 없음' : '소속회사 선택')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="m in filteredCompanyToProjectForEdit" :key="m.id" :value="m.id">
                  {{ m.companyName }}<span v-if="editingUserCompanyId === m.companyId" class="text-xs text-primary ml-1">(사용자 회사)</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-2">
            <Label>프로젝트 직책</Label>
            <Input v-model="editUserToProjectForm.projectRole" placeholder="예: 현장소장" />
          </div>
          <div class="grid gap-2">
            <Label>시스템 역할 *</Label>
            <Select v-model="editUserToProjectForm.systemRoleId">
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
          <Button variant="outline" @click="isEditUserToProjectDialogOpen = false">취소</Button>
          <Button @click="handleUpdateUserToProject" :disabled="isUpdatingUserToProject">
            {{ isUpdatingUserToProject ? '저장 중...' : '저장' }}
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
            '{{ deleteTargetName }}' 항목을 삭제하시겠습니까?
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
