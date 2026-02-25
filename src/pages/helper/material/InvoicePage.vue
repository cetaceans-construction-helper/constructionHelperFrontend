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
import { useMaterialOrder } from './composables/useMaterialOrder'
import { materialOrderApi } from '@/api/materialOrder'
import type {
  MaterialOrderResponse,
  MaterialDeliverySummary,
  DeliveryLineResponse,
} from '@/api/materialOrder'
import { referenceApi } from '@/api/reference'
import type { MaterialSpecResponse } from '@/api/reference'

const { orders, isLoading, loadOrders } = useMaterialOrder()
const expandedOrders = reactive<Record<number, boolean>>({})

// 송장입력 다이얼로그 상태
const deliveryDialogOpen = ref(false)
const selectedOrder = ref<MaterialOrderResponse | null>(null)
const deliveryNotes = ref<File[]>([])
const deliveryPhotos = ref<File[]>([])
const selectedZoneIds = ref<number[]>([])
const selectedFloorIds = ref<number[]>([])
const selectedSectionIds = ref<number[]>([])
const selectedUsageIds = ref<number[]>([])
const isSaving = ref(false)

// 반입자재 탭 상태
const deliveries = ref<MaterialDeliverySummary[]>([])
const isLoadingDeliveries = ref(false)

// 반입자재 펼치기/접기 + 인라인 수정 상태
const expandedDeliveries = reactive<Record<number, boolean>>({})
const deliveryLinesMap = ref<Record<number, DeliveryLineResponse[]>>({})
const deliveryEditState = ref<Record<number, { supplier: string; deliveryDate: string }>>({})
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

// 선택된 order의 orderLines에서 고유한 위치정보 추출
const uniqueZones = computed(() => {
  if (!selectedOrder.value) return []
  const map = new Map<number, string>()
  selectedOrder.value.orderLines.forEach((line) => {
    if (line.zoneId != null && line.zoneName) {
      map.set(line.zoneId, line.zoneName)
    }
  })
  return Array.from(map, ([id, name]) => ({ id, name }))
})

const uniqueFloors = computed(() => {
  if (!selectedOrder.value) return []
  const map = new Map<number, string>()
  selectedOrder.value.orderLines.forEach((line) => {
    if (line.floorId != null && line.floorName) {
      map.set(line.floorId, line.floorName)
    }
  })
  return Array.from(map, ([id, name]) => ({ id, name }))
})

const uniqueSections = computed(() => {
  if (!selectedOrder.value) return []
  const map = new Map<number, string>()
  selectedOrder.value.orderLines.forEach((line) => {
    if (line.sectionId != null && line.sectionName) {
      map.set(line.sectionId, line.sectionName)
    }
  })
  return Array.from(map, ([id, name]) => ({ id, name }))
})

const uniqueUsages = computed(() => {
  if (!selectedOrder.value) return []
  const map = new Map<number, string>()
  selectedOrder.value.orderLines.forEach((line) => {
    if (line.usageId != null && line.usageName) {
      map.set(line.usageId, line.usageName)
    }
  })
  return Array.from(map, ([id, name]) => ({ id, name }))
})

function toggleOrder(orderId: number) {
  expandedOrders[orderId] = !expandedOrders[orderId]
}

async function openDeliveryDialog(order: MaterialOrderResponse) {
  selectedOrder.value = order
  deliveryNotes.value = []
  deliveryPhotos.value = []
  await nextTick()
  selectedZoneIds.value = uniqueZones.value.map((z) => z.id)
  selectedFloorIds.value = uniqueFloors.value.map((f) => f.id)
  selectedSectionIds.value = uniqueSections.value.map((s) => s.id)
  selectedUsageIds.value = uniqueUsages.value.map((u) => u.id)
  deliveryDialogOpen.value = true
}

function onDeliveryNotesChange(event: Event) {
  const input = event.target as HTMLInputElement
  deliveryNotes.value = input.files ? Array.from(input.files) : []
}

function onDeliveryPhotosChange(event: Event) {
  const input = event.target as HTMLInputElement
  deliveryPhotos.value = input.files ? Array.from(input.files) : []
}

function toggleCheckbox(list: number[], id: number) {
  const idx = list.indexOf(id)
  if (idx === -1) {
    list.push(id)
  } else {
    list.splice(idx, 1)
  }
}

async function saveDelivery() {
  if (!selectedOrder.value) return
  isSaving.value = true
  try {
    await materialOrderApi.createMaterialDelivery(
      selectedOrder.value.id,
      deliveryNotes.value,
      deliveryPhotos.value,
      selectedZoneIds.value,
      selectedFloorIds.value,
      selectedSectionIds.value,
      selectedUsageIds.value,
    )
    deliveryDialogOpen.value = false
    loadOrders()
    loadDeliveries()
  } catch (error: unknown) {
    console.error('송장입력 실패:', error)
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  } finally {
    isSaving.value = false
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

    // noteUrls 기반 이미지 로드
    if (delivery.noteUrls.length > 0) {
      isLoadingDeliveryImages.value[id] = true
      try {
        const blobUrls = await Promise.all(
          delivery.noteUrls.map((url) => materialOrderApi.getDeliveryNoteImage(url)),
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
  const idx = deliveryImageIndex.value[deliveryId] ?? 0
  if (idx > 0) {
    deliveryImageIndex.value[deliveryId] = idx - 1
    resetDeliveryImageTransform(deliveryId)
  }
}

function nextDeliveryImage(deliveryId: number) {
  const urls = deliveryImageUrls.value[deliveryId] ?? []
  const idx = deliveryImageIndex.value[deliveryId] ?? 0
  if (idx < urls.length - 1) {
    deliveryImageIndex.value[deliveryId] = idx + 1
    resetDeliveryImageTransform(deliveryId)
  }
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
      deliveryLines: lines.map((line) => ({
        deliveryLineId: line.deliveryLineId,
        manufacturer: line.manufacturer,
        specId: line.materialSpecId,
        quantity: String(line.quantity),
      })),
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
})

onUnmounted(() => {
  // 열린 delivery 이미지 URL 정리
  Object.values(deliveryImageUrls.value).forEach((urls) => {
    urls.forEach((url) => URL.revokeObjectURL(url))
  })
})

function getStatusLabel(status: string): string {
  switch (status) {
    case 'BEFORE_ORDER':
      return '발주전'
    case 'ORDER_COMPLETED':
      return '발주완료'
    case 'RECEIPT_COMPLETED':
      return '반입완료'
    default:
      return status
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'BEFORE_ORDER':
      return 'bg-red-500 text-white hover:bg-red-500/80'
    case 'ORDER_COMPLETED':
      return 'bg-green-500 text-white hover:bg-green-500/80'
    case 'RECEIPT_COMPLETED':
      return 'bg-blue-500 text-white hover:bg-blue-500/80'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function formatLocation(line: MaterialOrderResponse['orderLines'][number]): string {
  const parts = [line.zoneName, line.floorName, line.sectionName, line.usageName].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : '-'
}
</script>

<template>
  <PageContainer title="자재관리">
    <AreaCard
      height="flex-1"
      min-height="1100px"
      :has-tabs="true"
      :tabs="[
        { value: 'order', label: '자재 발주서' },
        { value: 'incoming', label: '반입 자재' },
        { value: 'outgoing', label: '반출 자재' },
        { value: 'remaining', label: '잔여 자재' },
      ]"
      default-tab="order"
    >
      <template #tab-order>
        <!-- 로딩 -->
        <div v-if="isLoading" class="text-sm text-muted-foreground text-center py-8">
          발주서 목록 로딩 중...
        </div>

        <!-- 빈 상태 -->
        <div
          v-else-if="orders.length === 0"
          class="flex items-center justify-center py-16 border border-dashed border-border rounded-lg"
        >
          <p class="text-muted-foreground">
            발주서가 없습니다. 3D 공정표에서 부재를 선택하여 발주서를 생성하세요.
          </p>
        </div>

        <!-- 발주서 카드 목록 -->
        <div v-else class="space-y-4">
          <div
            v-for="order in orders"
            :key="order.id"
            class="border border-border rounded-lg overflow-hidden"
          >
            <!-- 카드 헤더 -->
            <div class="flex items-center gap-3 px-4 py-3 bg-muted/30">
              <Badge :class="['text-sm px-3 py-1', getStatusColor(order.orderStatus)]">
                {{ getStatusLabel(order.orderStatus) }}
              </Badge>
              <span class="text-sm font-medium">{{ order.orderNo }}</span>
              <span class="text-xs text-muted-foreground">{{ order.workTypeName }}</span>
              <span class="text-sm font-medium bg-muted/30 border border-foreground px-2 py-0.5 rounded">
                {{ order.totalQuantity }} {{ order.unit }}
              </span>
              <div class="flex items-center gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  :disabled="order.orderStatus === 'ORDER_COMPLETED' || order.orderStatus === 'RECEIPT_COMPLETED'"
                >
                  발주하기
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  :disabled="order.orderStatus !== 'ORDER_COMPLETED'"
                  @click="openDeliveryDialog(order)"
                >
                  송장입력
                </Button>
                <Button variant="ghost" size="sm" @click="toggleOrder(order.id)">
                  {{ expandedOrders[order.id] ? '접기 ▲' : '펼치기 ▼' }}
                </Button>
              </div>
            </div>

            <!-- 라인 테이블 (접기/펼치기) -->
            <div v-if="expandedOrders[order.id]" class="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>오브젝트</TableHead>
                    <TableHead>자재규격</TableHead>
                    <TableHead>부재코드</TableHead>
                    <TableHead>세부작업</TableHead>
                    <TableHead>위치</TableHead>
                    <TableHead class="text-right">수량</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="line in order.orderLines" :key="line.id">
                    <TableCell class="text-sm">{{ line.object3dId ?? '-' }}</TableCell>
                    <TableCell class="text-sm">{{ line.materialSpecName }}</TableCell>
                    <TableCell class="text-sm">{{ line.componentCodeName ?? '-' }}</TableCell>
                    <TableCell class="text-sm">{{ line.workStepName ?? '-' }}</TableCell>
                    <TableCell class="text-sm">{{ formatLocation(line) }}</TableCell>
                    <TableCell class="text-sm text-right">{{ line.quantity }}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </template>
      <template #tab-incoming>
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
            <!-- 카드 헤더 -->
            <div class="flex items-center gap-3 px-4 py-3 bg-muted/30">
              <span class="text-sm font-medium">{{ delivery.materialOrderNumber }}</span>
              <span class="text-sm text-muted-foreground">{{ delivery.supplier }}</span>
              <span class="text-sm text-muted-foreground">{{ delivery.deliveryDate }}</span>
              <div class="ml-auto">
                <Button variant="ghost" size="sm" @click="toggleDelivery(delivery)">
                  {{ expandedDeliveries[delivery.materialDeliveryId] ? '접기 ▲' : '펼치기 ▼' }}
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
                <div class="flex gap-4" style="min-height: 400px">
                  <!-- 좌측: 이미지 뷰어 -->
                  <div class="w-1/2 flex flex-col gap-2 min-h-0">
                    <div v-if="isLoadingDeliveryImages[delivery.materialDeliveryId]" class="flex-1 flex items-center justify-center border border-border rounded-lg bg-muted/20">
                      <p class="text-sm text-muted-foreground">이미지 로딩 중...</p>
                    </div>
                    <template v-else-if="(deliveryImageUrls[delivery.materialDeliveryId] ?? []).length > 0">
                      <div
                        class="flex-1 min-h-0 border border-border rounded-lg overflow-hidden bg-muted/20 relative"
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
                      <div v-if="(deliveryImageUrls[delivery.materialDeliveryId] ?? []).length > 1" class="flex items-center justify-center gap-3 shrink-0">
                        <Button variant="outline" size="sm" :disabled="(deliveryImageIndex[delivery.materialDeliveryId] ?? 0) === 0" @click="prevDeliveryImage(delivery.materialDeliveryId)">
                          ← 이전
                        </Button>
                        <span class="text-sm text-muted-foreground">
                          {{ (deliveryImageIndex[delivery.materialDeliveryId] ?? 0) + 1 }} / {{ (deliveryImageUrls[delivery.materialDeliveryId] ?? []).length }}
                        </span>
                        <Button variant="outline" size="sm" :disabled="(deliveryImageIndex[delivery.materialDeliveryId] ?? 0) === (deliveryImageUrls[delivery.materialDeliveryId] ?? []).length - 1" @click="nextDeliveryImage(delivery.materialDeliveryId)">
                          다음 →
                        </Button>
                      </div>
                    </template>
                    <div v-else class="flex-1 flex items-center justify-center border border-border rounded-lg bg-muted/20">
                      <p class="text-sm text-muted-foreground">이미지가 없습니다</p>
                    </div>
                  </div>

                  <!-- 우측: 수정 폼 -->
                  <div class="w-1/2 space-y-4 overflow-y-auto">
                    <!-- 공급업체 / 납품일 -->
                    <div class="grid grid-cols-2 gap-4">
                      <div class="space-y-1.5">
                        <Label>공급업체</Label>
                        <Input v-model="deliveryEditState[delivery.materialDeliveryId]!.supplier" />
                      </div>
                      <div class="space-y-1.5">
                        <Label>납품일</Label>
                        <Input v-model="deliveryEditState[delivery.materialDeliveryId]!.deliveryDate" type="date" />
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
                        :disabled="isUpdatingDelivery[delivery.materialDeliveryId]"
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
      </template>
      <template #tab-outgoing>
        <div
          class="flex-1 flex items-center justify-center border border-dashed border-border rounded-lg"
        >
          <p class="text-muted-foreground">반출 자재 (구현 예정)</p>
        </div>
      </template>
      <template #tab-remaining>
        <div
          class="flex-1 flex items-center justify-center border border-dashed border-border rounded-lg"
        >
          <p class="text-muted-foreground">잔여 자재 (구현 예정)</p>
        </div>
      </template>
    </AreaCard>

    <!-- 송장입력 다이얼로그 -->
    <Dialog v-model:open="deliveryDialogOpen">
      <DialogContent class="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>송장입력</DialogTitle>
        </DialogHeader>

        <div class="space-y-5 py-2">
          <!-- 송장파일 -->
          <div class="space-y-2">
            <Label>송장파일</Label>
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              class="block w-full text-sm text-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-input file:bg-muted file:text-sm file:font-medium hover:file:bg-muted/80 cursor-pointer"
              @change="onDeliveryNotesChange"
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
              @change="onDeliveryPhotosChange"
            />
          </div>

          <!-- 위치정보 -->
          <div v-if="uniqueZones.length > 0" class="space-y-2">
            <Label>존</Label>
            <div class="flex flex-wrap gap-3">
              <div v-for="zone in uniqueZones" :key="zone.id" class="flex items-center gap-1.5">
                <Checkbox
                  :id="`zone-${zone.id}`"
                  :checked="selectedZoneIds.includes(zone.id)"
                  @update:checked="toggleCheckbox(selectedZoneIds, zone.id)"
                />
                <label :for="`zone-${zone.id}`" class="text-sm cursor-pointer">{{ zone.name }}</label>
              </div>
            </div>
          </div>

          <div v-if="uniqueFloors.length > 0" class="space-y-2">
            <Label>층</Label>
            <div class="flex flex-wrap gap-3">
              <div v-for="floor in uniqueFloors" :key="floor.id" class="flex items-center gap-1.5">
                <Checkbox
                  :id="`floor-${floor.id}`"
                  :checked="selectedFloorIds.includes(floor.id)"
                  @update:checked="toggleCheckbox(selectedFloorIds, floor.id)"
                />
                <label :for="`floor-${floor.id}`" class="text-sm cursor-pointer">{{ floor.name }}</label>
              </div>
            </div>
          </div>

          <div v-if="uniqueSections.length > 0" class="space-y-2">
            <Label>구역</Label>
            <div class="flex flex-wrap gap-3">
              <div v-for="section in uniqueSections" :key="section.id" class="flex items-center gap-1.5">
                <Checkbox
                  :id="`section-${section.id}`"
                  :checked="selectedSectionIds.includes(section.id)"
                  @update:checked="toggleCheckbox(selectedSectionIds, section.id)"
                />
                <label :for="`section-${section.id}`" class="text-sm cursor-pointer">{{ section.name }}</label>
              </div>
            </div>
          </div>

          <div v-if="uniqueUsages.length > 0" class="space-y-2">
            <Label>용도</Label>
            <div class="flex flex-wrap gap-3">
              <div v-for="usage in uniqueUsages" :key="usage.id" class="flex items-center gap-1.5">
                <Checkbox
                  :id="`usage-${usage.id}`"
                  :checked="selectedUsageIds.includes(usage.id)"
                  @update:checked="toggleCheckbox(selectedUsageIds, usage.id)"
                />
                <label :for="`usage-${usage.id}`" class="text-sm cursor-pointer">{{ usage.name }}</label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter class="flex-col items-end gap-2">
          <div class="flex gap-2">
            <Button variant="outline" @click="deliveryDialogOpen = false">취소</Button>
            <Button :disabled="isSaving" @click="saveDelivery">
              {{ isSaving ? '저장 중...' : '저장' }}
            </Button>
          </div>
          <p v-if="isSaving" class="text-sm text-muted-foreground">
            시간이 좀 걸립니다. 기다려주세요.
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>

  </PageContainer>
</template>
