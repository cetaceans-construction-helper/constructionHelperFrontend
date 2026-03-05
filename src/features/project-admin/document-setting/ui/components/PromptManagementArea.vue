<script setup lang="ts">
import { onMounted } from 'vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { usePromptManagement } from '@/features/project-admin/document-setting/view-model/usePromptManagement'

const {
  materialTypes,
  promptMap,
  selectedMaterialTypeId,
  selectedMaterialType,
  editingPrompt,
  hasExistingPrompt,
  isLoading,
  isSaving,
  load,
  selectMaterialType,
  savePrompt,
  deletePrompt,
} = usePromptManagement()

onMounted(() => {
  load()
})
</script>

<template>
  <div v-if="isLoading" class="text-sm text-muted-foreground text-center py-8">
    데이터 로딩 중...
  </div>

  <div v-else class="flex gap-4 h-full">
    <!-- 좌측 패널: 자재유형 목록 -->
    <div class="w-[280px] shrink-0 border border-border rounded-md overflow-hidden flex flex-col">
      <div class="px-3 py-2 border-b border-border bg-muted/30">
        <span class="text-sm font-semibold">자재유형 목록</span>
      </div>
      <div class="flex-1 overflow-y-auto">
        <button
          v-for="mt in materialTypes"
          :key="mt.id"
          class="w-full text-left px-3 py-2.5 text-sm border-b border-border last:border-b-0 transition-colors hover:bg-muted/50"
          :class="selectedMaterialTypeId === mt.id ? 'bg-accent text-accent-foreground' : ''"
          @click="selectMaterialType(mt.id)"
        >
          <div class="flex items-center justify-between">
            <span>{{ mt.name }}</span>
            <div class="flex items-center gap-2">
              <span v-if="promptMap.has(mt.id)" class="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              <span class="text-xs text-muted-foreground">{{ mt.unit }}</span>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- 우측 패널: 프롬프트 에디터 -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- 자재유형 미선택 -->
      <div
        v-if="selectedMaterialTypeId === null"
        class="flex-1 flex items-center justify-center text-sm text-muted-foreground"
      >
        좌측에서 자재유형을 선택하세요
      </div>

      <!-- 선택된 자재유형 에디터 -->
      <template v-else>
        <div class="flex items-center gap-3 mb-3">
          <span class="text-sm font-semibold">{{ selectedMaterialType?.name }}</span>
          <Badge :variant="hasExistingPrompt ? 'secondary' : 'outline'">
            {{ hasExistingPrompt ? '저장됨' : '새로 작성' }}
          </Badge>
        </div>

        <textarea
          v-model="editingPrompt"
          placeholder="이 자재유형에 사용할 LLM 프롬프트를 입력하세요..."
          class="flex-1 min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
        />

        <div class="flex items-center justify-end gap-2 mt-3">
          <AlertDialog>
            <AlertDialogTrigger as-child>
              <Button
                variant="destructive"
                size="sm"
                :disabled="!hasExistingPrompt || isSaving"
              >
                삭제
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>프롬프트 삭제</AlertDialogTitle>
                <AlertDialogDescription>
                  "{{ selectedMaterialType?.name }}" 자재유형의 프롬프트를 삭제하시겠습니까?
                  이 작업은 되돌릴 수 없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction @click="deletePrompt">삭제</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button :disabled="isSaving" @click="savePrompt">
            {{ isSaving ? '저장 중...' : '저장' }}
          </Button>
        </div>
      </template>
    </div>
  </div>
</template>
