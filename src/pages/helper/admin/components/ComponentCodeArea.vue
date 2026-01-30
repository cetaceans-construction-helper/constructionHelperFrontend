<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-vue-next'
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
import { useComponentCode } from '../composables/useComponentCode'

const {
  // 부재 타입
  componentTypes,
  newComponentTypeName,
  isCreatingType,
  loadComponentTypes,
  addComponentType,

  // 부재 코드
  componentCodes,
  selectedComponentTypeId,
  newComponentCode,
  isCreatingCode,
  addComponentCode,

  // 매핑
  mappings,
  selectedComponentCodeId,
  isCreatingMapping,
  divisions,
  workTypes,
  subWorkTypes,
  mappingForm,
  isLoadingWorkTypes,
  isLoadingSubWorkTypes,
  loadDivisions,
  loadMappings,
  addMapping,
} = useComponentCode()

// 매핑 테이블 접기/펼치기
const isMappingTableExpanded = ref(true)

onMounted(() => {
  loadComponentTypes()
  loadDivisions()
})

// 부재 타입 선택
function selectComponentType(id: number) {
  selectedComponentTypeId.value = id
  selectedComponentCodeId.value = null
}

// 부재 코드 선택 (0 = 모든코드)
function selectComponentCode(id: number) {
  selectedComponentCodeId.value = id
}

// Select용 string 변환
const selectedTypeIdStr = computed(() =>
  selectedComponentTypeId.value != null ? String(selectedComponentTypeId.value) : '',
)
const selectedCodeIdStr = computed(() =>
  selectedComponentCodeId.value != null ? String(selectedComponentCodeId.value) : '',
)

// 모든코드 선택 여부
const isAllCodesSelected = computed(() => selectedComponentCodeId.value === 0)

// 매핑 목록 새로고침
function refreshMappings() {
  if (selectedComponentCodeId.value != null && selectedComponentCodeId.value > 0) {
    loadMappings(selectedComponentCodeId.value)
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- 부재 분류 (계층식) -->
    <div>
      <h3 class="text-sm font-semibold mb-3">부재분류</h3>
      <div class="grid grid-cols-2 gap-4">
        <!-- ComponentType 컬럼 -->
        <div class="space-y-2">
          <p class="text-xs text-muted-foreground font-medium">부재 타입 (ComponentType)</p>
          <div class="flex gap-1">
            <Input
              v-model="newComponentTypeName"
              placeholder="이름 입력"
              class="h-8 text-sm"
              @keyup.enter="addComponentType"
            />
            <Button
              size="sm"
              class="h-8 shrink-0"
              :disabled="isCreatingType || !newComponentTypeName.trim()"
              @click="addComponentType"
            >
              추가
            </Button>
          </div>
          <div class="space-y-1 max-h-48 overflow-y-auto">
            <div
              v-for="ct in componentTypes"
              :key="ct.id"
              class="px-3 py-2 border rounded-md cursor-pointer text-sm transition-colors"
              :class="{
                'border-primary bg-primary/10 font-medium': selectedComponentTypeId === ct.id,
                'border-border hover:bg-muted/50': selectedComponentTypeId !== ct.id,
              }"
              @click="selectComponentType(ct.id)"
            >
              {{ ct.name }}
            </div>
            <p v-if="componentTypes.length === 0" class="text-xs text-muted-foreground py-2 text-center">
              항목 없음
            </p>
          </div>
        </div>

        <!-- ComponentCode 컬럼 -->
        <div class="space-y-2">
          <p class="text-xs text-muted-foreground font-medium">부재 코드 (ComponentCode)</p>
          <div class="flex gap-1">
            <Input
              v-model="newComponentCode"
              placeholder="코드 입력"
              class="h-8 text-sm"
              :disabled="selectedComponentTypeId == null"
              @keyup.enter="addComponentCode"
            />
            <Button
              size="sm"
              class="h-8 shrink-0"
              :disabled="isCreatingCode || !newComponentCode.trim() || selectedComponentTypeId == null"
              @click="addComponentCode"
            >
              추가
            </Button>
          </div>
          <div class="space-y-1 max-h-48 overflow-y-auto">
            <div
              v-for="cc in componentCodes"
              :key="cc.id"
              class="px-3 py-2 border rounded-md cursor-pointer text-sm transition-colors"
              :class="{
                'border-primary bg-primary/10 font-medium': selectedComponentCodeId === cc.id,
                'border-border hover:bg-muted/50': selectedComponentCodeId !== cc.id,
              }"
              @click="selectComponentCode(cc.id)"
            >
              {{ cc.code }}
            </div>
            <p
              v-if="selectedComponentTypeId != null && componentCodes.length === 0"
              class="text-xs text-muted-foreground py-2 text-center"
            >
              항목 없음
            </p>
            <p
              v-if="selectedComponentTypeId == null"
              class="text-xs text-muted-foreground py-2 text-center"
            >
              부재 타입을 선택하세요
            </p>
          </div>
        </div>
      </div>
    </div>

    <Separator />

    <!-- 부재코드-세부공종 매핑 -->
    <div>
      <h3 class="text-sm font-semibold mb-3">부재코드-세부공종 연결</h3>

      <!-- 부재코드 선택 드롭다운 -->
      <div class="grid grid-cols-2 gap-2 mb-3">
        <!-- 부재타입 Select -->
        <Select :model-value="selectedTypeIdStr" @update:model-value="(v) => v && selectComponentType(Number(v))">
          <SelectTrigger class="h-8 text-sm">
            <SelectValue placeholder="부재타입 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="ct in componentTypes" :key="ct.id" :value="String(ct.id)">
              {{ ct.name }}
            </SelectItem>
          </SelectContent>
        </Select>

        <!-- 부재코드 Select -->
        <Select
          :model-value="selectedCodeIdStr"
          :disabled="selectedComponentTypeId == null"
          @update:model-value="(v) => v && selectComponentCode(Number(v))"
        >
          <SelectTrigger class="h-8 text-sm">
            <SelectValue placeholder="부재코드 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0" class="font-medium text-primary">
              모든코드
            </SelectItem>
            <SelectItem v-for="cc in componentCodes" :key="cc.id" :value="String(cc.id)">
              {{ cc.code }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- 매핑 폼 -->
      <div class="grid grid-cols-4 gap-2 mb-3">
        <!-- Division Select -->
        <Select v-model="mappingForm.divisionId" :disabled="selectedComponentCodeId == null">
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

        <Button
          size="sm"
          class="h-8"
          :disabled="isCreatingMapping || selectedComponentCodeId == null || !mappingForm.subWorkTypeId"
          @click="addMapping"
        >
          {{ isAllCodesSelected ? '일괄 연결' : '연결 추가' }}
        </Button>
      </div>

      <!-- 매핑 테이블 (접을 수 있음) -->
      <div v-if="!isAllCodesSelected && selectedComponentCodeId != null" class="border rounded-md">
        <!-- 테이블 헤더 (토글 버튼) -->
        <div class="flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors">
          <button
            class="flex items-center gap-2 text-sm font-medium"
            @click="isMappingTableExpanded = !isMappingTableExpanded"
          >
            <component :is="isMappingTableExpanded ? ChevronDown : ChevronRight" class="h-4 w-4" />
            <span>매핑 목록 ({{ mappings.length }})</span>
          </button>
          <button
            class="p-1 rounded hover:bg-muted"
            title="새로고침"
            @click.stop="refreshMappings"
          >
            <RefreshCw class="h-4 w-4" />
          </button>
        </div>

        <!-- 테이블 본문 -->
        <div v-show="isMappingTableExpanded" class="border-t">
          <table v-if="mappings.length > 0" class="w-full text-sm">
            <thead class="bg-muted/50">
              <tr>
                <th class="px-3 py-2 text-left font-medium">부재코드</th>
                <th class="px-3 py-2 text-left font-medium">분류</th>
                <th class="px-3 py-2 text-left font-medium">공종</th>
                <th class="px-3 py-2 text-left font-medium">세부공종</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-for="m in mappings" :key="`${m.componentCodeId}-${m.subWorkTypeId}`" class="hover:bg-muted/30">
                <td class="px-3 py-2">{{ m.componentCode }}</td>
                <td class="px-3 py-2">{{ m.divisionName }}</td>
                <td class="px-3 py-2">{{ m.workTypeName }}</td>
                <td class="px-3 py-2">{{ m.subWorkTypeName }}</td>
              </tr>
            </tbody>
          </table>
          <p v-else class="text-xs text-muted-foreground py-4 text-center">
            연결된 세부공종이 없습니다
          </p>
        </div>
      </div>

      <!-- 모든코드 선택 시 안내 -->
      <p v-else-if="isAllCodesSelected" class="text-xs text-muted-foreground py-2 text-center border rounded-md">
        "모든코드" 선택 시 해당 부재타입의 모든 부재코드에 세부공종이 일괄 연결됩니다
      </p>

      <!-- 부재코드 미선택 -->
      <p v-else class="text-xs text-muted-foreground py-2 text-center">
        부재코드를 선택하세요
      </p>
    </div>
  </div>
</template>
