<script setup lang="ts">
import { onMounted } from 'vue'
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
import { useMaterialOrder } from './composables/useMaterialOrder'
import type { MaterialOrderResponse } from '@/api/materialOrder'

const { orders, isLoading, loadOrders } = useMaterialOrder()

onMounted(() => {
  loadOrders()
})

function getStatusLabel(status: string): string {
  switch (status) {
    case 'BEFORE_ORDER':
      return '발주전'
    case 'ORDERED':
      return '발주완료'
    default:
      return status
  }
}

function getStatusVariant(status: string): 'secondary' | 'default' {
  switch (status) {
    case 'BEFORE_ORDER':
      return 'secondary'
    case 'ORDERED':
      return 'default'
    default:
      return 'secondary'
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
      :tabs="[{ value: 'order', label: '발주 자재' }, { value: 'incoming', label: '반입 자재' }, { value: 'outgoing', label: '반출 자재' }, { value: 'remaining', label: '잔여 자재' }]"
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
          <p class="text-muted-foreground">발주서가 없습니다. 3D 공정표에서 부재를 선택하여 발주서를 생성하세요.</p>
        </div>

        <!-- 발주서 카드 목록 -->
        <div v-else class="space-y-4">
          <div
            v-for="order in orders"
            :key="order.id"
            class="border border-border rounded-lg overflow-hidden"
          >
            <!-- 카드 상단: 주문 정보 -->
            <div class="flex items-center gap-3 px-4 py-3 bg-muted/30">
              <Badge :variant="getStatusVariant(order.orderStatus)">
                {{ getStatusLabel(order.orderStatus) }}
              </Badge>
              <span class="text-sm font-medium">{{ order.orderNo }}</span>
              <span class="text-sm text-muted-foreground ml-auto">
                {{ order.materialTypeName }}
              </span>
              <span class="text-sm font-medium">
                {{ order.totalQuantity }} {{ order.unit }}
              </span>
            </div>

            <!-- 카드 하단: 라인 테이블 + 버튼 -->
            <div class="flex">
              <!-- 테이블 -->
              <div class="flex-1 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>자재규격</TableHead>
                      <TableHead>부재코드</TableHead>
                      <TableHead>위치</TableHead>
                      <TableHead class="text-right">수량</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="line in order.orderLines" :key="line.id">
                      <TableCell class="text-sm">{{ line.materialSpecName }}</TableCell>
                      <TableCell class="text-sm">{{ line.componentCodeId }}</TableCell>
                      <TableCell class="text-sm">{{ formatLocation(line) }}</TableCell>
                      <TableCell class="text-sm text-right">{{ line.quantity }}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <!-- 우측 버튼 영역 -->
              <div class="flex flex-col gap-2 px-4 py-3 border-l border-border justify-center">
                <Button variant="outline" size="sm">발주하기</Button>
                <Button variant="outline" size="sm">송장입력</Button>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #tab-incoming>
        <div class="flex-1 flex items-center justify-center border border-dashed border-border rounded-lg">
          <p class="text-muted-foreground">반입 자재 (구현 예정)</p>
        </div>
      </template>
      <template #tab-outgoing>
        <div class="flex-1 flex items-center justify-center border border-dashed border-border rounded-lg">
          <p class="text-muted-foreground">반출 자재 (구현 예정)</p>
        </div>
      </template>
      <template #tab-remaining>
        <div class="flex-1 flex items-center justify-center border border-dashed border-border rounded-lg">
          <p class="text-muted-foreground">잔여 자재 (구현 예정)</p>
        </div>
      </template>
    </AreaCard>
  </PageContainer>
</template>
