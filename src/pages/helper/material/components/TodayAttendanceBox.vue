<script setup lang="ts">
import { computed } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import type { AttendanceByDateItem } from '@/api/attendance'
import type { EquipmentDeploymentByDateItem } from '@/api/equipment'

interface Props {
  attendances: AttendanceByDateItem[]
  isLoading: boolean
  equipmentDeployments?: EquipmentDeploymentByDateItem[]
  isLoadingEquipment?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  equipmentDeployments: () => [],
  isLoadingEquipment: false,
})

// 협력업체별로 인원 + 장비 병합 그룹핑
const groupedByCompany = computed(() => {
  const map = new Map<
    string,
    {
      companyId: string
      companyDisplayName: string
      laborItems: AttendanceByDateItem[]
      equipmentItems: EquipmentDeploymentByDateItem[]
    }
  >()

  // 출역인원 그룹핑
  for (const item of props.attendances) {
    if (!map.has(item.companyId)) {
      map.set(item.companyId, {
        companyId: item.companyId,
        companyDisplayName: item.companyDisplayName,
        laborItems: [],
        equipmentItems: [],
      })
    }
    map.get(item.companyId)!.laborItems.push(item)
  }

  // 출역장비 그룹핑
  for (const item of props.equipmentDeployments) {
    if (!map.has(item.companyId)) {
      map.set(item.companyId, {
        companyId: item.companyId,
        companyDisplayName: item.companyDisplayName,
        laborItems: [],
        equipmentItems: [],
      })
    }
    map.get(item.companyId)!.equipmentItems.push(item)
  }

  return Array.from(map.values())
})

const isEmpty = computed(() => {
  return props.attendances.length === 0 && props.equipmentDeployments.length === 0
})

const isAnyLoading = computed(() => {
  return props.isLoading || props.isLoadingEquipment
})
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- 로딩 상태 -->
    <div v-if="isAnyLoading" class="flex-1 flex items-center justify-center">
      <Loader2 class="w-5 h-5 animate-spin text-muted-foreground" />
      <span class="ml-2 text-sm text-muted-foreground">로딩중...</span>
    </div>

    <!-- 데이터 없음 -->
    <div v-else-if="isEmpty" class="flex-1 flex items-center justify-center">
      <p class="text-sm text-muted-foreground">등록된 출역 정보가 없습니다.</p>
    </div>

    <!-- 협력업체별 출역 목록 -->
    <div v-else class="flex-1 overflow-y-auto space-y-3">
      <div
        v-for="company in groupedByCompany"
        :key="company.companyId"
        class="border border-border rounded-lg bg-card"
      >
        <!-- 협력업체 헤더 -->
        <div class="px-4 py-2 border-b border-border bg-muted/50">
          <span class="font-medium text-sm">{{ company.companyDisplayName }}</span>
        </div>

        <div class="p-4 space-y-3">
          <!-- 출역인원 섹션 -->
          <div v-if="company.laborItems.length > 0">
            <p class="text-xs text-muted-foreground font-medium mb-1">오늘 출역 인원</p>
            <div class="space-y-1">
              <div
                v-for="item in company.laborItems"
                :key="`labor-${item.companyId}-${item.laborTypeId}`"
                class="flex items-center justify-between text-sm pl-2"
              >
                <span class="text-muted-foreground">{{ item.laborTypeName }}</span>
                <span class="font-medium">{{ item.count }}명</span>
              </div>
            </div>
          </div>

          <!-- 출역장비 섹션 -->
          <div v-if="company.equipmentItems.length > 0">
            <p class="text-xs text-muted-foreground font-medium mb-1">오늘 출역 장비</p>
            <div class="space-y-1">
              <div
                v-for="item in company.equipmentItems"
                :key="`equip-${item.companyId}-${item.equipmentSpecId}`"
                class="flex items-center justify-between text-sm pl-2"
              >
                <span class="text-muted-foreground">
                  {{ item.equipmentTypeName }} {{ item.equipmentSpecName }}
                </span>
                <span class="font-medium">{{ item.count }}대 {{ item.workTime }}시간</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
