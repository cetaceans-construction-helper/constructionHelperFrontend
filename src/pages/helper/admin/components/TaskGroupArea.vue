<script setup lang="ts">
import { onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useTaskGroup } from '../composables/useTaskGroup'

const {
  taskGroups,
  newTaskGroupName,
  isCreatingGroup,
  mappings,
  selectedTaskGroupName,
  isCreatingMapping,
  divisions,
  workTypes,
  subWorkTypes,
  mappingForm,
  isLoadingWorkTypes,
  isLoadingSubWorkTypes,
  loadTaskGroups,
  loadDivisions,
  addTaskGroup,
  addMapping,
} = useTaskGroup()

onMounted(() => {
  loadTaskGroups()
  loadDivisions()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 작업 그룹 관리 -->
    <div>
      <h3 class="text-sm font-semibold mb-3">작업 그룹 관리</h3>
      <div class="flex gap-1 mb-2">
        <Input
          v-model="newTaskGroupName"
          placeholder="그룹 이름 입력"
          class="h-8 text-sm max-w-xs"
          @keyup.enter="addTaskGroup"
        />
        <Button
          size="sm"
          class="h-8 shrink-0"
          :disabled="isCreatingGroup || !newTaskGroupName.trim()"
          @click="addTaskGroup"
        >
          추가
        </Button>
      </div>
      <div class="flex flex-wrap gap-1">
        <div
          v-for="tg in taskGroups"
          :key="tg.id"
          class="px-3 py-1.5 border rounded-md text-sm border-border"
        >
          {{ tg.name }}
        </div>
        <p
          v-if="taskGroups.length === 0"
          class="text-xs text-muted-foreground py-2"
        >
          등록된 그룹이 없습니다
        </p>
      </div>
    </div>

    <Separator />

    <!-- 작업그룹-세부공종 연결 -->
    <div>
      <h3 class="text-sm font-semibold mb-3">작업그룹-세부공종 연결</h3>

      <!-- 매핑 폼 -->
      <div class="grid grid-cols-4 gap-2 mb-3">
        <!-- TaskGroup Select -->
        <Select v-model="selectedTaskGroupName">
          <SelectTrigger class="h-8 text-sm">
            <SelectValue placeholder="작업그룹" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="tg in taskGroups" :key="tg.id" :value="tg.name">
              {{ tg.name }}
            </SelectItem>
          </SelectContent>
        </Select>

        <!-- Division Select -->
        <Select v-model="mappingForm.divisionId">
          <SelectTrigger class="h-8 text-sm">
            <SelectValue placeholder="분류" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="div in divisions" :key="div.id" :value="String(div.id)">
              {{ div.name }}
            </SelectItem>
          </SelectContent>
        </Select>

        <!-- WorkType Select -->
        <Select v-model="mappingForm.workTypeId" :disabled="!mappingForm.divisionId || isLoadingWorkTypes">
          <SelectTrigger class="h-8 text-sm">
            <SelectValue :placeholder="isLoadingWorkTypes ? '로딩...' : '공종'" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="wt in workTypes" :key="wt.id" :value="String(wt.id)">
              {{ wt.name }}
            </SelectItem>
          </SelectContent>
        </Select>

        <!-- SubWorkType Select -->
        <Select v-model="mappingForm.subWorkTypeId" :disabled="!mappingForm.workTypeId || isLoadingSubWorkTypes">
          <SelectTrigger class="h-8 text-sm">
            <SelectValue :placeholder="isLoadingSubWorkTypes ? '로딩...' : '세부공종'" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="swt in subWorkTypes" :key="swt.id" :value="String(swt.id)">
              {{ swt.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        size="sm"
        class="h-8 mb-3"
        :disabled="isCreatingMapping || !selectedTaskGroupName || !mappingForm.subWorkTypeId"
        @click="addMapping"
      >
        연결 추가
      </Button>

      <!-- 매핑 목록 -->
      <div class="space-y-1 max-h-48 overflow-y-auto">
        <div
          v-for="(m, idx) in mappings"
          :key="idx"
          class="px-3 py-2 border border-border rounded-md text-sm"
        >
          <span class="font-medium">{{ selectedTaskGroupName }}</span>
          <span class="text-muted-foreground mx-1">&rarr;</span>
          <span>{{ m.divisionName }} / {{ m.workTypeName }} / {{ m.subWorkTypeName }}</span>
        </div>
        <p
          v-if="selectedTaskGroupName && mappings.length === 0"
          class="text-xs text-muted-foreground py-2 text-center"
        >
          연결된 세부공종이 없습니다
        </p>
        <p
          v-if="!selectedTaskGroupName"
          class="text-xs text-muted-foreground py-2 text-center"
        >
          작업그룹을 선택하세요
        </p>
      </div>
    </div>
  </div>
</template>
