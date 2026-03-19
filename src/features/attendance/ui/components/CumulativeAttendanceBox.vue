<script setup lang="ts">
import type { AttendanceCumulativeWorkType } from '@/features/attendance/infra/attendance-api'

defineProps<{
  cumulativeList: AttendanceCumulativeWorkType[]
  isLoading: boolean
  grandTotal: number
}>()
</script>

<template>
  <div class="space-y-3">
    <!-- 로딩 -->
    <div v-if="isLoading" class="flex items-center justify-center py-8">
      <p class="text-muted-foreground text-sm">조회 중...</p>
    </div>

    <!-- 데이터 없음 -->
    <div
      v-else-if="cumulativeList.length === 0"
      class="flex items-center justify-center py-8"
    >
      <p class="text-muted-foreground text-sm">조회 버튼을 눌러 누적 집계를 확인하세요.</p>
    </div>

    <!-- 누적 집계 -->
    <div v-else class="space-y-3">
      <h4 class="text-sm font-medium">인원 누적 집계</h4>
      <!-- 총합 -->
      <div class="flex items-center justify-between px-3 py-2 bg-primary/10 rounded-md">
        <span class="text-sm font-semibold">총 출역인원</span>
        <span class="text-lg font-bold text-primary">{{ grandTotal }}명</span>
      </div>

      <!-- 공종별 -->
      <div
        v-for="item in cumulativeList"
        :key="item.workTypeId"
        class="border border-border rounded-md overflow-hidden"
      >
        <div class="flex items-center justify-between px-3 py-2 bg-muted/50">
          <span class="text-sm font-medium">{{ item.workTypeName }}</span>
          <span class="text-sm font-semibold">{{ item.totalCount }}명</span>
        </div>
        <div class="divide-y divide-border">
          <div
            v-for="labor in item.laborTypes"
            :key="labor.laborTypeId"
            class="flex items-center justify-between px-3 py-1.5 text-sm"
          >
            <span class="text-muted-foreground">{{ labor.laborTypeName }}</span>
            <span>{{ labor.count }}명</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
