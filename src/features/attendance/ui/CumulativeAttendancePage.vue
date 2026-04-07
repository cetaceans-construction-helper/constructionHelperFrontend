<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { parseDate, type DateValue } from '@internationalized/date'
import DateRangeFilter from '@/shared/ui/date-range-picker/DateRangeFilter.vue'
import PageContainer from '@/shared/helper-ui/PageContainer.vue'
import AreaCard from '@/shared/helper-ui/AreaCard.vue'
import { useAttendanceCumulative } from '@/features/attendance/view-model/useAttendanceCumulative'
import CumulativeAttendanceBox from '@/features/attendance/ui/components/CumulativeAttendanceBox.vue'
import CumulativeEquipmentBox from '@/features/attendance/ui/components/CumulativeEquipmentBox.vue'

const {
  startDate: cumulativeStartDate,
  endDate: cumulativeEndDate,
  cumulativeList,
  isLoading: isLoadingCumulative,
  grandTotal,
  equipmentCumulativeList,
  equipmentGrandTotal,
  initDates: initCumulativeDates,
  fetchCumulative,
} = useAttendanceCumulative()

const cumulativeDateRange = ref<{ start?: DateValue; end?: DateValue }>({
  start: undefined,
  end: undefined,
})

watch(cumulativeDateRange, (range) => {
  if (range.start && range.end) {
    cumulativeStartDate.value = range.start.toString()
    cumulativeEndDate.value = range.end.toString()
    fetchCumulative()
  }
})

onMounted(async () => {
  await initCumulativeDates()
  if (cumulativeStartDate.value && cumulativeEndDate.value) {
    cumulativeDateRange.value = {
      start: parseDate(cumulativeStartDate.value),
      end: parseDate(cumulativeEndDate.value),
    }
  }
})
</script>

<template>
  <PageContainer title="출역 누적 집계">
    <AreaCard height="flex-1" min-height="400px">
      <div class="flex items-center gap-2 mb-4">
        <DateRangeFilter :model-value="(cumulativeDateRange as any)" @update:model-value="(v: any) => cumulativeDateRange = v" />
      </div>

      <div class="grid grid-cols-2 [@media(max-aspect-ratio:1/1)]:grid-cols-1 gap-4 flex-1">
        <CumulativeAttendanceBox
          :cumulative-list="cumulativeList"
          :is-loading="isLoadingCumulative"
          :grand-total="grandTotal"
        />
        <CumulativeEquipmentBox
          :cumulative-list="equipmentCumulativeList"
          :is-loading="isLoadingCumulative"
          :grand-total="equipmentGrandTotal"
        />
      </div>
    </AreaCard>
  </PageContainer>
</template>
