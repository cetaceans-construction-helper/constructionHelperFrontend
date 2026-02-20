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
import { useProjectManagement } from '../composables/useProjectManagement'
import type { CreateProjectPayload } from '@/types/super'

const { projects, isLoading, isCreating, loadProjects, createProject } = useProjectManagement()

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
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading">
            <TableCell colspan="5" class="text-center text-muted-foreground">
              로딩 중...
            </TableCell>
          </TableRow>
          <TableRow v-else-if="projects.length === 0">
            <TableCell colspan="5" class="text-center text-muted-foreground">
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
  </div>
</template>
