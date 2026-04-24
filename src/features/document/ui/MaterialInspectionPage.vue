<script setup lang="ts">
import PageContainer from '@/shared/helper-ui/PageContainer.vue'
import AreaCard from '@/shared/helper-ui/AreaCard.vue'
import { Button } from '@/shared/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import { Download, RefreshCw, Trash2 } from 'lucide-vue-next'
import { useMaterialInspectionPage } from '@/features/document/view-model/useMaterialInspectionPage'

const {
  confirmDelete,
  deleteTargetName,
  downloadMir,
  formatDate,
  handleUpdateDocumentNumber,
  isDeleting,
  isDownloading,
  isLoading,
  mirList,
  openDeleteDialog,
  showDeleteDialog,
} = useMaterialInspectionPage()
</script>

<template>
  <PageContainer title="자재반입검수요청서">
    <AreaCard>
      <div v-if="isLoading" class="text-sm text-muted-foreground text-center py-8">
        목록 로딩 중...
      </div>

      <div v-else-if="mirList.length === 0" class="text-sm text-muted-foreground text-center py-8">
        생성된 검수요청서가 없습니다.
      </div>

      <Table v-else>
        <TableHeader>
          <TableRow>
            <TableHead>문서번호</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>생성일</TableHead>
            <TableHead class="w-20 text-center">문서번호수정</TableHead>
            <TableHead class="w-20 text-center">다운로드</TableHead>
            <TableHead class="w-20 text-center">삭제</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="mir in mirList" :key="mir.id">
            <TableCell class="font-medium">{{ mir.docNo ?? '-' }}</TableCell>
            <TableCell>{{ mir.status }}</TableCell>
            <TableCell>{{ formatDate(mir.createdAt) }}</TableCell>
            <TableCell class="text-center">
              <Button
                variant="ghost"
                size="sm"
                class="h-8 w-8 p-0"
                @click="handleUpdateDocumentNumber(mir)"
              >
                <RefreshCw class="h-4 w-4 text-muted-foreground" />
              </Button>
            </TableCell>
            <TableCell class="text-center">
              <Button
                v-if="mir.status === 'SUCCEEDED'"
                variant="ghost"
                size="sm"
                class="h-8 w-8 p-0"
                :disabled="isDownloading[mir.id]"
                @click="downloadMir(mir)"
              >
                <Download class="h-4 w-4 text-muted-foreground" />
              </Button>
              <span v-else class="text-xs text-muted-foreground">-</span>
            </TableCell>
            <TableCell class="text-center">
              <Button
                variant="ghost"
                size="sm"
                class="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                @click="openDeleteDialog(mir)"
              >
                <Trash2 class="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </AreaCard>

    <AlertDialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>삭제 확인</AlertDialogTitle>
          <AlertDialogDescription>
            '{{ deleteTargetName }}' 검수요청서를 삭제하시겠습니까?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="isDeleting">취소</AlertDialogCancel>
          <AlertDialogAction :disabled="isDeleting" @click="confirmDelete">
            {{ isDeleting ? '삭제 중...' : '삭제' }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </PageContainer>
</template>
