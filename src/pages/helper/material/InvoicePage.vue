<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
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
import { useMaterialOrder } from './composables/useMaterialOrder'
import { materialOrderApi } from '@/api/materialOrder'
import type { MaterialOrderResponse } from '@/api/materialOrder'

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
      sectionIds: selectedSectionIds.value,
      usageIds: selectedUsageIds.value,
    })
    deliveryDialogOpen.value = false
    loadOrders()
  } catch (error: unknown) {
    console.error('송장입력 실패:', error)
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  loadOrders()
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
            class="flex items-center gap-3 px-4 py-3 bg-muted/30 cursor-pointer select-none"
            @click="toggleOrder(order.id)"
          >
            <span class="text-xs text-muted-foreground">{{ expandedOrders[order.id] ? '▲' : '▼' }}</span>
            <Badge :class="['text-sm px-3 py-1', getStatusColor(order.orderStatus)]">
              {{ getStatusLabel(order.orderStatus) }}
            </Badge>
            <span class="text-sm font-medium">{{ order.orderNo }}</span>
            <span class="text-xs text-muted-foreground">{{ order.workTypeName }}</span>
            <span class="text-sm font-medium bg-muted/30 border border-foreground px-2 py-0.5 rounded">
              {{ order.totalQuantity }} {{ order.unit }}
            </span>
            <div v-if="order.specSummary?.length > 0" class="flex items-center gap-2 flex-wrap">
              <Badge
                v-for="spec in order.specSummary"
                :key="spec.materialSpecId"
                variant="outline"
                class="text-sm px-2.5 py-1"
              >
                {{ spec.materialSpecName }}
                <span class="font-semibold ml-1">{{ spec.quantity }}</span>
                <span class="text-muted-foreground ml-0.5">{{ order.unit }}</span>
              </Badge>
            </div>
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

          <div v-if="uniqueSections.length > 0" class="space-y-2">
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
