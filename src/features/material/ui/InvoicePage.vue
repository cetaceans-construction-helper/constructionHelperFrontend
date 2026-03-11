<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import PageContainer from '@/shared/helper-ui/PageContainer.vue'
import AreaCard from '@/shared/helper-ui/AreaCard.vue'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog'
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
import { Checkbox } from '@/shared/ui/checkbox'
import { Label } from '@/shared/ui/label'
import { X } from 'lucide-vue-next'
import { materialOrderApi } from '@/features/material/infra/material-order-api'
import {
  formatMaterialOrderLineLocation as formatLocation,
  getMaterialOrderStatusBadgeClass as getStatusColor,
  getMaterialOrderStatusLabel as getStatusLabel,
} from '@/features/material/model/material-order-rules'
import type { MaterialOrderResponse } from '@/features/material/model/material-order-types'
import { useMaterialOrder } from '@/features/material/view-model/useMaterialOrder'
import { analyticsClient } from '@/shared/analytics/analyticsClient'

const router = useRouter()
const { orders, isLoading, loadOrders, deleteOrder } = useMaterialOrder()
const expandedOrders = reactive<Record<number, boolean>>({})

// 송장입력 다이얼로그 상태
const deliveryDialogOpen = ref(false)
const selectedOrder = ref<MaterialOrderResponse | null>(null)
const deliveryNotes = ref<File[]>([])
const deliveryPhotos = ref<File[]>([])
const selectedZoneIds = ref<number[]>([])
const selectedFloorIds = ref<number[]>([])
// TODO: section/usage 임시 비활성화
// const selectedSectionIds = ref<number[]>([])
// const selectedUsageIds = ref<number[]>([])
const isSaving = ref(false)

// 삭제 다이얼로그 상태
const showDeleteDialog = ref(false)
const deleteTargetId = ref<number | null>(null)
const deleteTargetName = ref('')
const isDeletingOrder = ref(false)

function openDeleteDialog(orderId: number, orderNo: string) {
  deleteTargetId.value = orderId
  deleteTargetName.value = orderNo
  showDeleteDialog.value = true
}

async function confirmDeleteOrder() {
  if (deleteTargetId.value == null) return
  isDeletingOrder.value = true
  try {
    await deleteOrder(deleteTargetId.value)
    showDeleteDialog.value = false
    analyticsClient.trackAction('material_order', 'delete_order', 'success')
    loadOrders()
  } catch (error: unknown) {
    console.error('발주서 삭제 실패:', error)
    analyticsClient.trackAction('material_order', 'delete_order', 'fail')
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  } finally {
    isDeletingOrder.value = false
  }
}

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

// TODO: section/usage 임시 비활성화
// const uniqueSections = computed(() => {
//   if (!selectedOrder.value) return []
//   const map = new Map<number, string>()
//   selectedOrder.value.orderLines.forEach((line) => {
//     if (line.sectionId != null && line.sectionName) {
//       map.set(line.sectionId, line.sectionName)
//     }
//   })
//   return Array.from(map, ([id, name]) => ({ id, name }))
// })

// const uniqueUsages = computed(() => {
//   if (!selectedOrder.value) return []
//   const map = new Map<number, string>()
//   selectedOrder.value.orderLines.forEach((line) => {
//     if (line.usageId != null && line.usageName) {
//       map.set(line.usageId, line.usageName)
//     }
//   })
//   return Array.from(map, ([id, name]) => ({ id, name }))
// })

function toggleOrder(orderId: number) {
  if (expandedOrders[orderId]) {
    expandedOrders[orderId] = false
  } else {
    // 다른 발주서 모두 접기
    for (const key of Object.keys(expandedOrders)) {
      expandedOrders[Number(key)] = false
    }
    expandedOrders[orderId] = true
  }
}

async function openDeliveryDialog(order: MaterialOrderResponse) {
  selectedOrder.value = order
  deliveryNotes.value = []
  deliveryPhotos.value = []
  await nextTick()
  selectedZoneIds.value = uniqueZones.value.map((z) => z.id)
  selectedFloorIds.value = uniqueFloors.value.map((f) => f.id)
  // TODO: section/usage 임시 비활성화
  // selectedSectionIds.value = uniqueSections.value.map((s) => s.id)
  // selectedUsageIds.value = uniqueUsages.value.map((u) => u.id)
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

function toggleId(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((v) => v !== id) : [...list, id]
}

async function saveDelivery() {
  if (!selectedOrder.value) return
  isSaving.value = true
  try {
    await materialOrderApi.createMaterialDelivery({
      orderId: selectedOrder.value.id,
      materialTypeId: selectedOrder.value.materialTypeId,
      workTypeId: selectedOrder.value.workTypeId,
      deliveryNotes: deliveryNotes.value,
      deliveryPhotos: deliveryPhotos.value,
      zoneIds: selectedZoneIds.value,
      floorIds: selectedFloorIds.value,
      // TODO: section/usage 임시 비활성화
      // sectionIds: selectedSectionIds.value,
      // usageIds: selectedUsageIds.value,
    })
    deliveryDialogOpen.value = false
    analyticsClient.trackAction('material_delivery', 'create_delivery', 'success')
    router.push('/helper/material/incoming')
  } catch (error: unknown) {
    console.error('송장입력 실패:', error)
    analyticsClient.trackAction('material_delivery', 'create_delivery', 'fail')
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  loadOrders()
})
</script>

<template>
  <PageContainer title="자재발주서">
    <AreaCard height="flex-1" min-height="1100px">
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
          <!-- 카드 헤더 (클릭으로 펼치기/접기) -->
          <div
            class="bg-muted/30 cursor-pointer select-none"
            @click="toggleOrder(order.id)"
          >
            <div class="flex items-center gap-3 px-4 py-3">
              <span class="text-xs text-muted-foreground">{{ expandedOrders[order.id] ? '▲' : '▼' }}</span>
              <Badge :class="['text-sm px-3 py-1', getStatusColor(order.orderStatus)]">
                {{ getStatusLabel(order.orderStatus) }}
              </Badge>
              <span class="text-sm font-medium">{{ order.orderNo }}</span>
              <span class="text-xs text-muted-foreground">{{ order.workTypeName }}</span>
              <span class="text-sm font-medium bg-muted/30 border border-foreground px-2 py-0.5 rounded">
                {{ order.totalQuantity }} {{ order.unit }}
              </span>
              <div class="flex items-center gap-2 ml-auto" @click.stop>
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
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  @click="openDeleteDialog(order.id, order.orderNo)"
                >
                  <X class="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div v-if="order.specSummary?.length > 0" class="flex items-center gap-2 flex-wrap px-4 pb-3">
              <Badge
                v-for="spec in order.specSummary"
                :key="spec.materialSpecId"
                variant="outline"
                class="text-sm px-2.5 py-1"
              >
                {{ spec.materialSpecName }}:
                <span class="font-semibold ml-1">{{ spec.quantity }}</span>
                <span class="text-muted-foreground ml-0.5">{{ order.unit }}</span>
              </Badge>
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
                  :model-value="selectedZoneIds.includes(zone.id)"
                  @update:model-value="selectedZoneIds = toggleId(selectedZoneIds, zone.id)"
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
                  :model-value="selectedFloorIds.includes(floor.id)"
                  @update:model-value="selectedFloorIds = toggleId(selectedFloorIds, floor.id)"
                />
                <label :for="`floor-${floor.id}`" class="text-sm cursor-pointer">{{ floor.name }}</label>
              </div>
            </div>
          </div>

          <!-- TODO: section/usage 임시 비활성화 -->
          <!-- <div v-if="uniqueSections.length > 0" class="space-y-2">
            <Label>구역</Label>
            <div class="flex flex-wrap gap-3">
              <div v-for="section in uniqueSections" :key="section.id" class="flex items-center gap-1.5">
                <Checkbox
                  :id="`section-${section.id}`"
                  :model-value="selectedSectionIds.includes(section.id)"
                  @update:model-value="selectedSectionIds = toggleId(selectedSectionIds, section.id)"
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
                  :model-value="selectedUsageIds.includes(usage.id)"
                  @update:model-value="selectedUsageIds = toggleId(selectedUsageIds, usage.id)"
                />
                <label :for="`usage-${usage.id}`" class="text-sm cursor-pointer">{{ usage.name }}</label>
              </div>
            </div>
          </div> -->
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

    <!-- 발주서 삭제 확인 다이얼로그 -->
    <AlertDialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>삭제 확인</AlertDialogTitle>
          <AlertDialogDescription>
            '{{ deleteTargetName }}' 발주서를 삭제하시겠습니까?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="isDeletingOrder">취소</AlertDialogCancel>
          <AlertDialogAction :disabled="isDeletingOrder" @click="confirmDeleteOrder">
            {{ isDeletingOrder ? '삭제 중...' : '삭제' }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </PageContainer>
</template>
