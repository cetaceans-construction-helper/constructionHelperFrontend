<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Plus, Minus, Loader2 } from 'lucide-vue-next'
import type { LaborTypeResponse } from '@/api/reference'
import type { Contractor } from '@/api/attendance'

interface Props {
  boxId: string
  companyId: string | null
  companyName: string
  workTypeName: string
  laborTypes: LaborTypeResponse[]
  isLoading: boolean
  contractors: Contractor[]
  getCount: (boxId: string, laborTypeId: number) => number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  remove: [boxId: string]
  selectCompany: [boxId: string, companyId: string]
  increment: [boxId: string, laborTypeId: number]
  decrement: [boxId: string, laborTypeId: number]
  setCount: [boxId: string, laborTypeId: number, count: number]
}>()

function handleCompanyChange(value: unknown) {
  if (value) {
    emit('selectCompany', props.boxId, String(value))
  }
}

function handleInputChange(laborTypeId: number, val: string | number) {
  const value = parseInt(String(val), 10)
  emit('setCount', props.boxId, laborTypeId, isNaN(value) ? 0 : value)
}
</script>

<template>
  <div class="border border-border rounded-lg bg-card">
    <!-- 헤더 -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
      <div v-if="companyId" class="font-medium text-sm">
        {{ companyName }} - {{ workTypeName }}
      </div>
      <div v-else class="flex-1 mr-4">
        <Select @update:model-value="handleCompanyChange">
          <SelectTrigger>
            <SelectValue placeholder="협력업체 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="company in contractors"
              :key="company.companyId"
              :value="company.companyId"
            >
              {{ company.companyDisplayName }}
              <span v-if="company.workTypeName" class="text-muted-foreground ml-2">
                ({{ company.workTypeName }})
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button variant="ghost" size="icon-sm" @click="emit('remove', boxId)">
        <X class="w-4 h-4" />
      </Button>
    </div>

    <!-- 직종별 인원 입력 -->
    <div class="p-4 space-y-3">
      <!-- 로딩 상태 -->
      <div v-if="isLoading" class="flex items-center justify-center py-4">
        <Loader2 class="w-5 h-5 animate-spin text-muted-foreground" />
        <span class="ml-2 text-sm text-muted-foreground">직종 목록 로딩중...</span>
      </div>

      <!-- 협력업체 미선택 상태 -->
      <div v-else-if="!companyId" class="text-center text-muted-foreground text-sm py-2">
        협력업체를 선택해주세요.
      </div>

      <!-- 직종 목록 -->
      <template v-else>
        <div
          v-for="laborType in laborTypes"
          :key="laborType.id"
          class="flex items-center justify-between"
        >
          <span class="text-sm text-muted-foreground">{{ laborType.name }}</span>
          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              @click="emit('decrement', boxId, laborType.id)"
            >
              <Minus class="w-4 h-4" />
            </Button>
            <Input
              type="number"
              class="w-16 text-center h-8"
              :model-value="getCount(boxId, laborType.id)"
              min="0"
              @update:model-value="(val) => handleInputChange(laborType.id, val)"
            />
            <Button
              variant="outline"
              size="icon-sm"
              @click="emit('increment', boxId, laborType.id)"
            >
              <Plus class="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div v-if="laborTypes.length === 0" class="text-center text-muted-foreground text-sm py-2">
          등록된 직종이 없습니다.
        </div>
      </template>
    </div>
  </div>
</template>
