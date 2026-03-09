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
import { Download, Trash2 } from 'lucide-vue-next'
import { useDailyReportPage } from '@/features/document/view-model/useDailyReportPage'

const {
  confirmDelete,
  dailyReportList,
  deleteTargetName,
  downloadReport,
  formatDate,
  isDeleting,
  isDownloading,
  isLoading,
  openDeleteDialog,
  showDeleteDialog,
} = useDailyReportPage()
</script>

<template>
  <PageContainer title="일일작업일보">
    <AreaCard>
      <div v-if="isLoading" class="text-sm text-muted-foreground text-center py-8">
        목록 로딩 중...
      </div>

      <div v-else-if="dailyReportList.length === 0" class="text-sm text-muted-foreground text-center py-8">
        생성된 작업일보가 없습니다.
      </div>

      <Table v-else>
        <TableHeader>
          <TableRow>
            <TableHead>날짜</TableHead>
            <TableHead>생성일</TableHead>
            <TableHead class="w-20 text-center">다운로드</TableHead>
            <TableHead class="w-20 text-center">삭제</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="report in dailyReportList" :key="report.id">
            <TableCell class="font-medium">{{ report.date }}</TableCell>
            <TableCell>{{ formatDate(report.createdAt) }}</TableCell>
            <TableCell class="text-center">
              <Button
                v-if="report.dailyReportUrl"
                variant="ghost"
                size="sm"
                class="h-8 w-8 p-0"
                :disabled="isDownloading[report.id]"
                @click="downloadReport(report)"
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
                @click="openDeleteDialog(report)"
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
            '{{ deleteTargetName }}' 작업일보를 삭제하시겠습니까?
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
