<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import PageContainer from '@/shared/helper-ui/PageContainer.vue'
import AreaCard from '@/shared/helper-ui/AreaCard.vue'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { useProjectStore } from '@/app/context/stores/project'
import { useDocumentNumber } from '@/features/project-admin/document-number/view-model/useDocumentNumber'
import type {
  DocConfigDocType,
  UploadDocType,
} from '@/shared/network-core/apis/docConfig'

const projectStore = useProjectStore()
const { selectedProjectId } = storeToRefs(projectStore)

const {
  isLoading,
  isSaving,
  isSavingCellRef,
  isGeneratingCellRef,
  prompts,
  cellRefs,
  mirTemplateUrl,
  load,
  save,
  saveCellRef,
  generateCellRef,
  uploadMirTemplate,
} = useDocumentNumber()

const tabs = [
  { value: 'MIR', label: 'MIR (자재검수요청서)' },
  { value: 'CAT', label: 'CAT' },
  { value: 'CCST', label: 'CCST' },
  { value: 'DR', label: 'DR (작업일보)' },
]

const docTypeLabels: Record<DocConfigDocType, string> = {
  MIR: 'MIR',
  CAT: 'CAT',
  CCST: 'CCST',
}

const placeholder = `문서번호는 다음 규칙을 따른다.
- 형식: MIR-{yyyyMMdd}-{division}-{seq2}
- division 은 한글 2글자 자재대분류 (철근/레미콘/거푸집 등)
- seq2 는 해당 날짜+division 조합으로 01 부터 순증가, 두 자리 zero-pad
- 예: "MIR-20260423-철근-01"`

const cellRefPlaceholder = `{
  "fixed": { ... },
  "lines": { ... },
  "lineConcat": { ... },
  "photos": {
    "0": {
      "types": ["DELIVERY_NOTE", "MILL_SHEET"],
      "rotatable": true,
      "cells": ["0!B3", "0!B15"],
      "descriptionOffset": { "row": 3, "col": 0 },
      "overflow": "INSERT_ROWS"
    }
  }
}`

const isUploadingTemplate = ref(false)
const mirTemplateFileInput = ref<HTMLInputElement | null>(null)

onMounted(() => {
  if (selectedProjectId.value) load(selectedProjectId.value)
})

watch(selectedProjectId, (pid) => {
  if (pid) load(pid)
})

function onSave(docType: DocConfigDocType) {
  if (!selectedProjectId.value) {
    alert('프로젝트를 먼저 선택해주세요.')
    return
  }
  save(selectedProjectId.value, docType)
}

function onGenerateCellRef(docType: UploadDocType) {
  if (!selectedProjectId.value) {
    alert('프로젝트를 먼저 선택해주세요.')
    return
  }
  generateCellRef(selectedProjectId.value, docType)
}

function onSaveCellRef(docType: UploadDocType) {
  if (!selectedProjectId.value) {
    alert('프로젝트를 먼저 선택해주세요.')
    return
  }
  saveCellRef(selectedProjectId.value, docType)
}

async function onMirTemplateFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!selectedProjectId.value) {
    alert('프로젝트를 먼저 선택해주세요.')
    input.value = ''
    return
  }
  isUploadingTemplate.value = true
  try {
    await uploadMirTemplate(selectedProjectId.value, file)
  } finally {
    isUploadingTemplate.value = false
    input.value = ''
  }
}
</script>

<template>
  <PageContainer title="문서 설정">
    <AreaCard
      height="flex-1"
      min-height="600px"
      :has-tabs="true"
      :tabs="tabs"
      default-tab="MIR"
    >
      <template v-for="docType in (['MIR', 'CAT', 'CCST'] as const)" #[`tab-${docType}`] :key="docType">
        <div v-if="isLoading" class="text-sm text-muted-foreground text-center py-8">
          설정 로딩 중...
        </div>
        <div v-else class="flex flex-col gap-6">
          <div v-if="docType === 'MIR'" class="flex flex-col gap-2 rounded-md border border-border p-3">
            <Label class="text-sm font-semibold">엑셀 템플릿</Label>
            <div class="flex items-center gap-3">
              <span class="text-sm text-muted-foreground">
                {{ mirTemplateUrl ? '템플릿 등록됨' : '템플릿 없음' }}
              </span>
              <input
                ref="mirTemplateFileInput"
                type="file"
                accept=".xlsx,.xls"
                class="hidden"
                @change="onMirTemplateFileChange"
              />
              <Button
                variant="outline"
                size="sm"
                :disabled="isUploadingTemplate"
                @click="mirTemplateFileInput?.click()"
              >
                {{ isUploadingTemplate ? '업로드 중...' : (mirTemplateUrl ? '템플릿 변경' : '템플릿 등록') }}
              </Button>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <Label>{{ docTypeLabels[docType] }} 문서번호 생성 규칙</Label>
            <div class="text-xs text-muted-foreground space-y-1">
              <p>· LLM 이 이 텍스트를 그대로 읽고 문서번호를 생성합니다.</p>
              <p>· 포맷 예시, 치환 변수(<code>{yyyyMMdd}</code>, <code>{division}</code> 등), 금지 조건을 구체적으로 기재하세요.</p>
            </div>
            <textarea
              v-model="prompts[docType]"
              :placeholder="placeholder"
              :disabled="isSaving[docType]"
              rows="10"
              class="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
            />
            <div class="flex justify-end">
              <Button :disabled="isSaving[docType]" @click="onSave(docType)">
                {{ isSaving[docType] ? '저장 중...' : '문서번호 규칙 저장' }}
              </Button>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <Label>{{ docTypeLabels[docType] }} 엑셀 셀 좌표 (JSON)</Label>
            <div class="text-xs text-muted-foreground space-y-1">
              <p>· 템플릿 시트의 셀 주소 매핑 JSON. photos 섹션은 sheet index 기준으로 types / cells / overflow 지정.</p>
              <p>· <strong>자동 생성</strong>은 LLM이 템플릿을 분석해 재생성 후 즉시 DB에 저장합니다.</p>
              <p>· 수동 편집 후에는 <strong>셀 좌표 저장</strong>으로 반영. 스키마 위반 시 서버가 400을 반환합니다.</p>
            </div>
            <textarea
              v-model="cellRefs[docType]"
              :placeholder="cellRefPlaceholder"
              :disabled="isSavingCellRef[docType] || isGeneratingCellRef[docType]"
              rows="18"
              class="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
            />
            <div class="flex justify-end gap-2">
              <Button
                variant="outline"
                :disabled="isGeneratingCellRef[docType] || isSavingCellRef[docType]"
                @click="onGenerateCellRef(docType)"
              >
                {{ isGeneratingCellRef[docType] ? '생성 중...' : '자동 생성' }}
              </Button>
              <Button
                :disabled="isSavingCellRef[docType] || isGeneratingCellRef[docType]"
                @click="onSaveCellRef(docType)"
              >
                {{ isSavingCellRef[docType] ? '저장 중...' : '셀 좌표 저장' }}
              </Button>
            </div>
          </div>
        </div>
      </template>

      <template #tab-DR>
        <div v-if="isLoading" class="text-sm text-muted-foreground text-center py-8">
          설정 로딩 중...
        </div>
        <div v-else class="flex flex-col gap-6 py-2">
          <div>
            <Label>DR (작업일보) 문서번호</Label>
            <p class="text-sm text-muted-foreground mt-1">
              DR 문서번호는 <code>yyyyMMdd</code> 고정 포맷으로 서버가 자동 생성합니다. 편집할 수 없습니다.
            </p>
          </div>

          <div class="flex flex-col gap-2">
            <Label>DR 엑셀 셀 좌표 (JSON)</Label>
            <div class="text-xs text-muted-foreground space-y-1">
              <p>· 작업일보 템플릿의 셀 매핑 JSON.</p>
              <p>· <strong>자동 생성</strong>은 LLM이 템플릿을 분석해 재생성 후 즉시 DB에 저장합니다.</p>
              <p>· 수동 편집 후에는 <strong>셀 좌표 저장</strong>으로 반영. 스키마 위반 시 서버가 400을 반환합니다.</p>
            </div>
            <textarea
              v-model="cellRefs.DR"
              :placeholder="cellRefPlaceholder"
              :disabled="isSavingCellRef.DR || isGeneratingCellRef.DR"
              rows="18"
              class="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
            />
            <div class="flex justify-end gap-2">
              <Button
                variant="outline"
                :disabled="isGeneratingCellRef.DR || isSavingCellRef.DR"
                @click="onGenerateCellRef('DR')"
              >
                {{ isGeneratingCellRef.DR ? '생성 중...' : '자동 생성' }}
              </Button>
              <Button
                :disabled="isSavingCellRef.DR || isGeneratingCellRef.DR"
                @click="onSaveCellRef('DR')"
              >
                {{ isSavingCellRef.DR ? '저장 중...' : '셀 좌표 저장' }}
              </Button>
            </div>
          </div>
        </div>
      </template>
    </AreaCard>
  </PageContainer>
</template>
