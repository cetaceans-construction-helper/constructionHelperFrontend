<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Separator } from '@/shared/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { X } from 'lucide-vue-next'
import { useDailyReportSetting } from '@/features/project-admin/daily-report-setting/view-model/useDailyReportSetting'

const {
  isLoading,
  isSaving,
  cellRef,
  dailyReportTemplateUrl,
  sectionColumnKeys,
  sectionColumnLabels,
  load,
  save,
  uploadTemplate,
  addOverflow,
  removeOverflow,
} = useDailyReportSetting()

onMounted(() => {
  load()
})

const templateFileInput = ref<HTMLInputElement | null>(null)
function onTemplateFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    uploadTemplate(file)
    input.value = ''
  }
}

const sectionLabels: Record<string, string> = {
  todayWork: '금일작업',
  tomorrowWork: '익일작업',
  attendance: '출역인원',
  material: '자재입고',
  equipment: '장비투입',
}

const sectionKeys = ['todayWork', 'tomorrowWork', 'attendance', 'material', 'equipment'] as const
</script>

<template>
  <div v-if="isLoading" class="text-sm text-muted-foreground text-center py-8">
    설정 로딩 중...
  </div>

  <div v-else class="space-y-8">
    <!-- 엑셀 템플릿 -->
    <div>
      <h3 class="text-sm font-semibold mb-3">엑셀 템플릿</h3>
      <div class="flex items-center gap-3">
        <span class="text-sm text-muted-foreground">
          {{ dailyReportTemplateUrl ? '템플릿 등록됨' : '템플릿 없음' }}
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
          {{ dailyReportTemplateUrl ? '템플릿 변경' : '템플릿 업로드' }}
        </Button>
      </div>
    </div>

    <Separator />

    <!-- 익일작업 모드 -->
    <div>
      <h3 class="text-sm font-semibold mb-3">익일작업 모드</h3>
      <div class="flex items-center gap-3">
        <Label class="text-xs text-muted-foreground shrink-0">모드</Label>
        <Select
          :model-value="String(cellRef.tomorrowWorkMode)"
          @update:model-value="cellRef.tomorrowWorkMode = Number($event)"
        >
          <SelectTrigger class="h-8 text-sm w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">다음작업일</SelectItem>
            <SelectItem value="2">내일</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <Separator />

    <!-- 셀 매핑 -->
    <div>
      <h3 class="text-sm font-semibold mb-3">셀 매핑</h3>

      <!-- 고정자 -->
      <p class="text-xs text-muted-foreground font-medium mb-2">고정자</p>
      <div class="grid grid-cols-2 gap-3 mb-6">
        <div class="flex items-center gap-2">
          <Label class="text-xs text-muted-foreground w-24 shrink-0">날짜</Label>
          <Input v-model="cellRef.fixed.date" placeholder="예: 0!B2" class="h-8 text-sm" />
        </div>
        <div class="flex items-center gap-2">
          <Label class="text-xs text-muted-foreground w-24 shrink-0">요일</Label>
          <Input v-model="cellRef.fixed.dayOfWeek" placeholder="예: 0!D2" class="h-8 text-sm" />
        </div>
        <div class="flex items-center gap-2">
          <Label class="text-xs text-muted-foreground w-24 shrink-0">날씨</Label>
          <Input v-model="cellRef.fixed.weather" placeholder="예: 0!F2" class="h-8 text-sm" />
        </div>
        <div class="flex items-center gap-2">
          <Label class="text-xs text-muted-foreground w-24 shrink-0">최저기온</Label>
          <Input v-model="cellRef.fixed.minTemperature" placeholder="예: 0!H2" class="h-8 text-sm" />
        </div>
        <div class="flex items-center gap-2">
          <Label class="text-xs text-muted-foreground w-24 shrink-0">최고기온</Label>
          <Input v-model="cellRef.fixed.maxTemperature" placeholder="예: 0!J2" class="h-8 text-sm" />
        </div>
        <div v-if="cellRef.tomorrowWorkMode === 1" class="flex items-center gap-2">
          <Label class="text-xs text-muted-foreground w-24 shrink-0">익일날짜</Label>
          <Input v-model="cellRef.fixed.tomorrowDate" placeholder="예: 0!L2" class="h-8 text-sm" />
        </div>
      </div>

      <Separator class="my-4" />

      <!-- 변동자 섹션들 -->
      <template v-for="sectionKey in sectionKeys" :key="sectionKey">
        <p class="text-xs text-muted-foreground font-medium mb-2">{{ sectionLabels[sectionKey] }}</p>
        <div class="space-y-3 mb-6">
          <div class="flex items-center gap-3">
            <Label class="text-xs text-muted-foreground w-24 shrink-0">시작 셀</Label>
            <Input v-model="cellRef[sectionKey].startCell" placeholder="예: 0!A5" class="h-8 text-sm w-32" />
            <div class="flex items-center gap-1.5">
              <Label class="text-xs text-muted-foreground shrink-0">최대 행 수</Label>
              <Input
                v-model="cellRef[sectionKey].maxRows"
                type="number"
                min="0"
                placeholder="0"
                class="h-8 text-sm w-20"
              />
            </div>
          </div>

          <!-- 컬럼 오프셋 -->
          <p class="text-xs text-muted-foreground mt-2 mb-1">컬럼 오프셋 (비워두면 미사용)</p>
          <div class="grid grid-cols-3 gap-3">
            <div
              v-for="colKey in (sectionColumnKeys[sectionKey] ?? [])"
              :key="colKey"
              class="flex flex-col gap-1"
            >
              <Label class="text-xs text-muted-foreground">{{ (sectionColumnLabels[sectionKey] ?? {})[colKey] }} ({{ colKey }})</Label>
              <Input
                v-model="cellRef[sectionKey].columns[colKey]"
                placeholder="미사용"
                type="number"
                class="h-8 text-sm"
              />
            </div>
          </div>

          <!-- 오버플로우 -->
          <p class="text-xs text-muted-foreground mt-2 mb-1">오버플로우</p>
          <div class="space-y-2 mb-2">
            <div
              v-for="(ov, ovIdx) in cellRef[sectionKey].overflow"
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
                @click="removeOverflow(sectionKey, ovIdx)"
              >
                <X class="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" @click="addOverflow(sectionKey)">+ 오버플로우 추가</Button>
          </div>
        </div>

        <Separator class="my-4" />
      </template>

      <!-- 사진 -->
      <p class="text-xs text-muted-foreground font-medium mb-2">작업사진</p>
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <Label class="text-xs text-muted-foreground w-24 shrink-0">셀 목록</Label>
          <Input v-model="cellRef.photos.work.cells" placeholder="예: 1!A10, 1!A15, 1!A20" class="h-8 text-sm flex-1" />
        </div>
        <div class="flex items-center gap-2">
          <Label class="text-xs text-muted-foreground w-24 shrink-0">설명 오프셋</Label>
          <div class="flex items-center gap-1">
            <Label class="text-xs text-muted-foreground shrink-0">Row</Label>
            <Input v-model="cellRef.photos.work.descriptionOffsetRow" placeholder="0" type="number" class="h-8 text-sm w-16" />
          </div>
          <div class="flex items-center gap-1">
            <Label class="text-xs text-muted-foreground shrink-0">Col</Label>
            <Input v-model="cellRef.photos.work.descriptionOffsetCol" placeholder="0" type="number" class="h-8 text-sm w-16" />
          </div>
        </div>
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
