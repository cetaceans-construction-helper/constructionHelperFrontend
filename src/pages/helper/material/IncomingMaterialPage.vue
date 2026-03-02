<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import PageContainer from '@/components/helper/PageContainer.vue'
import AreaCard from '@/components/helper/AreaCard.vue'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { X } from 'lucide-vue-next'
import { useMaterialOrder } from './composables/useMaterialOrder'
import { materialOrderApi } from '@/api/materialOrder'
import type {
  MaterialDeliverySummary,
  DeliveryLineResponse,
} from '@/api/materialOrder'
import { materialInspectionRequestApi } from '@/api/projectDocumentCode'
import type { MaterialInspectionRequestResponse } from '@/api/projectDocumentCode'
import { referenceApi } from '@/api/reference'
import type {
  MaterialSpecResponse,
  MaterialTypeResponse,
  IdNameResponse,
  WorkTypeResponse,
} from '@/api/reference'

const { orders, loadOrders } = useMaterialOrder()

// 발주서 없이 송장입력 다이얼로그 상태
const directDeliveryDialogOpen = ref(false)
const directSelectedMaterialTypeId = ref<string>('')
const directSelectedDivisionId = ref<string>('')
const directSelectedWorkTypeId = ref<string>('')
const directMaterialTypes = ref<MaterialTypeResponse[]>([])
const directDivisions = ref<IdNameResponse[]>([])
const directWorkTypes = ref<WorkTypeResponse[]>([])
const isLoadingDirectWorkTypes = ref(false)
const isSavingDirect = ref(false)
const directDeliveryNotes = ref<File[]>([])
const directDeliveryPhotos = ref<File[]>([])
// 발주서 없이 송장입력 - 위치 선택
const directZones = ref<IdNameResponse[]>([])
const directFloors = ref<IdNameResponse[]>([])
const directSections = ref<IdNameResponse[]>([])
const directUsages = ref<IdNameResponse[]>([])
const directSelectedZoneIds = ref<number[]>([])
const directSelectedFloorIds = ref<number[]>([])
const directSelectedSectionIds = ref<number[]>([])
const directSelectedUsageIds = ref<number[]>([])

// 삭제 다이얼로그 상태
const showDeleteDialog = ref(false)
const deleteTargetId = ref<number | null>(null)
const deleteTargetName = ref('')
const isDeletingDelivery = ref(false)

// 반입자재 상태
const deliveries = ref<MaterialDeliverySummary[]>([])
const isLoadingDeliveries = ref(false)

// 반입자재 펼치기/접기 + 인라인 수정 상태
const expandedDeliveries = reactive<Record<number, boolean>>({})
const deliveryLinesMap = ref<Record<number, DeliveryLineResponse[]>>({})
const deliveryEditState = ref<Record<number, {
  supplier: string
  deliveryDate: string
  location: string
  noteDescriptions: { noteId: number; description: string }[]
  photoDescriptions: { photoId: number; description: string }[]
}>>({})
const isLoadingLines = ref<Record<number, boolean>>({})
const isUpdatingDelivery = ref<Record<number, boolean>>({})
const materialSpecs = ref<MaterialSpecResponse[]>([])

// 인라인 이미지 뷰어 (per-delivery)
const deliveryImageUrls = ref<Record<number, string[]>>({})
const deliveryImageIndex = ref<Record<number, number>>({})
const isLoadingDeliveryImages = ref<Record<number, boolean>>({})
const deliveryImageScale = ref<Record<number, number>>({})
const deliveryImageTranslate = reactive<Record<number, { x: number; y: number }>>({})
const deliveryImageDragging = ref<Record<number, boolean>>({})
const deliveryDragStart = reactive<Record<number, { x: number; y: number }>>({})
const deliveryTranslateStart = reactive<Record<number, { x: number; y: number }>>({})

// 자재반입검수요청서 상태
const mirList = ref<MaterialInspectionRequestResponse[]>([])
const mirDeliveryIds = computed(() => new Set(mirList.value.map((m) => m.materialDeliveryId)))
const isGeneratingMir = ref<Record<number, boolean>>({})

// MIR 삭제 다이얼로그
const showMirDeleteDialog = ref(false)
const mirDeleteTargetId = ref<number | null>(null)
const mirDeleteTargetName = ref('')
const isDeletingMir = ref(false)

function toggleId(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((v) => v !== id) : [...list, id]
}

async function openDirectDeliveryDialog() {
  directDeliveryNotes.value = []
  directDeliveryPhotos.value = []
  directSelectedMaterialTypeId.value = ''
  directSelectedDivisionId.value = ''
  directSelectedWorkTypeId.value = ''
  directWorkTypes.value = []
  directSelectedZoneIds.value = []
  directSelectedFloorIds.value = []
  directSelectedSectionIds.value = []
  directSelectedUsageIds.value = []

  try {
    const [mtList, divList, zoneList, floorList, sectionList, usageList] = await Promise.all([
      referenceApi.getMaterialTypeList(),
      referenceApi.getDivisionList(),
      referenceApi.getZoneList(),
      referenceApi.getFloorList(),
      referenceApi.getSectionList(),
      referenceApi.getUsageList(),
    ])
    directMaterialTypes.value = mtList
    directDivisions.value = divList
    directZones.value = zoneList
    directFloors.value = floorList
    directSections.value = sectionList
    directUsages.value = usageList
  } catch (error: unknown) {
    console.error('기초 데이터 로드 실패:', error)
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
    return
  }

  directDeliveryDialogOpen.value = true
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleDirectDivisionChange(divisionId: any) {
  directSelectedDivisionId.value = String(divisionId ?? '')
  directSelectedWorkTypeId.value = ''
  directWorkTypes.value = []
  if (!directSelectedDivisionId.value) return

  isLoadingDirectWorkTypes.value = true
  try {
    directWorkTypes.value = await referenceApi.getWorkTypeList(Number(directSelectedDivisionId.value))
  } catch (error: unknown) {
    console.error('공종 목록 로드 실패:', error)
  } finally {
    isLoadingDirectWorkTypes.value = false
  }
}

function onDirectDeliveryNotesChange(event: Event) {
  const input = event.target as HTMLInputElement
  directDeliveryNotes.value = input.files ? Array.from(input.files) : []
}

function onDirectDeliveryPhotosChange(event: Event) {
  const input = event.target as HTMLInputElement
  directDeliveryPhotos.value = input.files ? Array.from(input.files) : []
}

async function saveDirectDelivery() {
  if (!directSelectedMaterialTypeId.value) {
    alert('자재유형을 선택해주세요.')
    return
  }
  isSavingDirect.value = true
  try {
    await materialOrderApi.createMaterialDelivery({
      materialTypeId: Number(directSelectedMaterialTypeId.value),
      workTypeId: directSelectedWorkTypeId.value ? Number(directSelectedWorkTypeId.value) : undefined,
      deliveryNotes: directDeliveryNotes.value,
      deliveryPhotos: directDeliveryPhotos.value,
      zoneIds: directSelectedZoneIds.value,
      floorIds: directSelectedFloorIds.value,
      sectionIds: directSelectedSectionIds.value,
      usageIds: directSelectedUsageIds.value,
    })
    directDeliveryDialogOpen.value = false
    loadDeliveries()
  } catch (error: unknown) {
    console.error('송장입력 실패:', error)
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  } finally {
    isSavingDirect.value = false
  }
}

function openDeleteDialog(deliveryId: number, deliveryName: string) {
  deleteTargetId.value = deliveryId
  deleteTargetName.value = deliveryName
  showDeleteDialog.value = true
}

async function confirmDeleteDelivery() {
  if (deleteTargetId.value == null) return
  isDeletingDelivery.value = true
  try {
    await materialOrderApi.deleteMaterialDelivery(deleteTargetId.value)
    showDeleteDialog.value = false
    const deletedId = deleteTargetId.value
    deliveries.value = deliveries.value.filter((d) => d.materialDeliveryId !== deletedId)
    // 관련 상태 정리
    delete expandedDeliveries[deletedId]
    deliveryImageUrls.value[deletedId]?.forEach((url) => URL.revokeObjectURL(url))
    delete deliveryLinesMap.value[deletedId]
    delete deliveryEditState.value[deletedId]
    delete deliveryImageUrls.value[deletedId]
    delete deliveryImageIndex.value[deletedId]
    delete isLoadingLines.value[deletedId]
    delete isUpdatingDelivery.value[deletedId]
    delete isLoadingDeliveryImages.value[deletedId]
    delete deliveryImageScale.value[deletedId]
    delete deliveryImageTranslate[deletedId]
    delete deliveryImageDragging.value[deletedId]
    delete deliveryDragStart[deletedId]
    delete deliveryTranslateStart[deletedId]
    delete isGeneratingMir.value[deletedId]
  } catch (error: unknown) {
    console.error('반입자재 삭제 실패:', error)
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  } finally {
    isDeletingDelivery.value = false
  }
}

function getMirForDelivery(deliveryId: number) {
  return mirList.value.find((m) => m.materialDeliveryId === deliveryId)
}

function openMirDeleteDialog(mirId: number, deliveryName: string) {
  mirDeleteTargetId.value = mirId
  mirDeleteTargetName.value = deliveryName
  showMirDeleteDialog.value = true
}

async function confirmDeleteMir() {
  if (mirDeleteTargetId.value == null) return
  isDeletingMir.value = true
  try {
    await materialInspectionRequestApi.deleteMaterialInspectionRequest(mirDeleteTargetId.value)
    showMirDeleteDialog.value = false
    mirList.value = mirList.value.filter((m) => m.id !== mirDeleteTargetId.value)
  } catch (error: unknown) {
    console.error('검수요청서 삭제 실패:', error)
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  } finally {
    isDeletingMir.value = false
  }
}

async function generateMir(deliveryId: number) {
  isGeneratingMir.value[deliveryId] = true
  try {
    await materialInspectionRequestApi.createMaterialInspectionRequest(deliveryId)
    mirList.value = await materialInspectionRequestApi.getMaterialInspectionRequestList()
  } catch (error: unknown) {
    console.error('자재반입검수요청서 생성 실패:', error)
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  } finally {
    isGeneratingMir.value[deliveryId] = false
  }
}

async function toggleDelivery(delivery: MaterialDeliverySummary) {
  const id = delivery.materialDeliveryId
  if (expandedDeliveries[id]) {
    // 접기: 상태 정리 + 이미지 URL revoke
    expandedDeliveries[id] = false
    deliveryImageUrls.value[id]?.forEach((url) => URL.revokeObjectURL(url))
    delete deliveryLinesMap.value[id]
    delete deliveryEditState.value[id]
    delete deliveryImageUrls.value[id]
    delete deliveryImageIndex.value[id]
    delete deliveryImageScale.value[id]
    delete deliveryImageTranslate[id]
    delete deliveryImageDragging.value[id]
    delete deliveryDragStart[id]
    delete deliveryTranslateStart[id]
    return
  }

  // 다른 반입자재 모두 접기 (아코디언)
  for (const key of Object.keys(expandedDeliveries)) {
    const otherId = Number(key)
    if (expandedDeliveries[otherId]) {
      expandedDeliveries[otherId] = false
      deliveryImageUrls.value[otherId]?.forEach((url) => URL.revokeObjectURL(url))
      delete deliveryLinesMap.value[otherId]
      delete deliveryEditState.value[otherId]
      delete deliveryImageUrls.value[otherId]
      delete deliveryImageIndex.value[otherId]
      delete deliveryImageScale.value[otherId]
      delete deliveryImageTranslate[otherId]
      delete deliveryImageDragging.value[otherId]
      delete deliveryDragStart[otherId]
      delete deliveryTranslateStart[otherId]
    }
  }

  // 펼치기
  expandedDeliveries[id] = true
  isLoadingLines.value[id] = true

  try {
    // 라인 목록 + editState 초기화
    const lines = await materialOrderApi.getMaterialDeliveryLineList(id)
    deliveryLinesMap.value[id] = lines
    deliveryEditState.value[id] = {
      supplier: delivery.supplier,
      deliveryDate: delivery.deliveryDate,
      location: delivery.location ?? '',
      noteDescriptions: delivery.noteFiles.map((f) => ({ noteId: f.noteId!, description: f.description })),
      photoDescriptions: delivery.photoFiles.map((f) => ({ photoId: f.photoId!, description: f.description })),
    }
    deliveryImageIndex.value[id] = 0
    deliveryImageScale.value[id] = 1
    deliveryImageTranslate[id] = { x: 0, y: 0 }
    deliveryImageDragging.value[id] = false
    deliveryDragStart[id] = { x: 0, y: 0 }
    deliveryTranslateStart[id] = { x: 0, y: 0 }

    // materialSpecs 로드 (한번만)
    if (materialSpecs.value.length === 0) {
      const order = orders.value.find((o) => o.id === delivery.materialOrderId)
      if (order?.materialTypeId) {
        try {
          materialSpecs.value = await referenceApi.getMaterialSpecList(order.materialTypeId)
        } catch {
          materialSpecs.value = []
        }
      }
    }

    // noteFiles + photoFiles 기반 이미지 로드
    const allFileUrls = [
      ...delivery.noteFiles.map((f) => f.url),
      ...delivery.photoFiles.map((f) => f.url),
    ]
    if (allFileUrls.length > 0) {
      isLoadingDeliveryImages.value[id] = true
      try {
        const blobUrls = await Promise.all(
          allFileUrls.map((url) => materialOrderApi.getDeliveryNoteImage(url)),
        )
        deliveryImageUrls.value[id] = blobUrls
      } catch (error) {
        console.error('송장 이미지 로드 실패:', error)
        deliveryImageUrls.value[id] = []
      } finally {
        isLoadingDeliveryImages.value[id] = false
      }
    }
  } catch (error: unknown) {
    console.error('반입자재 라인 로드 실패:', error)
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
    expandedDeliveries[id] = false
  } finally {
    isLoadingLines.value[id] = false
  }
}

function resetDeliveryImageTransform(deliveryId: number) {
  deliveryImageScale.value[deliveryId] = 1
  if (deliveryImageTranslate[deliveryId]) {
    deliveryImageTranslate[deliveryId].x = 0
    deliveryImageTranslate[deliveryId].y = 0
  }
}

function onDeliveryImageWheel(deliveryId: number, e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const current = deliveryImageScale.value[deliveryId] ?? 1
  deliveryImageScale.value[deliveryId] = Math.min(5, Math.max(0.5, current + delta))
}

function onDeliveryImagePointerDown(deliveryId: number, e: PointerEvent) {
  const scale = deliveryImageScale.value[deliveryId] ?? 1
  if (scale <= 1) return
  deliveryImageDragging.value[deliveryId] = true
  deliveryDragStart[deliveryId] = { x: e.clientX, y: e.clientY }
  const translate = deliveryImageTranslate[deliveryId] ?? { x: 0, y: 0 }
  deliveryTranslateStart[deliveryId] = { x: translate.x, y: translate.y }
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}

function onDeliveryImagePointerMove(deliveryId: number, e: PointerEvent) {
  if (!deliveryImageDragging.value[deliveryId]) return
  const start = deliveryDragStart[deliveryId]
  const tStart = deliveryTranslateStart[deliveryId]
  if (start && tStart && deliveryImageTranslate[deliveryId]) {
    deliveryImageTranslate[deliveryId].x = tStart.x + (e.clientX - start.x)
    deliveryImageTranslate[deliveryId].y = tStart.y + (e.clientY - start.y)
  }
}

function onDeliveryImagePointerUp(deliveryId: number) {
  deliveryImageDragging.value[deliveryId] = false
}

function prevDeliveryImage(deliveryId: number) {
  const urls = deliveryImageUrls.value[deliveryId] ?? []
  if (urls.length === 0) return
  const idx = deliveryImageIndex.value[deliveryId] ?? 0
  deliveryImageIndex.value[deliveryId] = idx > 0 ? idx - 1 : urls.length - 1
  resetDeliveryImageTransform(deliveryId)
}

function nextDeliveryImage(deliveryId: number) {
  const urls = deliveryImageUrls.value[deliveryId] ?? []
  if (urls.length === 0) return
  const idx = deliveryImageIndex.value[deliveryId] ?? 0
  deliveryImageIndex.value[deliveryId] = idx < urls.length - 1 ? idx + 1 : 0
  resetDeliveryImageTransform(deliveryId)
}

async function updateDelivery(delivery: MaterialDeliverySummary) {
  const id = delivery.materialDeliveryId
  const editState = deliveryEditState.value[id]
  const lines = deliveryLinesMap.value[id]
  if (!editState || !lines) return

  isUpdatingDelivery.value[id] = true
  try {
    await materialOrderApi.updateMaterialDelivery(id, {
      supplier: editState.supplier,
      deliveryDate: editState.deliveryDate,
      location: editState.location || null,
      deliveryLines: lines.map((line) => ({
        deliveryLineId: line.deliveryLineId,
        manufacturer: line.manufacturer,
        specId: line.materialSpecId,
        quantity: String(line.quantity),
      })),
      noteDescriptions: editState.noteDescriptions,
      photoDescriptions: editState.photoDescriptions,
    })
    // 성공 시 접기 + 목록 새로고침
    expandedDeliveries[id] = false
    deliveryImageUrls.value[id]?.forEach((url) => URL.revokeObjectURL(url))
    delete deliveryLinesMap.value[id]
    delete deliveryEditState.value[id]
    delete deliveryImageUrls.value[id]
    delete deliveryImageIndex.value[id]
    delete deliveryImageScale.value[id]
    delete deliveryImageTranslate[id]
    loadDeliveries()
  } catch (error: unknown) {
    console.error('반입자재 수정 실패:', error)
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  } finally {
    isUpdatingDelivery.value[id] = false
  }
}

async function loadDeliveries() {
  isLoadingDeliveries.value = true
  try {
    deliveries.value = await materialOrderApi.getMaterialDeliveryList()
  } catch (error: unknown) {
    console.error('반입자재 목록 로딩 실패:', error)
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  } finally {
    isLoadingDeliveries.value = false
  }
}

onMounted(() => {
  loadOrders()
  loadDeliveries()
  materialInspectionRequestApi
    .getMaterialInspectionRequestList()
    .then((list) => (mirList.value = list))
    .catch(() => {})
})

onUnmounted(() => {
  // 열린 delivery 이미지 URL 정리
  Object.values(deliveryImageUrls.value).forEach((urls) => {
    urls.forEach((url) => URL.revokeObjectURL(url))
  })
})
</script>

<template>
  <PageContainer title="반입자재">
    <AreaCard height="flex-1" min-height="1100px">
      <!-- 상단 버튼 -->
      <div class="flex justify-end mb-4">
        <Button variant="outline" size="sm" @click="openDirectDeliveryDialog">
          발주서 없이 송장입력
        </Button>
      </div>

      <!-- 로딩 -->
      <div v-if="isLoadingDeliveries" class="text-sm text-muted-foreground text-center py-8">
        반입자재 목록 로딩 중...
      </div>

      <!-- 빈 상태 -->
      <div
        v-else-if="deliveries.length === 0"
        class="flex items-center justify-center py-16 border border-dashed border-border rounded-lg"
      >
        <p class="text-muted-foreground">반입된 자재가 없습니다.</p>
      </div>

      <!-- 반입자재 카드 목록 -->
      <div v-else class="space-y-4">
        <div
          v-for="delivery in deliveries"
          :key="delivery.materialDeliveryId"
          class="border border-border rounded-lg overflow-hidden"
        >
          <!-- 카드 헤더 (클릭으로 펼치기/접기) -->
          <div
            class="flex items-center gap-3 px-4 py-3 bg-muted/30 cursor-pointer select-none"
            @click="toggleDelivery(delivery)"
          >
            <span class="text-xs text-muted-foreground">{{ expandedDeliveries[delivery.materialDeliveryId] ? '▲' : '▼' }}</span>
            <span class="text-sm font-medium">{{ delivery.materialOrderNumber }}</span>
            <span class="text-sm text-muted-foreground">{{ delivery.supplier }}</span>
            <span class="text-sm text-muted-foreground">{{ delivery.deliveryDate }}</span>
            <span v-if="delivery.location" class="text-sm text-muted-foreground">{{ delivery.location }}</span>
            <div class="flex items-center gap-1 ml-auto" @click.stop>
              <Button
                v-if="!mirDeliveryIds.has(delivery.materialDeliveryId)"
                variant="outline"
                size="sm"
                :disabled="isGeneratingMir[delivery.materialDeliveryId]"
                @click="generateMir(delivery.materialDeliveryId)"
              >
                {{ isGeneratingMir[delivery.materialDeliveryId] ? '생성 중...' : '자재반입검수요청서' }}
              </Button>
              <template v-else>
                <Badge variant="secondary">검수요청 완료</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  @click="openMirDeleteDialog(getMirForDelivery(delivery.materialDeliveryId)!.id, delivery.materialOrderNumber)"
                >
                  <X class="h-3 w-3" />
                </Button>
              </template>
              <Button
                variant="ghost"
                size="sm"
                class="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                :disabled="mirDeliveryIds.has(delivery.materialDeliveryId)"
                @click="openDeleteDialog(delivery.materialDeliveryId, delivery.materialOrderNumber)"
              >
                <X class="h-4 w-4" />
              </Button>
            </div>
          </div>

          <!-- 펼친 영역 -->
          <div v-if="expandedDeliveries[delivery.materialDeliveryId]" class="p-4">
            <!-- 로딩 -->
            <div v-if="isLoadingLines[delivery.materialDeliveryId]" class="text-sm text-muted-foreground text-center py-8">
              라인 정보 로딩 중...
            </div>

            <template v-else>
              <div class="flex gap-4">
                <!-- 좌측: 이미지 뷰어 (고정 높이) -->
                <div class="w-1/2 flex flex-col gap-2">
                  <div v-if="isLoadingDeliveryImages[delivery.materialDeliveryId]" class="h-[720px] flex items-center justify-center border border-border rounded-lg bg-muted/20">
                    <p class="text-sm text-muted-foreground">이미지 로딩 중...</p>
                  </div>
                  <template v-else-if="(deliveryImageUrls[delivery.materialDeliveryId] ?? []).length > 0">
                    <div
                      class="h-[720px] border border-border rounded-lg overflow-hidden bg-muted/20 relative"
                      :class="{ 'cursor-grab': (deliveryImageScale[delivery.materialDeliveryId] ?? 1) > 1, 'cursor-grabbing': deliveryImageDragging[delivery.materialDeliveryId] }"
                      @wheel.prevent="onDeliveryImageWheel(delivery.materialDeliveryId, $event)"
                      @pointerdown="onDeliveryImagePointerDown(delivery.materialDeliveryId, $event)"
                      @pointermove="onDeliveryImagePointerMove(delivery.materialDeliveryId, $event)"
                      @pointerup="onDeliveryImagePointerUp(delivery.materialDeliveryId)"
                      @pointercancel="onDeliveryImagePointerUp(delivery.materialDeliveryId)"
                    >
                      <img
                        :src="deliveryImageUrls[delivery.materialDeliveryId]?.[deliveryImageIndex[delivery.materialDeliveryId] ?? 0]"
                        alt="송장 이미지"
                        class="w-full h-full object-contain select-none"
                        draggable="false"
                        :style="{
                          transform: `translate(${deliveryImageTranslate[delivery.materialDeliveryId]?.x ?? 0}px, ${deliveryImageTranslate[delivery.materialDeliveryId]?.y ?? 0}px) scale(${deliveryImageScale[delivery.materialDeliveryId] ?? 1})`,
                          transformOrigin: 'center center',
                          transition: deliveryImageDragging[delivery.materialDeliveryId] ? 'none' : 'transform 0.15s ease',
                        }"
                      />
                      <div class="absolute bottom-2 right-2 flex items-center gap-1 bg-background/80 rounded-md border border-border px-1.5 py-0.5">
                        <Button variant="ghost" size="sm" class="h-6 w-6 p-0" @click="deliveryImageScale[delivery.materialDeliveryId] = Math.max(0.5, (deliveryImageScale[delivery.materialDeliveryId] ?? 1) - 0.25)">−</Button>
                        <span class="text-xs text-muted-foreground min-w-[3ch] text-center">{{ Math.round((deliveryImageScale[delivery.materialDeliveryId] ?? 1) * 100) }}%</span>
                        <Button variant="ghost" size="sm" class="h-6 w-6 p-0" @click="deliveryImageScale[delivery.materialDeliveryId] = Math.min(5, (deliveryImageScale[delivery.materialDeliveryId] ?? 1) + 0.25)">+</Button>
                        <Button v-if="(deliveryImageScale[delivery.materialDeliveryId] ?? 1) !== 1" variant="ghost" size="sm" class="h-6 px-1 text-xs" @click="resetDeliveryImageTransform(delivery.materialDeliveryId)">초기화</Button>
                      </div>
                    </div>
                    <!-- 현재 이미지의 설명 -->
                    <div v-if="deliveryEditState[delivery.materialDeliveryId]" class="shrink-0">
                      <template v-if="(deliveryImageIndex[delivery.materialDeliveryId] ?? 0) < delivery.noteFiles.length">
                        <Input
                          v-model="deliveryEditState[delivery.materialDeliveryId]!.noteDescriptions[(deliveryImageIndex[delivery.materialDeliveryId] ?? 0)]!.description"
                          class="h-8 text-sm"
                          placeholder="송장 설명"
                        />
                      </template>
                      <template v-else>
                        <Input
                          v-model="deliveryEditState[delivery.materialDeliveryId]!.photoDescriptions[(deliveryImageIndex[delivery.materialDeliveryId] ?? 0) - delivery.noteFiles.length]!.description"
                          class="h-8 text-sm"
                          placeholder="사진 설명"
                        />
                      </template>
                    </div>
                    <!-- 페이지 넘기기 -->
                    <div v-if="(deliveryImageUrls[delivery.materialDeliveryId] ?? []).length > 1" class="flex items-center justify-center gap-3 shrink-0">
                      <Button variant="outline" size="sm" @click="prevDeliveryImage(delivery.materialDeliveryId)">
                        ← 이전
                      </Button>
                      <span class="text-sm text-muted-foreground">
                        {{ (deliveryImageIndex[delivery.materialDeliveryId] ?? 0) + 1 }} / {{ (deliveryImageUrls[delivery.materialDeliveryId] ?? []).length }}
                      </span>
                      <Button variant="outline" size="sm" @click="nextDeliveryImage(delivery.materialDeliveryId)">
                        다음 →
                      </Button>
                    </div>
                  </template>
                  <div v-else class="h-[720px] flex items-center justify-center border border-border rounded-lg bg-muted/20">
                    <p class="text-sm text-muted-foreground">이미지가 없습니다</p>
                  </div>
                </div>

                <!-- 우측: 수정 폼 -->
                <div class="w-1/2 space-y-4 overflow-y-auto">
                  <!-- 공급업체 / 납품일 -->
                  <div class="grid grid-cols-3 gap-4">
                    <div class="space-y-1.5">
                      <Label>공급업체</Label>
                      <Input v-model="deliveryEditState[delivery.materialDeliveryId]!.supplier" />
                    </div>
                    <div class="space-y-1.5">
                      <Label>납품일</Label>
                      <Input v-model="deliveryEditState[delivery.materialDeliveryId]!.deliveryDate" type="date" />
                    </div>
                    <div class="space-y-1.5">
                      <Label>위치</Label>
                      <Input v-model="deliveryEditState[delivery.materialDeliveryId]!.location" placeholder="예: A동 3층" />
                    </div>
                  </div>

                  <!-- 라인 테이블 -->
                  <div class="overflow-x-auto border border-border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>제조사</TableHead>
                          <TableHead>규격</TableHead>
                          <TableHead class="w-[200px] text-right">수량</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow
                          v-for="(line, lineIdx) in deliveryLinesMap[delivery.materialDeliveryId]"
                          :key="line.deliveryLineId ?? lineIdx"
                          :class="{ 'bg-yellow-50 dark:bg-yellow-950/30': !line.specValidation }"
                        >
                          <TableCell>
                            <Input
                              :model-value="line.manufacturer ?? ''"
                              class="h-8 text-sm"
                              @update:model-value="line.manufacturer = ($event as string) || null"
                            />
                          </TableCell>
                          <TableCell>
                            <div class="flex items-center gap-1.5">
                              <Select
                                :model-value="line.materialSpecId != null ? String(line.materialSpecId) : ''"
                                @update:model-value="(val) => {
                                  const spec = materialSpecs.find(s => s.id === Number(val))
                                  line.materialSpecId = spec ? spec.id : null
                                  line.materialSpecName = spec ? spec.name : null
                                }"
                              >
                                <SelectTrigger class="h-8 text-sm">
                                  <SelectValue placeholder="규격 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem
                                    v-for="spec in materialSpecs"
                                    :key="spec.id"
                                    :value="String(spec.id)"
                                  >
                                    {{ spec.name }}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <span
                                v-if="line.specValidation"
                                class="shrink-0 text-green-600 dark:text-green-400 text-xs font-medium"
                                title="규격 검증 성공"
                              >
                                ✅
                              </span>
                              <span
                                v-else
                                class="shrink-0 text-yellow-600 dark:text-yellow-400 text-xs font-medium"
                                title="규격 검증 실패"
                              >
                                ⚠️
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div class="flex items-center gap-1">
                              <Input
                                :model-value="String(line.quantity)"
                                class="h-8 text-sm text-right"
                                @update:model-value="line.quantity = Number($event) || 0"
                              />
                              <span class="text-sm text-muted-foreground shrink-0">
                                {{ delivery.unit }}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <!-- 수정하기 버튼 -->
                  <div class="flex justify-end">
                    <Button
                      :disabled="isUpdatingDelivery[delivery.materialDeliveryId] || mirDeliveryIds.has(delivery.materialDeliveryId)"
                      @click="updateDelivery(delivery)"
                    >
                      {{ isUpdatingDelivery[delivery.materialDeliveryId] ? '저장 중...' : '수정하기' }}
                    </Button>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </AreaCard>

    <!-- 발주서 없이 송장입력 다이얼로그 -->
    <Dialog v-model:open="directDeliveryDialogOpen">
      <DialogContent class="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>발주서 없이 송장입력</DialogTitle>
        </DialogHeader>

        <div class="space-y-5 py-2">
          <!-- 자재유형 -->
          <div class="space-y-2">
            <Label>자재유형</Label>
            <Select v-model="directSelectedMaterialTypeId">
              <SelectTrigger>
                <SelectValue placeholder="자재유형 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="mt in directMaterialTypes"
                  :key="mt.id"
                  :value="String(mt.id)"
                >
                  {{ mt.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- 분류 (선택사항) -->
          <div class="space-y-2">
            <Label>분류 (선택사항)</Label>
            <Select
              :model-value="directSelectedDivisionId"
              @update:model-value="handleDirectDivisionChange"
            >
              <SelectTrigger>
                <SelectValue placeholder="분류 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="div in directDivisions"
                  :key="div.id"
                  :value="String(div.id)"
                >
                  {{ div.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- 공종 (선택사항) -->
          <div class="space-y-2">
            <Label>공종 (선택사항)</Label>
            <Select
              v-model="directSelectedWorkTypeId"
              :disabled="!directSelectedDivisionId || isLoadingDirectWorkTypes"
            >
              <SelectTrigger>
                <SelectValue :placeholder="isLoadingDirectWorkTypes ? '로딩중...' : '공종 선택'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="wt in directWorkTypes"
                  :key="wt.id"
                  :value="String(wt.id)"
                >
                  {{ wt.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- 송장파일 -->
          <div class="space-y-2">
            <Label>송장파일</Label>
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              class="block w-full text-sm text-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-input file:bg-muted file:text-sm file:font-medium hover:file:bg-muted/80 cursor-pointer"
              @change="onDirectDeliveryNotesChange"
            />
          </div>

          <!-- 반입사진 -->
          <div class="space-y-2">
            <Label>반입사진</Label>
            <input
              type="file"
              multiple
              accept="image/*"
              class="block w-full text-sm text-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-input file:bg-muted file:text-sm file:font-medium hover:file:bg-muted/80 cursor-pointer"
              @change="onDirectDeliveryPhotosChange"
            />
          </div>

          <!-- 위치정보 -->
          <div v-if="directZones.length > 0" class="space-y-2">
            <Label>존</Label>
            <div class="flex flex-wrap gap-3">
              <div v-for="zone in directZones" :key="zone.id" class="flex items-center gap-1.5">
                <Checkbox
                  :id="`direct-zone-${zone.id}`"
                  :model-value="directSelectedZoneIds.includes(zone.id)"
                  @update:model-value="directSelectedZoneIds = toggleId(directSelectedZoneIds, zone.id)"
                />
                <label :for="`direct-zone-${zone.id}`" class="text-sm cursor-pointer">{{ zone.name }}</label>
              </div>
            </div>
          </div>

          <div v-if="directFloors.length > 0" class="space-y-2">
            <Label>층</Label>
            <div class="flex flex-wrap gap-3">
              <div v-for="floor in directFloors" :key="floor.id" class="flex items-center gap-1.5">
                <Checkbox
                  :id="`direct-floor-${floor.id}`"
                  :model-value="directSelectedFloorIds.includes(floor.id)"
                  @update:model-value="directSelectedFloorIds = toggleId(directSelectedFloorIds, floor.id)"
                />
                <label :for="`direct-floor-${floor.id}`" class="text-sm cursor-pointer">{{ floor.name }}</label>
              </div>
            </div>
          </div>

          <div v-if="directSections.length > 0" class="space-y-2">
            <Label>구역</Label>
            <div class="flex flex-wrap gap-3">
              <div v-for="section in directSections" :key="section.id" class="flex items-center gap-1.5">
                <Checkbox
                  :id="`direct-section-${section.id}`"
                  :model-value="directSelectedSectionIds.includes(section.id)"
                  @update:model-value="directSelectedSectionIds = toggleId(directSelectedSectionIds, section.id)"
                />
                <label :for="`direct-section-${section.id}`" class="text-sm cursor-pointer">{{ section.name }}</label>
              </div>
            </div>
          </div>

          <div v-if="directUsages.length > 0" class="space-y-2">
            <Label>용도</Label>
            <div class="flex flex-wrap gap-3">
              <div v-for="usage in directUsages" :key="usage.id" class="flex items-center gap-1.5">
                <Checkbox
                  :id="`direct-usage-${usage.id}`"
                  :model-value="directSelectedUsageIds.includes(usage.id)"
                  @update:model-value="directSelectedUsageIds = toggleId(directSelectedUsageIds, usage.id)"
                />
                <label :for="`direct-usage-${usage.id}`" class="text-sm cursor-pointer">{{ usage.name }}</label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter class="flex-col items-end gap-2">
          <div class="flex gap-2">
            <Button variant="outline" @click="directDeliveryDialogOpen = false">취소</Button>
            <Button :disabled="isSavingDirect" @click="saveDirectDelivery">
              {{ isSavingDirect ? '저장 중...' : '저장' }}
            </Button>
          </div>
          <p v-if="isSavingDirect" class="text-sm text-muted-foreground">
            시간이 좀 걸립니다. 기다려주세요.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 반입자재 삭제 확인 다이얼로그 -->
    <AlertDialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>삭제 확인</AlertDialogTitle>
          <AlertDialogDescription>
            '{{ deleteTargetName }}' 반입자재를 삭제하시겠습니까?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="isDeletingDelivery">취소</AlertDialogCancel>
          <AlertDialogAction :disabled="isDeletingDelivery" @click="confirmDeleteDelivery">
            {{ isDeletingDelivery ? '삭제 중...' : '삭제' }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- MIR 삭제 확인 다이얼로그 -->
    <AlertDialog :open="showMirDeleteDialog" @update:open="showMirDeleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>검수요청서 삭제 확인</AlertDialogTitle>
          <AlertDialogDescription>
            '{{ mirDeleteTargetName }}' 검수요청서를 삭제하시겠습니까?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="isDeletingMir">취소</AlertDialogCancel>
          <AlertDialogAction :disabled="isDeletingMir" @click="confirmDeleteMir">
            {{ isDeletingMir ? '삭제 중...' : '삭제' }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </PageContainer>
</template>
