<script setup lang="ts">
import { onMounted } from 'vue'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { Plus, X } from 'lucide-vue-next'
import { useBulkDeployment } from '@/features/project-admin/bulk-deployment/view-model/useBulkDeployment'

const {
  startDate,
  endDate,
  isSubmitting,
  laborTypesByWorkType,
  equipmentSpecs,
  workTypes,
  attendanceBoxes,
  equipmentRows,
  canSubmit,
  initDates,
  loadReferenceData,
  addAttendanceBox,
  removeAttendanceBox,
  selectWorkType,
  addEquipmentRow,
  removeEquipmentRow,
  submit,
} = useBulkDeployment()

onMounted(async () => {
  await Promise.all([initDates(), loadReferenceData()])
})
</script>

<template>
  <div class="space-y-6">
    <!-- 기간 설정 -->
    <div class="space-y-2">
      <Label class="text-sm font-medium">기간 설정</Label>
      <div class="flex items-center gap-2">
        <Input v-model="startDate" type="date" class="w-44" />
        <span class="text-muted-foreground">~</span>
        <Input v-model="endDate" type="date" class="w-44" />
      </div>
      <p class="text-xs text-muted-foreground">
        기간 내 균등 분배됩니다. (예: 100명 / 13일 → 앞 9일 8명, 뒤 4일 7명)
      </p>
    </div>

    <div class="grid grid-cols-2 gap-6">
      <!-- 출역인원 입력 -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <Label class="text-sm font-medium">출역인원</Label>
          <Button variant="outline" size="sm" @click="addAttendanceBox">
            <Plus class="w-3.5 h-3.5 mr-1" />
            공종 추가
          </Button>
        </div>

        <div class="space-y-3">
          <div
            v-for="box in attendanceBoxes"
            :key="box.id"
            class="border border-border rounded-lg bg-card"
          >
            <!-- 공종 헤더 -->
            <div class="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
              <div v-if="box.workTypeId" class="font-medium text-sm">
                {{ box.workTypeName }}
              </div>
              <div v-else class="flex-1 mr-4">
                <Select @update:model-value="selectWorkType(box.id, Number($event))">
                  <SelectTrigger>
                    <SelectValue placeholder="공종 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="group in laborTypesByWorkType"
                      :key="group.workTypeId"
                      :value="String(group.workTypeId)"
                    >
                      {{ group.workTypeName }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                :disabled="attendanceBoxes.length <= 1"
                @click="removeAttendanceBox(box.id)"
              >
                <X class="w-4 h-4" />
              </Button>
            </div>

            <!-- 직종별 인원 입력 -->
            <div class="p-4 space-y-3">
              <div v-if="!box.workTypeId" class="text-center text-muted-foreground text-sm py-2">
                공종을 선택해주세요.
              </div>
              <template v-else>
                <div
                  v-for="row in box.laborRows"
                  :key="row.laborTypeId"
                  class="flex items-center justify-between"
                >
                  <span class="text-sm text-muted-foreground">{{ row.laborTypeName }}</span>
                  <div class="flex items-center gap-2">
                    <Input
                      v-model.number="row.totalCount"
                      type="number"
                      min="0"
                      placeholder="총 인원"
                      class="w-24 text-center h-8"
                    />
                    <span class="text-sm text-muted-foreground">명</span>
                  </div>
                </div>
                <div v-if="box.laborRows.length === 0" class="text-center text-muted-foreground text-sm py-2">
                  등록된 직종이 없습니다.
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- 출역장비 입력 -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <Label class="text-sm font-medium">출역장비</Label>
          <Button variant="outline" size="sm" @click="addEquipmentRow">
            <Plus class="w-3.5 h-3.5 mr-1" />
            추가
          </Button>
        </div>

        <div class="space-y-2">
          <div
            v-for="row in equipmentRows"
            :key="row.id"
            class="flex items-center gap-2"
          >
            <Select
              :model-value="row.equipmentSpecId != null ? String(row.equipmentSpecId) : undefined"
              @update:model-value="row.equipmentSpecId = Number($event)"
            >
              <SelectTrigger class="flex-1">
                <SelectValue placeholder="장비규격 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="es in equipmentSpecs"
                  :key="es.id"
                  :value="String(es.id)"
                >
                  {{ es.name }} ({{ es.equipmentTypeName }})
                </SelectItem>
              </SelectContent>
            </Select>
            <Select
              :model-value="row.workTypeId != null ? String(row.workTypeId) : undefined"
              @update:model-value="row.workTypeId = Number($event)"
            >
              <SelectTrigger class="w-32">
                <SelectValue placeholder="공종" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="wt in workTypes"
                  :key="wt.id"
                  :value="String(wt.id)"
                >
                  {{ wt.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <Input
              v-model.number="row.totalCount"
              type="number"
              min="0"
              placeholder="총 대수"
              class="w-24"
            />
            <span class="text-sm text-muted-foreground w-4">대</span>
            <Button
              variant="ghost"
              size="icon-sm"
              :disabled="equipmentRows.length <= 1"
              @click="removeEquipmentRow(row.id)"
            >
              <X class="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- 제출 버튼 -->
    <div class="flex justify-end pt-2">
      <Button :disabled="!canSubmit || isSubmitting" @click="submit">
        {{ isSubmitting ? '처리 중...' : '대량 입력' }}
      </Button>
    </div>
  </div>
</template>
