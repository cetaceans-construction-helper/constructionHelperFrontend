<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Pencil, X } from 'lucide-vue-next'
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
import { Label } from '@/components/ui/label'
import { useProjectManagement } from '../composables/useProjectManagement'
import type { Project, CreateProjectPayload, UpdateProjectPayload } from '@/types/super'

const {
  projects,
  isLoading,
  isCreating,
  isUpdating,
  isDeleting,
  loadProjects,
  createProject,
  updateProject,
  deleteProject,
} = useProjectManagement()

// 생성 Dialog
const isDialogOpen = ref(false)
const form = ref<CreateProjectPayload>({
  name: '',
  address: '',
  startDate: '',
  completionDate: '',
  weatherNx: undefined,
  weatherNy: undefined,
})

const resetForm = () => {
  form.value = {
    name: '',
    address: '',
    startDate: '',
    completionDate: '',
    weatherNx: undefined,
    weatherNy: undefined,
  }
}

const handleCreate = async () => {
  if (!form.value.name.trim()) {
    alert('프로젝트명을 입력해주세요.')
    return
  }
  if (!form.value.startDate || !form.value.completionDate) {
    alert('착공일과 준공일을 입력해주세요.')
    return
  }
  const success = await createProject(form.value)
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
const editingProject = ref<Project | null>(null)
const editForm = ref<UpdateProjectPayload>({
  name: '',
  address: '',
  startDate: '',
  completionDate: '',
  weatherNx: undefined,
  weatherNy: undefined,
})

const openEditDialog = (project: Project) => {
  editingProject.value = project
  editForm.value = {
    name: project.projectName,
    address: project.siteAddress || '',
    startDate: project.startDate,
    completionDate: project.completionDate,
    weatherNx: project.weatherNx ?? undefined,
    weatherNy: project.weatherNy ?? undefined,
  }
  isEditDialogOpen.value = true
}

const handleUpdate = async () => {
  if (!editingProject.value) return
  if (!editForm.value.name.trim()) {
    alert('프로젝트명을 입력해주세요.')
    return
  }
  if (!editForm.value.startDate || !editForm.value.completionDate) {
    alert('착공일과 준공일을 입력해주세요.')
    return
  }
  const success = await updateProject(editingProject.value.id, editForm.value)
  if (success) {
    isEditDialogOpen.value = false
    editingProject.value = null
  }
}

// 삭제 Dialog
const showDeleteDialog = ref(false)
const deleteTargetId = ref<string | null>(null)
const deleteTargetName = ref('')

const openDeleteDialog = (project: Project) => {
  deleteTargetId.value = project.id
  deleteTargetName.value = project.projectName
  showDeleteDialog.value = true
}

const confirmDelete = async () => {
  if (deleteTargetId.value) {
    await deleteProject(deleteTargetId.value)
  }
  showDeleteDialog.value = false
}

onMounted(() => {
  loadProjects()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-end">
      <Button @click="openDialog">프로젝트 추가</Button>
    </div>

    <div class="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>프로젝트명</TableHead>
            <TableHead>현장주소</TableHead>
            <TableHead>착공일</TableHead>
            <TableHead>준공일</TableHead>
            <TableHead>기상청 좌표</TableHead>
            <TableHead class="w-16 text-center">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading">
            <TableCell colspan="6" class="text-center text-muted-foreground">
              로딩 중...
            </TableCell>
          </TableRow>
          <TableRow v-else-if="projects.length === 0">
            <TableCell colspan="6" class="text-center text-muted-foreground">
              등록된 프로젝트가 없습니다.
            </TableCell>
          </TableRow>
          <TableRow v-for="project in projects" :key="project.id">
            <TableCell class="font-medium">{{ project.projectName }}</TableCell>
            <TableCell>{{ project.siteAddress || '-' }}</TableCell>
            <TableCell>{{ project.startDate }}</TableCell>
            <TableCell>{{ project.completionDate }}</TableCell>
            <TableCell>
              {{
                project.weatherNx && project.weatherNy
                  ? `(${project.weatherNx}, ${project.weatherNy})`
                  : '-'
              }}
            </TableCell>
            <TableCell class="text-center">
              <div class="flex justify-center items-center gap-1">
                <button
                  class="p-0.5 rounded hover:bg-primary/10 text-muted-foreground hover:text-primary"
                  @click.stop="openEditDialog(project)"
                >
                  <Pencil class="w-3 h-3" />
                </button>
                <button
                  class="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  :disabled="isDeleting"
                  @click.stop="openDeleteDialog(project)"
                >
                  <X class="w-3 h-3" />
                </button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- 프로젝트 추가 Dialog -->
    <Dialog v-model:open="isDialogOpen">
      <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>프로젝트 추가</DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid gap-2">
            <Label for="name">프로젝트명 *</Label>
            <Input id="name" v-model="form.name" placeholder="프로젝트명 입력" />
          </div>
          <div class="grid gap-2">
            <Label for="address">현장주소</Label>
            <Input id="address" v-model="form.address" placeholder="현장 주소" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="startDate">착공일 *</Label>
              <Input id="startDate" v-model="form.startDate" type="date" />
            </div>
            <div class="grid gap-2">
              <Label for="completionDate">준공일 *</Label>
              <Input id="completionDate" v-model="form.completionDate" type="date" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="weatherNx">기상청 X좌표</Label>
              <Input
                id="weatherNx"
                v-model.number="form.weatherNx"
                type="number"
                placeholder="NX"
              />
            </div>
            <div class="grid gap-2">
              <Label for="weatherNy">기상청 Y좌표</Label>
              <Input
                id="weatherNy"
                v-model.number="form.weatherNy"
                type="number"
                placeholder="NY"
              />
            </div>
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

    <!-- 프로젝트 수정 Dialog -->
    <Dialog v-model:open="isEditDialogOpen">
      <DialogContent class="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>프로젝트 정보 수정</DialogTitle>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid gap-2">
            <Label for="edit-name">프로젝트명 *</Label>
            <Input id="edit-name" v-model="editForm.name" placeholder="프로젝트명 입력" />
          </div>
          <div class="grid gap-2">
            <Label for="edit-address">현장주소</Label>
            <Input id="edit-address" v-model="editForm.address" placeholder="현장 주소" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="edit-startDate">착공일 *</Label>
              <Input id="edit-startDate" v-model="editForm.startDate" type="date" />
            </div>
            <div class="grid gap-2">
              <Label for="edit-completionDate">준공일 *</Label>
              <Input id="edit-completionDate" v-model="editForm.completionDate" type="date" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="grid gap-2">
              <Label for="edit-weatherNx">기상청 X좌표</Label>
              <Input
                id="edit-weatherNx"
                v-model.number="editForm.weatherNx"
                type="number"
                placeholder="NX"
              />
            </div>
            <div class="grid gap-2">
              <Label for="edit-weatherNy">기상청 Y좌표</Label>
              <Input
                id="edit-weatherNy"
                v-model.number="editForm.weatherNy"
                type="number"
                placeholder="NY"
              />
            </div>
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
            '{{ deleteTargetName }}' 프로젝트를 삭제하시겠습니까?
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
