<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PageContainer from '@/components/helper/PageContainer.vue'
import AreaCard from '@/components/helper/AreaCard.vue'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Download, Trash2 } from 'lucide-vue-next'
import {
  materialInspectionRequestApi,
  type MaterialInspectionRequestResponse,
} from '@/api/projectDocumentCode'
import { materialOrderApi } from '@/api/materialOrder'

const isLoading = ref(false)
const mirList = ref<MaterialInspectionRequestResponse[]>([])
const isDownloading = ref<Record<number, boolean>>({})

// 삭제 다이얼로그
const showDeleteDialog = ref(false)
const deleteTargetId = ref<number | null>(null)
const deleteTargetName = ref('')
const isDeleting = ref(false)

async function loadList() {
  isLoading.value = true
  try {
    mirList.value = await materialInspectionRequestApi.getMaterialInspectionRequestList()
  } catch (error: unknown) {
    console.error('MIR 목록 로드 실패:', error)
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  } finally {
    isLoading.value = false
  }
}

function openDeleteDialog(mir: MaterialInspectionRequestResponse) {
  deleteTargetId.value = mir.id
  deleteTargetName.value = mir.documentNumber
  showDeleteDialog.value = true
}

async function confirmDelete() {
  if (deleteTargetId.value == null) return
  isDeleting.value = true
  try {
    await materialInspectionRequestApi.deleteMaterialInspectionRequest(deleteTargetId.value)
    showDeleteDialog.value = false
    loadList()
  } catch (error: unknown) {
    console.error('MIR 삭제 실패:', error)
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  } finally {
    isDeleting.value = false
  }
}

async function downloadMir(mir: MaterialInspectionRequestResponse) {
  if (!mir.mirUrl) return
  isDownloading.value[mir.id] = true
  try {
    const blobUrl = await materialOrderApi.getDeliveryNoteImage(mir.mirUrl)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `${mir.documentNumber}.xlsx`
    a.click()
    URL.revokeObjectURL(blobUrl)
  } catch (error: unknown) {
    console.error('MIR 다운로드 실패:', error)
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  } finally {
    isDownloading.value[mir.id] = false
  }
}

function formatDate(dateStr: string) {
  return dateStr.split('T')[0]
}

onMounted(() => {
  loadList()
})
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
            <TableHead>납품일</TableHead>
            <TableHead>생성일</TableHead>
            <TableHead class="w-20 text-center">다운로드</TableHead>
            <TableHead class="w-20 text-center">삭제</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="mir in mirList" :key="mir.id">
            <TableCell class="font-medium">{{ mir.documentNumber }}</TableCell>
            <TableCell>{{ mir.deliveryDate }}</TableCell>
            <TableCell>{{ formatDate(mir.createdAt) }}</TableCell>
            <TableCell class="text-center">
              <Button
                v-if="mir.mirUrl"
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

    <!-- 삭제 확인 다이얼로그 -->
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
