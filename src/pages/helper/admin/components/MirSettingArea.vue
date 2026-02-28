<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X } from 'lucide-vue-next'
import { useDocumentSetting } from '../composables/useDocumentSetting'
import type { DocumentSlot } from '@/api/projectDocumentCode'

const {
  isLoading,
  isSaving,
  separator,
  slots,
  cellRef,
  mirTemplateUrl,
  dateFormats,
  imageCategories,
  load,
  save,
  uploadTemplate,
} = useDocumentSetting()

onMounted(() => {
  load()
})

// 템플릿 업로드
const templateFileInput = ref<HTMLInputElement | null>(null)
function onTemplateFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    uploadTemplate(file)
    input.value = ''
  }
}

// 슬롯 타입 옵션
const slotTypeOptions: { value: string; label: string }[] = [
  { value: 'none', label: '없음' },
  { value: 'TEXT', label: 'TEXT (직접 입력)' },
  { value: 'DATE', label: 'DATE (날짜)' },
  { value: 'DIVISION', label: 'DIVISION (공종)' },
  { value: 'WORK_TYPE', label: 'WORK_TYPE (작업유형)' },
  { value: 'MATERIAL_TYPE', label: 'MATERIAL_TYPE (자재유형)' },
  { value: 'SEQ', label: 'SEQ (순번)' },
]


function updateSlotType(index: number, val: string | number | boolean | Record<string, unknown>) {
  const slot = slots.value[index]
  if (!slot) return
  slot.type = val === 'none' ? null : (String(val) as DocumentSlot)
}

// 미리보기
const preview = computed(() => {
  const parts: string[] = []
  for (const slot of slots.value) {
    if (!slot.type) continue
    switch (slot.type) {
      case 'TEXT':
        parts.push(slot.value || 'TEXT')
        break
      case 'DATE':
        parts.push(slot.format || 'YYYYMMDD')
        break
      case 'DIVISION':
        parts.push('DIV')
        break
      case 'WORK_TYPE':
        parts.push('WT')
        break
      case 'MATERIAL_TYPE':
        parts.push('MT')
        break
      case 'SEQ':
        parts.push(String(1).padStart(slot.padding || 3, '0'))
        break
    }
  }
  return parts.join(separator.value === 'none' ? '' : separator.value)
})

// groupBy 대상: 현재 슬롯을 제외한 활성 슬롯
function getGroupByTargets(currentKey: string) {
  return slots.value.filter((s) => s.key !== currentKey && s.type !== null)
}

function toggleGroupBy(slotIndex: number, targetKey: string) {
  const slot = slots.value[slotIndex]
  if (!slot) return
  slot.groupBy = slot.groupBy.includes(targetKey)
    ? slot.groupBy.filter((k) => k !== targetKey)
    : [...slot.groupBy, targetKey]
}

// 라인 요약 (lineConcat) 관리
const lineConcatFieldOptions = [
  { value: 'specName', label: '자재규격명' },
  { value: 'manufacturer', label: '제조사' },
]

function addLineConcat() {
  cellRef.lineConcat.push({ cell: '', field: 'specName', separator: ', ' })
}

function removeLineConcat(index: number) {
  cellRef.lineConcat.splice(index, 1)
}

// 사진 항목 관리
function addPhoto() {
  cellRef.photos.push({ key: '', cells: '', descriptionOffsetRow: '', descriptionOffsetCol: '' })
}

function removePhoto(index: number) {
  cellRef.photos.splice(index, 1)
}
</script>

<template>
  <div v-if="isLoading" class="text-sm text-muted-foreground text-center py-8">
    설정 로딩 중...
  </div>

  <div v-else class="space-y-8">
    <!-- 섹션 1: 엑셀 템플릿 -->
    <div>
      <h3 class="text-sm font-semibold mb-3">엑셀 템플릿</h3>
      <div class="flex items-center gap-3">
        <span class="text-sm text-muted-foreground">
          {{ mirTemplateUrl ? '템플릿 등록됨' : '템플릿 없음' }}
        </span>
        <input
          ref="templateFileInput"
          type="file"
          accept=".xlsx,.xls"
          class="hidden"
          @change="onTemplateFileChange"
        />
        <Button
          variant="outline"
          size="sm"
          @click="templateFileInput?.click()"
        >
          {{ mirTemplateUrl ? '템플릿 변경' : '템플릿 업로드' }}
        </Button>
      </div>
    </div>

    <Separator />

    <!-- 섹션 2: 문서번호 규칙 -->
    <div>
      <h3 class="text-sm font-semibold mb-3">문서번호 규칙</h3>

      <!-- 구분자 -->
      <div class="flex items-center gap-3 mb-4">
        <Label class="text-xs text-muted-foreground w-16 shrink-0">구분자</Label>
        <Select :model-value="separator" @update:model-value="separator = String($event)">
          <SelectTrigger class="w-32 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="-">- (하이픈)</SelectItem>
            <SelectItem value="none">없음</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- 슬롯 A~E -->
      <div class="space-y-3">
        <div
          v-for="(slot, index) in slots"
          :key="slot.key"
          class="flex items-start gap-3 p-3 border border-border rounded-md"
        >
          <span class="text-xs font-medium text-muted-foreground w-6 pt-1.5">{{ slot.key }}</span>

          <Select
            :model-value="slot.type ?? 'none'"
            @update:model-value="updateSlotType(index, $event as string)"
          >
            <SelectTrigger class="w-48 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="opt in slotTypeOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </SelectItem>
            </SelectContent>
          </Select>

          <!-- TEXT: value input -->
          <Input
            v-if="slot.type === 'TEXT'"
            v-model="slot.value"
            placeholder="고정 텍스트"
            class="h-8 text-sm w-40"
          />

          <!-- DATE: format select -->
          <Select
            v-if="slot.type === 'DATE'"
            :model-value="slot.format"
            @update:model-value="slot.format = String($event)"
          >
            <SelectTrigger class="w-40 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="fmt in dateFormats"
                :key="fmt"
                :value="fmt"
              >
                {{ fmt }}
              </SelectItem>
            </SelectContent>
          </Select>

          <!-- SEQ: padding + groupBy -->
          <template v-if="slot.type === 'SEQ'">
            <div class="flex items-center gap-2">
              <Label class="text-xs text-muted-foreground shrink-0">자릿수</Label>
              <Input
                :model-value="String(slot.padding)"
                @update:model-value="slot.padding = Number($event) || 1"
                type="number"
                min="1"
                max="10"
                class="h-8 text-sm w-16"
              />
            </div>
            <div v-if="getGroupByTargets(slot.key).length > 0" class="flex items-center gap-2">
              <Label class="text-xs text-muted-foreground shrink-0">그룹</Label>
              <div class="flex items-center gap-2">
                <label
                  v-for="target in getGroupByTargets(slot.key)"
                  :key="target.key"
                  class="flex items-center gap-1 text-xs"
                >
                  <Checkbox
                    :model-value="slot.groupBy.includes(target.key)"
                    @update:model-value="toggleGroupBy(index, target.key)"
                  />
                  <span>{{ target.key }}</span>
                </label>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 미리보기 -->
      <div class="mt-4 p-3 bg-muted/30 rounded-md">
        <Label class="text-xs text-muted-foreground">미리보기</Label>
        <p class="text-sm font-mono mt-1">{{ preview || '(슬롯을 설정하세요)' }}</p>
      </div>
    </div>

    <Separator />

    <!-- 섹션 3: 셀 매핑 -->
    <div>
      <h3 class="text-sm font-semibold mb-3">셀 매핑</h3>

      <!-- 기본정보 -->
      <p class="text-xs text-muted-foreground font-medium mb-2">기본정보</p>
      <div class="grid grid-cols-2 gap-3 mb-6">
        <div class="flex items-center gap-2">
          <Label class="text-xs text-muted-foreground w-24 shrink-0">공급업체</Label>
          <Input v-model="cellRef.delivery.supplier" placeholder="예: 0!B2" class="h-8 text-sm" />
        </div>
        <div class="flex items-center gap-2">
          <Label class="text-xs text-muted-foreground w-24 shrink-0">납품일</Label>
          <Input v-model="cellRef.delivery.deliveryDate" placeholder="예: 0!D2" class="h-8 text-sm" />
        </div>
        <div class="flex items-center gap-2">
          <Label class="text-xs text-muted-foreground w-24 shrink-0">사용위치</Label>
          <Input v-model="cellRef.delivery.location" placeholder="예: 0!B3" class="h-8 text-sm" />
        </div>
        <div class="flex items-center gap-2">
          <Label class="text-xs text-muted-foreground w-24 shrink-0">문서번호</Label>
          <Input v-model="cellRef.delivery.documentNumber" placeholder="예: 0!D3" class="h-8 text-sm" />
        </div>
        <div class="flex items-center gap-2">
          <Label class="text-xs text-muted-foreground w-24 shrink-0">자재유형명</Label>
          <Input v-model="cellRef.delivery.materialTypeName" placeholder="예: 0!B2" class="h-8 text-sm" />
        </div>
        <div class="flex items-center gap-2">
          <Label class="text-xs text-muted-foreground w-24 shrink-0">대분류명</Label>
          <Input v-model="cellRef.delivery.divisionName" placeholder="예: 0!D2" class="h-8 text-sm" />
        </div>
      </div>

      <Separator class="my-4" />

      <!-- 자재 라인 -->
      <p class="text-xs text-muted-foreground font-medium mb-2">자재 라인</p>
      <div class="space-y-3 mb-6">
        <div class="flex items-center gap-3">
          <Label class="text-xs text-muted-foreground w-24 shrink-0">시작 셀</Label>
          <Input v-model="cellRef.lines.startCell" placeholder="예: 0!A5" class="h-8 text-sm w-32" />
          <div class="flex items-center gap-1.5">
            <Label class="text-xs text-muted-foreground shrink-0">최대 행 수</Label>
            <Input
              v-model="cellRef.lines.maxRows"
              type="number"
              min="0"
              placeholder="0"
              class="h-8 text-sm w-20"
            />
          </div>
        </div>
        <p class="text-xs text-muted-foreground mt-2 mb-1">컬럼 오프셋 (비워두면 미사용)</p>
        <div class="grid grid-cols-5 gap-3">
          <div class="flex flex-col gap-1">
            <Label class="text-xs text-muted-foreground">순번 (no)</Label>
            <Input
              v-model="cellRef.lines.columns.no"
              placeholder="미사용"
              type="number"
              class="h-8 text-sm"
            />
          </div>
          <div class="flex flex-col gap-1">
            <Label class="text-xs text-muted-foreground">규격명 (specName)</Label>
            <Input
              v-model="cellRef.lines.columns.specName"
              placeholder="미사용"
              type="number"
              class="h-8 text-sm"
            />
          </div>
          <div class="flex flex-col gap-1">
            <Label class="text-xs text-muted-foreground">제조사 (manufacturer)</Label>
            <Input
              v-model="cellRef.lines.columns.manufacturer"
              placeholder="미사용"
              type="number"
              class="h-8 text-sm"
            />
          </div>
          <div class="flex flex-col gap-1">
            <Label class="text-xs text-muted-foreground">수량 (quantity)</Label>
            <Input
              v-model="cellRef.lines.columns.quantity"
              placeholder="미사용"
              type="number"
              class="h-8 text-sm"
            />
          </div>
          <div class="flex flex-col gap-1">
            <Label class="text-xs text-muted-foreground">단위 (unit)</Label>
            <Input
              v-model="cellRef.lines.columns.unit"
              placeholder="미사용"
              type="number"
              class="h-8 text-sm"
            />
          </div>
        </div>
      </div>

      <Separator class="my-4" />

      <!-- 라인 요약 -->
      <p class="text-xs text-muted-foreground font-medium mb-2">라인 요약</p>
      <div class="space-y-2 mb-6">
        <div
          v-for="(lc, idx) in cellRef.lineConcat"
          :key="idx"
          class="flex items-center gap-2"
        >
          <Input v-model="lc.cell" placeholder="예: 0!F5" class="h-8 text-sm w-24" />
          <Select :model-value="lc.field" @update:model-value="lc.field = String($event)">
            <SelectTrigger class="w-36 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="opt in lineConcatFieldOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Input v-model="lc.separator" placeholder="구분자" class="h-8 text-sm w-20" />
          <Button
            variant="ghost"
            size="sm"
            class="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            @click="removeLineConcat(idx)"
          >
            <X class="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" @click="addLineConcat">+ 추가</Button>
      </div>

      <Separator class="my-4" />

      <!-- 사진 -->
      <p class="text-xs text-muted-foreground font-medium mb-2">사진</p>
      <div class="space-y-2">
        <div
          v-for="(photo, idx) in cellRef.photos"
          :key="idx"
          class="space-y-2 border border-border rounded-lg p-3"
        >
          <div class="flex items-center gap-2">
            <Select :model-value="photo.key" @update:model-value="photo.key = String($event)">
              <SelectTrigger class="w-36 h-8 text-sm">
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="cat in imageCategories"
                  :key="cat.key"
                  :value="cat.key"
                >
                  {{ cat.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Input v-model="photo.cells" placeholder="예: 1!A10, 1!A15, 1!A20" class="h-8 text-sm flex-1" />
            <Button
              variant="ghost"
              size="sm"
              class="h-8 w-8 p-0 text-muted-foreground hover:text-destructive ml-auto"
              @click="removePhoto(idx)"
            >
              <X class="h-4 w-4" />
            </Button>
          </div>
          <div class="flex items-center gap-2">
            <Label class="text-xs text-muted-foreground shrink-0">설명 오프셋</Label>
            <div class="flex items-center gap-1">
              <Label class="text-xs text-muted-foreground shrink-0">Row</Label>
              <Input v-model="photo.descriptionOffsetRow" placeholder="0" type="number" class="h-8 text-sm w-16" />
            </div>
            <div class="flex items-center gap-1">
              <Label class="text-xs text-muted-foreground shrink-0">Col</Label>
              <Input v-model="photo.descriptionOffsetCol" placeholder="0" type="number" class="h-8 text-sm w-16" />
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" @click="addPhoto">+ 추가</Button>
      </div>
    </div>

    <!-- 저장 버튼 -->
    <div class="flex justify-end pt-4">
      <Button :disabled="isSaving" @click="save">
        {{ isSaving ? '저장 중...' : '저장' }}
      </Button>
    </div>
  </div>
</template>
