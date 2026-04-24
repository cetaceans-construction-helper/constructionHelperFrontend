<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Separator } from '@/shared/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { X } from 'lucide-vue-next'
import { useProjectStore } from '@/app/context/stores/project'
import { useDocumentSetting } from '@/features/project-admin/document-setting/view-model/useDocumentSetting'

const projectStore = useProjectStore()
const { selectedProjectId } = storeToRefs(projectStore)

const {
  isLoading,
  isSaving,
  cellRef,
  mirTemplateUrl,
  imageCategories,
  load,
  save,
  uploadTemplate,
} = useDocumentSetting()

onMounted(() => {
  if (selectedProjectId.value) load(selectedProjectId.value)
})

watch(selectedProjectId, (pid) => {
  if (pid) load(pid)
})

// 템플릿 업로드
const templateFileInput = ref<HTMLInputElement | null>(null)
function onTemplateFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    if (!selectedProjectId.value) {
      alert('프로젝트를 먼저 선택해주세요.')
      input.value = ''
      return
    }
    uploadTemplate(selectedProjectId.value, file)
    input.value = ''
  }
}

// 오버플로우 관리
function addOverflow() {
  cellRef.lines.overflow.push({ startCell: '', maxRows: '' })
}

function removeOverflow(index: number) {
  cellRef.lines.overflow.splice(index, 1)
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

    <!-- 섹션 2: 셀 매핑 -->
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

        <!-- 오버플로우 -->
        <p class="text-xs text-muted-foreground mt-4 mb-1">오버플로우</p>
        <div class="space-y-2 mb-2">
          <div
            v-for="(ov, ovIdx) in cellRef.lines.overflow"
            :key="ovIdx"
            class="flex items-center gap-2"
          >
            <Input v-model="ov.startCell" placeholder="시작 셀 (예: 1!A5)" class="h-8 text-sm w-32" />
            <div class="flex items-center gap-1.5">
              <Label class="text-xs text-muted-foreground shrink-0">최대 행 수</Label>
              <Input v-model="ov.maxRows" type="number" min="0" placeholder="0" class="h-8 text-sm w-20" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              class="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              @click="removeOverflow(ovIdx)"
            >
              <X class="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" @click="addOverflow">+ 오버플로우 추가</Button>
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
