<script setup lang="ts">
import { computed } from 'vue'
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
import type { EquipmentSpecResponse } from '@/api/reference'
import type { Contractor } from '@/api/attendance'

interface Props {
  boxId: string
  companyId: string | null
  companyName: string
  selectedSpecs: EquipmentSpecResponse[]
  allEquipmentSpecs: EquipmentSpecResponse[]
  isLoading: boolean
  contractors: Contractor[]
  getCount: (boxId: string, specId: number) => number
  getWorkTime: (boxId: string, specId: number) => number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  remove: [boxId: string]
  selectCompany: [boxId: string, companyId: string]
  addSpec: [boxId: string, specId: number]
  removeSpec: [boxId: string, specId: number]
  incrementCount: [boxId: string, specId: number]
  decrementCount: [boxId: string, specId: number]
  setCount: [boxId: string, specId: number, count: number]
  incrementWorkTime: [boxId: string, specId: number]
  decrementWorkTime: [boxId: string, specId: number]
  setWorkTime: [boxId: string, specId: number, time: number]
  setFullDay: [boxId: string, specId: number]
  setHalfDay: [boxId: string, specId: number]
}>()

// 아직 추가되지 않은 장비규격만 필터
const availableSpecs = computed(() => {
  const selectedIds = new Set(props.selectedSpecs.map((s) => s.id))
  return props.allEquipmentSpecs.filter((s) => !selectedIds.has(s.id))
})

function handleCompanyChange(value: unknown) {
  if (value) {
    emit('selectCompany', props.boxId, String(value))
  }
}

function handleSpecAdd(value: unknown) {
  if (value) {
    emit('addSpec', props.boxId, Number(value))
  }
}

function handleCountInput(specId: number, val: string | number) {
  const value = parseInt(String(val), 10)
  emit('setCount', props.boxId, specId, isNaN(value) ? 0 : value)
}

function handleWorkTimeInput(specId: number, val: string | number) {
  const value = parseFloat(String(val))
  emit('setWorkTime', props.boxId, specId, isNaN(value) ? 0 : value)
}
</script>

<template>
  <div class="border border-border rounded-lg bg-card">
    <!-- 헤더 -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
      <div v-if="companyId" class="font-medium text-sm">
        {{ companyName }}
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
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button variant="ghost" size="icon-sm" @click="emit('remove', boxId)">
        <X class="w-4 h-4" />
      </Button>
    </div>

    <!-- 장비규격별 입력 -->
    <div class="p-4 space-y-3">
      <!-- 로딩 상태 -->
      <div v-if="isLoading" class="flex items-center justify-center py-4">
        <Loader2 class="w-5 h-5 animate-spin text-muted-foreground" />
        <span class="ml-2 text-sm text-muted-foreground">장비 목록 로딩중...</span>
      </div>

      <!-- 업체 미선택 상태 -->
      <div v-else-if="!companyId" class="text-center text-muted-foreground text-sm py-2">
        협력업체를 선택해주세요.
      </div>

      <!-- 선택된 장비규격 목록 + 추가 드롭다운 -->
      <template v-else>
        <!-- 선택된 장비 행들 -->
        <div
          v-for="spec in selectedSpecs"
          :key="spec.id"
          class="space-y-1"
        >
          <!-- 장비명 + 삭제 -->
          <div class="flex items-center justify-between">
            <span class="text-sm text-muted-foreground">
              {{ spec.equipmentTypeName }} - {{ spec.name }}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              class="h-5 w-5"
              @click="emit('removeSpec', boxId, spec.id)"
            >
              <X class="w-3 h-3" />
            </Button>
          </div>
          <!-- 컨트롤 -->
          <div class="flex items-center gap-3 pl-2">
            <!-- 전일/반일 버튼 -->
            <div class="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                class="h-7 px-2 text-xs"
                @click="emit('setFullDay', boxId, spec.id)"
              >
                전일
              </Button>
              <Button
                variant="outline"
                size="sm"
                class="h-7 px-2 text-xs"
                @click="emit('setHalfDay', boxId, spec.id)"
              >
                반일
              </Button>
            </div>

            <!-- workTime 컨트롤 -->
            <div class="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                @click="emit('decrementWorkTime', boxId, spec.id)"
              >
                <Minus class="w-3 h-3" />
              </Button>
              <Input
                type="number"
                class="w-16 text-center h-7 text-sm"
                :model-value="getWorkTime(boxId, spec.id)"
                min="0"
                step="0.5"
                @update:model-value="(val) => handleWorkTimeInput(spec.id, val)"
              />
              <Button
                variant="outline"
                size="icon-sm"
                @click="emit('incrementWorkTime', boxId, spec.id)"
              >
                <Plus class="w-3 h-3" />
              </Button>
              <span class="text-xs text-muted-foreground">시간</span>
            </div>

            <!-- 대수 컨트롤 -->
            <div class="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                @click="emit('decrementCount', boxId, spec.id)"
              >
                <Minus class="w-3 h-3" />
              </Button>
              <Input
                type="number"
                class="w-14 text-center h-7 text-sm"
                :model-value="getCount(boxId, spec.id)"
                min="0"
                @update:model-value="(val) => handleCountInput(spec.id, val)"
              />
              <Button
                variant="outline"
                size="icon-sm"
                @click="emit('incrementCount', boxId, spec.id)"
              >
                <Plus class="w-3 h-3" />
              </Button>
              <span class="text-xs text-muted-foreground">대</span>
            </div>
          </div>
        </div>

        <!-- 장비 추가 드롭다운 -->
        <div v-if="availableSpecs.length > 0">
          <Select @update:model-value="handleSpecAdd">
            <SelectTrigger class="h-8">
              <SelectValue placeholder="+ 장비 추가" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="spec in availableSpecs"
                :key="spec.id"
                :value="String(spec.id)"
              >
                {{ spec.equipmentTypeName }} - {{ spec.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div
          v-if="selectedSpecs.length === 0 && availableSpecs.length === 0"
          class="text-center text-muted-foreground text-sm py-2"
        >
          등록된 장비규격이 없습니다.
        </div>
      </template>
    </div>
  </div>
</template>
