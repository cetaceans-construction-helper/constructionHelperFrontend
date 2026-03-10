<script setup lang="ts">
import { onMounted, reactive, ref, watchEffect } from 'vue'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Separator } from '@/shared/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { X } from 'lucide-vue-next'
import { useDailyReportSetting } from '@/features/project-admin/daily-report-setting/view-model/useDailyReportSetting'

const {
  isLoading,
  isSaving,
  cellRef,
  dailyReportTemplateUrl,
  sectionColumnKeys,
  sectionColumnLabels,
  divisions,
  workTypes,
  laborTypes,
  materialTypes,
  materialSpecs,
  equipmentTypes,
  equipmentSpecs,
  load,
  save,
  uploadTemplate,
  addOverflow,
  removeOverflow,
  toggleAttendanceDetailLaborType,
  toggleId,
} = useDailyReportSetting()

function getLaborTypesForWorkType(workTypeId: string) {
  return laborTypes.value.filter((lt) => lt.workTypeId === Number(workTypeId))
}

function getWorkTypesForDivision(divisionId: number) {
  return workTypes.value.filter((wt) => wt.divisionId === divisionId)
}

function getMaterialSpecsForType(materialTypeId: number) {
  return materialSpecs.value.filter((ms) => ms.materialTypeId === materialTypeId)
}

function getEquipmentSpecsForType(equipmentTypeId: number) {
  return equipmentSpecs.value.filter((es) => es.equipmentTypeId === equipmentTypeId)
}

function isAllWorkTypesExcluded(sectionKey: 'todayWork' | 'tomorrowWork', divisionId: number) {
  const wtIds = getWorkTypesForDivision(divisionId).map((wt) => wt.id)
  if (wtIds.length === 0) return false
  return wtIds.every((id) => cellRef.excluded[sectionKey].workTypeIds.includes(id))
}

function toggleAllWorkTypes(sectionKey: 'todayWork' | 'tomorrowWork', divisionId: number) {
  const wtIds = getWorkTypesForDivision(divisionId).map((wt) => wt.id)
  if (isAllWorkTypesExcluded(sectionKey, divisionId)) {
    cellRef.excluded[sectionKey].workTypeIds = cellRef.excluded[sectionKey].workTypeIds.filter((id) => !wtIds.includes(id))
  } else {
    const existing = cellRef.excluded[sectionKey].workTypeIds
    cellRef.excluded[sectionKey].workTypeIds = [...new Set([...existing, ...wtIds])]
  }
}

function isAllLaborTypesExcluded(wtId: number) {
  const lts = getLaborTypesForWorkType(String(wtId))
  return lts.length > 0 && lts.every((lt) => cellRef.excluded.attendance.laborTypeIds.includes(lt.id))
}

function toggleAllLaborTypes(wtId: number) {
  const ltIds = getLaborTypesForWorkType(String(wtId)).map((lt) => lt.id)
  if (isAllLaborTypesExcluded(wtId)) {
    cellRef.excluded.attendance.laborTypeIds = cellRef.excluded.attendance.laborTypeIds.filter((id) => !ltIds.includes(id))
  } else {
    cellRef.excluded.attendance.laborTypeIds = [...new Set([...cellRef.excluded.attendance.laborTypeIds, ...ltIds])]
  }
}

function isAllMaterialSpecsExcluded(mtId: number) {
  const specs = getMaterialSpecsForType(mtId)
  return specs.length > 0 && specs.every((s) => cellRef.excluded.material.materialSpecIds.includes(s.id))
}

function toggleAllMaterialSpecs(mtId: number) {
  const specIds = getMaterialSpecsForType(mtId).map((s) => s.id)
  if (isAllMaterialSpecsExcluded(mtId)) {
    cellRef.excluded.material.materialSpecIds = cellRef.excluded.material.materialSpecIds.filter((id) => !specIds.includes(id))
  } else {
    cellRef.excluded.material.materialSpecIds = [...new Set([...cellRef.excluded.material.materialSpecIds, ...specIds])]
  }
}

function isAllEquipmentSpecsExcluded(etId: number) {
  const specs = getEquipmentSpecsForType(etId)
  return specs.length > 0 && specs.every((s) => cellRef.excluded.equipment.equipmentSpecIds.includes(s.id))
}

function toggleAllEquipmentSpecs(etId: number) {
  const specIds = getEquipmentSpecsForType(etId).map((s) => s.id)
  if (isAllEquipmentSpecsExcluded(etId)) {
    cellRef.excluded.equipment.equipmentSpecIds = cellRef.excluded.equipment.equipmentSpecIds.filter((id) => !specIds.includes(id))
  } else {
    cellRef.excluded.equipment.equipmentSpecIds = [...new Set([...cellRef.excluded.equipment.equipmentSpecIds, ...specIds])]
  }
}

function hasDivisionExcludedWorkTypes(sectionKey: 'todayWork' | 'tomorrowWork', divisionId: number) {
  return getWorkTypesForDivision(divisionId).some((wt) => cellRef.excluded[sectionKey].workTypeIds.includes(wt.id))
}

function hasDivisionExcludedLaborTypes(divisionId: number) {
  return getWorkTypesForDivision(divisionId).some((wt) =>
    getLaborTypesForWorkType(String(wt.id)).some((lt) => cellRef.excluded.attendance.laborTypeIds.includes(lt.id)),
  )
}

function hasWorkTypeExcludedLaborTypes(wtId: number) {
  return getLaborTypesForWorkType(String(wtId)).some((lt) => cellRef.excluded.attendance.laborTypeIds.includes(lt.id))
}

function hasMaterialTypeExcludedSpecs(mtId: number) {
  return getMaterialSpecsForType(mtId).some((s) => cellRef.excluded.material.materialSpecIds.includes(s.id))
}

function hasDivisionDetailLaborTypes(divisionId: number) {
  return getWorkTypesForDivision(divisionId).some((wt) =>
    getLaborTypesForWorkType(String(wt.id)).some((lt) => cellRef.attendanceDetail.includes(lt.id)),
  )
}

function hasWorkTypeDetailLaborTypes(wtId: number) {
  return getLaborTypesForWorkType(String(wtId)).some((lt) => cellRef.attendanceDetail.includes(lt.id))
}

function isAllDetailLaborTypes(wtId: number) {
  const lts = getLaborTypesForWorkType(String(wtId))
  return lts.length > 0 && lts.every((lt) => cellRef.attendanceDetail.includes(lt.id))
}

function toggleAllDetailLaborTypes(wtId: number) {
  const ltIds = getLaborTypesForWorkType(String(wtId)).map((lt) => lt.id)
  if (isAllDetailLaborTypes(wtId)) {
    cellRef.attendanceDetail = cellRef.attendanceDetail.filter((id) => !ltIds.includes(id))
  } else {
    cellRef.attendanceDetail = [...new Set([...cellRef.attendanceDetail, ...ltIds])]
  }
}

function hasEquipmentTypeExcludedSpecs(etId: number) {
  return getEquipmentSpecsForType(etId).some((s) => cellRef.excluded.equipment.equipmentSpecIds.includes(s.id))
}

const stickyOpenKeys = reactive(new Set<string>())

watchEffect(() => {
  for (const div of divisions.value) {
    for (const sk of ['todayWork', 'tomorrowWork'] as const) {
      if (hasDivisionExcludedWorkTypes(sk, div.id)) stickyOpenKeys.add(`${sk}-div-${div.id}`)
    }
    if (hasDivisionExcludedLaborTypes(div.id)) stickyOpenKeys.add(`att-div-${div.id}`)
    if (hasDivisionDetailLaborTypes(div.id)) stickyOpenKeys.add(`det-div-${div.id}`)
    for (const wt of getWorkTypesForDivision(div.id)) {
      if (hasWorkTypeExcludedLaborTypes(wt.id)) stickyOpenKeys.add(`att-wt-${wt.id}`)
      if (hasWorkTypeDetailLaborTypes(wt.id)) stickyOpenKeys.add(`det-wt-${wt.id}`)
    }
  }
  for (const mt of materialTypes.value) {
    if (hasMaterialTypeExcludedSpecs(mt.id)) stickyOpenKeys.add(`mat-${mt.id}`)
  }
  for (const et of equipmentTypes.value) {
    if (hasEquipmentTypeExcludedSpecs(et.id)) stickyOpenKeys.add(`eq-${et.id}`)
  }
})

function handleSummaryClick(event: Event, key: string, hasItems: boolean) {
  const details = (event.target as HTMLElement).closest('details')
  if (details?.open) {
    if (hasItems) {
      event.preventDefault()
    } else {
      stickyOpenKeys.delete(key)
    }
  } else {
    stickyOpenKeys.add(key)
  }
}

onMounted(() => {
  load()
})

const templateFileInput = ref<HTMLInputElement | null>(null)
function onTemplateFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    uploadTemplate(file)
    input.value = ''
  }
}

const sectionLabels: Record<string, string> = {
  todayWork: '금일작업',
  tomorrowWork: '익일작업',
  attendance: '출역인원',
  material: '자재입고',
  equipment: '장비투입',
}

const sectionKeys = ['todayWork', 'tomorrowWork', 'attendance', 'material', 'equipment'] as const
</script>

<template>
  <div v-if="isLoading" class="text-sm text-muted-foreground text-center py-8">
    설정 로딩 중...
  </div>

  <div v-else class="space-y-8">
    <!-- 엑셀 템플릿 -->
    <div>
      <h3 class="text-sm font-semibold mb-3">엑셀 템플릿</h3>
      <div class="flex items-center gap-3">
        <span class="text-sm text-muted-foreground">
          {{ dailyReportTemplateUrl ? '템플릿 등록됨' : '템플릿 없음' }}
        </span>
        <input
          ref="templateFileInput"
          type="file"
          accept=".xlsx,.xls"
          class="hidden"
          @change="onTemplateFileChange"
        />
        <Button
          variant="outline"
          size="sm"
          @click="templateFileInput?.click()"
        >
          {{ dailyReportTemplateUrl ? '템플릿 변경' : '템플릿 업로드' }}
        </Button>
      </div>
    </div>

    <Separator />

    <!-- 익일작업 모드 -->
    <div>
      <h3 class="text-sm font-semibold mb-3">익일작업 모드</h3>
      <div class="flex items-center gap-3">
        <Label class="text-xs text-muted-foreground shrink-0">모드</Label>
        <Select
          :model-value="String(cellRef.tomorrowWorkMode)"
          @update:model-value="cellRef.tomorrowWorkMode = Number($event)"
        >
          <SelectTrigger class="h-8 text-sm w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">다음작업일</SelectItem>
            <SelectItem value="2">내일</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <Separator />

    <!-- 셀 매핑 -->
    <div>
      <h3 class="text-sm font-semibold mb-3">셀 매핑</h3>

      <!-- 고정자 -->
      <p class="text-xs text-muted-foreground font-medium mb-2">고정자</p>
      <div class="grid grid-cols-2 gap-3 mb-6">
        <div class="flex items-center gap-2">
          <Label class="text-xs text-muted-foreground w-24 shrink-0">날짜</Label>
          <Input v-model="cellRef.fixed.date" placeholder="예: 0!B2" class="h-8 text-sm" />
        </div>
        <div class="flex items-center gap-2">
          <Label class="text-xs text-muted-foreground w-24 shrink-0">요일</Label>
          <Input v-model="cellRef.fixed.dayOfWeek" placeholder="예: 0!D2" class="h-8 text-sm" />
        </div>
        <div class="flex items-center gap-2">
          <Label class="text-xs text-muted-foreground w-24 shrink-0">날씨</Label>
          <Input v-model="cellRef.fixed.weather" placeholder="예: 0!F2" class="h-8 text-sm" />
        </div>
        <div class="flex items-center gap-2">
          <Label class="text-xs text-muted-foreground w-24 shrink-0">최저기온</Label>
          <Input v-model="cellRef.fixed.minTemperature" placeholder="예: 0!H2" class="h-8 text-sm" />
        </div>
        <div class="flex items-center gap-2">
          <Label class="text-xs text-muted-foreground w-24 shrink-0">최고기온</Label>
          <Input v-model="cellRef.fixed.maxTemperature" placeholder="예: 0!J2" class="h-8 text-sm" />
        </div>
        <div v-if="cellRef.tomorrowWorkMode === 1" class="flex items-center gap-2">
          <Label class="text-xs text-muted-foreground w-24 shrink-0">익일날짜</Label>
          <Input v-model="cellRef.fixed.tomorrowDate" placeholder="예: 0!L2" class="h-8 text-sm" />
        </div>
      </div>

      <Separator class="my-4" />

      <!-- 변동자 섹션들 -->
      <template v-for="sectionKey in sectionKeys" :key="sectionKey">
        <p class="text-xs text-muted-foreground font-medium mb-2">{{ sectionLabels[sectionKey] }}</p>
        <div class="space-y-3 mb-6">
          <div class="flex items-center gap-3">
            <Label class="text-xs text-muted-foreground w-24 shrink-0">시작 셀</Label>
            <Input v-model="cellRef[sectionKey].startCell" placeholder="예: 0!A5" class="h-8 text-sm w-32" />
            <div class="flex items-center gap-1.5">
              <Label class="text-xs text-muted-foreground shrink-0">최대 행 수</Label>
              <Input
                v-model="cellRef[sectionKey].maxRows"
                type="number"
                min="0"
                placeholder="0"
                class="h-8 text-sm w-20"
              />
            </div>
          </div>

          <!-- 컬럼 오프셋 -->
          <p class="text-xs text-muted-foreground mt-2 mb-1">컬럼 오프셋 (비워두면 미사용)</p>
          <div class="grid grid-cols-3 gap-3">
            <div
              v-for="colKey in (sectionColumnKeys[sectionKey] ?? [])"
              :key="colKey"
              class="flex flex-col gap-1"
            >
              <Label class="text-xs text-muted-foreground">{{ (sectionColumnLabels[sectionKey] ?? {})[colKey] }} ({{ colKey }})</Label>
              <Input
                v-model="cellRef[sectionKey].columns[colKey]"
                placeholder="미사용"
                type="number"
                class="h-8 text-sm"
              />
            </div>
          </div>

          <!-- 오버플로우 -->
          <p class="text-xs text-muted-foreground mt-2 mb-1">오버플로우</p>
          <div class="space-y-2 mb-2">
            <div
              v-for="(ov, ovIdx) in cellRef[sectionKey].overflow"
              :key="ovIdx"
              class="flex items-center gap-2"
            >
              <Input v-model="ov.startCell" placeholder="시작 셀 (예: 1!A5)" class="h-8 text-sm w-32" />
              <div class="flex items-center gap-1.5">
                <Label class="text-xs text-muted-foreground shrink-0">최대 행 수</Label>
                <Input v-model="ov.maxRows" type="number" min="0" placeholder="0" class="h-8 text-sm w-20" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                class="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                @click="removeOverflow(sectionKey, ovIdx)"
              >
                <X class="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" @click="addOverflow(sectionKey)">+ 오버플로우 추가</Button>
          </div>

          <!-- 제외 항목 -->
          <p class="text-xs text-muted-foreground mt-3 mb-1">제외 항목</p>
          <div class="space-y-1 pl-1">
            <!-- 공종 제외 (todayWork, tomorrowWork) — Division → WorkType 계층 -->
            <template v-if="sectionKey === 'todayWork' || sectionKey === 'tomorrowWork'">
              <p class="text-xs text-muted-foreground mb-1">제외 공종</p>
              <details
                v-for="div in divisions"
                :key="div.id"
                :open="stickyOpenKeys.has(`${sectionKey}-div-${div.id}`) || undefined"
                class="border rounded px-2 py-1 mb-1"
              >
                <summary
                  class="text-xs font-medium cursor-pointer select-none"
                  @click="handleSummaryClick($event, `${sectionKey}-div-${div.id}`, hasDivisionExcludedWorkTypes(sectionKey, div.id))"
                >{{ div.name }}</summary>
                <div class="flex flex-wrap gap-3 pl-3 py-1.5">
                  <label class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Checkbox
                      :model-value="isAllWorkTypesExcluded(sectionKey, div.id)"
                      @update:model-value="toggleAllWorkTypes(sectionKey, div.id)"
                    />
                    모든 공종
                  </label>
                  <label
                    v-for="wt in getWorkTypesForDivision(div.id)"
                    :key="wt.id"
                    class="flex items-center gap-1.5 text-xs"
                  >
                    <Checkbox
                      :model-value="cellRef.excluded[sectionKey].workTypeIds.includes(wt.id)"
                      @update:model-value="cellRef.excluded[sectionKey].workTypeIds = toggleId(cellRef.excluded[sectionKey].workTypeIds, wt.id)"
                    />
                    {{ wt.name }}
                  </label>
                </div>
              </details>
            </template>

            <!-- 제외 직종 (attendance) — Division → WorkType → LaborType 계층 -->
            <template v-if="sectionKey === 'attendance'">
              <p class="text-xs text-muted-foreground mb-1">제외 직종</p>
              <details
                v-for="div in divisions"
                :key="div.id"
                :open="stickyOpenKeys.has(`att-div-${div.id}`) || undefined"
                class="border rounded px-2 py-1 mb-1"
              >
                <summary
                  class="text-xs font-medium cursor-pointer select-none"
                  @click="handleSummaryClick($event, `att-div-${div.id}`, hasDivisionExcludedLaborTypes(div.id))"
                >{{ div.name }}</summary>
                <div class="pl-3 py-1.5 space-y-1">
                  <details
                    v-for="wt in getWorkTypesForDivision(div.id)"
                    :key="wt.id"
                    :open="stickyOpenKeys.has(`att-wt-${wt.id}`) || undefined"
                    class="border rounded px-2 py-1"
                  >
                    <summary
                      class="text-xs font-medium cursor-pointer select-none"
                      @click="handleSummaryClick($event, `att-wt-${wt.id}`, hasWorkTypeExcludedLaborTypes(wt.id))"
                    >{{ wt.name }}</summary>
                    <div class="flex flex-wrap gap-3 pl-3 py-1.5">
                      <label class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Checkbox
                          :model-value="isAllLaborTypesExcluded(wt.id)"
                          @update:model-value="toggleAllLaborTypes(wt.id)"
                        />
                        모든 직종
                      </label>
                      <label
                        v-for="lt in getLaborTypesForWorkType(String(wt.id))"
                        :key="lt.id"
                        class="flex items-center gap-1.5 text-xs"
                      >
                        <Checkbox
                          :model-value="cellRef.excluded.attendance.laborTypeIds.includes(lt.id)"
                          @update:model-value="cellRef.excluded.attendance.laborTypeIds = toggleId(cellRef.excluded.attendance.laborTypeIds, lt.id)"
                        />
                        {{ lt.name }}
                      </label>
                      <span v-if="getLaborTypesForWorkType(String(wt.id)).length === 0" class="text-xs text-muted-foreground">직종 없음</span>
                    </div>
                  </details>
                </div>
              </details>
            </template>

            <!-- 자재 제외 (material) — MaterialType → MaterialSpec 계층 -->
            <template v-if="sectionKey === 'material'">
              <p class="text-xs text-muted-foreground mb-1">제외 자재</p>
              <details
                v-for="mt in materialTypes"
                :key="mt.id"
                :open="stickyOpenKeys.has(`mat-${mt.id}`) || undefined"
                class="border rounded px-2 py-1 mb-1"
              >
                <summary
                  class="text-xs font-medium cursor-pointer select-none"
                  @click="handleSummaryClick($event, `mat-${mt.id}`, hasMaterialTypeExcludedSpecs(mt.id))"
                >{{ mt.name }}</summary>
                <div class="flex flex-wrap gap-3 pl-3 py-1.5">
                  <label class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Checkbox
                      :model-value="isAllMaterialSpecsExcluded(mt.id)"
                      @update:model-value="toggleAllMaterialSpecs(mt.id)"
                    />
                    모든 규격
                  </label>
                  <label
                    v-for="ms in getMaterialSpecsForType(mt.id)"
                    :key="ms.id"
                    class="flex items-center gap-1.5 text-xs"
                  >
                    <Checkbox
                      :model-value="cellRef.excluded.material.materialSpecIds.includes(ms.id)"
                      @update:model-value="cellRef.excluded.material.materialSpecIds = toggleId(cellRef.excluded.material.materialSpecIds, ms.id)"
                    />
                    {{ ms.name }}
                  </label>
                  <span v-if="getMaterialSpecsForType(mt.id).length === 0" class="text-xs text-muted-foreground">규격 없음</span>
                </div>
              </details>
            </template>

            <!-- 장비 제외 (equipment) — EquipmentType → EquipmentSpec 계층 -->
            <template v-if="sectionKey === 'equipment'">
              <p class="text-xs text-muted-foreground mb-1">제외 장비</p>
              <details
                v-for="et in equipmentTypes"
                :key="et.id"
                :open="stickyOpenKeys.has(`eq-${et.id}`) || undefined"
                class="border rounded px-2 py-1 mb-1"
              >
                <summary
                  class="text-xs font-medium cursor-pointer select-none"
                  @click="handleSummaryClick($event, `eq-${et.id}`, hasEquipmentTypeExcludedSpecs(et.id))"
                >{{ et.name }}</summary>
                <div class="flex flex-wrap gap-3 pl-3 py-1.5">
                  <label class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Checkbox
                      :model-value="isAllEquipmentSpecsExcluded(et.id)"
                      @update:model-value="toggleAllEquipmentSpecs(et.id)"
                    />
                    모든 규격
                  </label>
                  <label
                    v-for="es in getEquipmentSpecsForType(et.id)"
                    :key="es.id"
                    class="flex items-center gap-1.5 text-xs"
                  >
                    <Checkbox
                      :model-value="cellRef.excluded.equipment.equipmentSpecIds.includes(es.id)"
                      @update:model-value="cellRef.excluded.equipment.equipmentSpecIds = toggleId(cellRef.excluded.equipment.equipmentSpecIds, es.id)"
                    />
                    {{ es.name }}
                  </label>
                  <span v-if="getEquipmentSpecsForType(et.id).length === 0" class="text-xs text-muted-foreground">규격 없음</span>
                </div>
              </details>
            </template>
          </div>

          <!-- 출역 상세 (attendance only) -->
          <template v-if="sectionKey === 'attendance'">
            <p class="text-xs text-muted-foreground mt-3 mb-1">출역 상세 (개별행 표시할 직종)</p>
            <p class="text-xs text-muted-foreground mb-2">선택된 직종은 개별 행으로, 나머지는 공종별 합산 행으로 표시됩니다.</p>
            <div class="space-y-1 pl-1">
              <details
                v-for="div in divisions"
                :key="div.id"
                :open="stickyOpenKeys.has(`det-div-${div.id}`) || undefined"
                class="border rounded px-2 py-1 mb-1"
              >
                <summary
                  class="text-xs font-medium cursor-pointer select-none"
                  @click="handleSummaryClick($event, `det-div-${div.id}`, hasDivisionDetailLaborTypes(div.id))"
                >{{ div.name }}</summary>
                <div class="pl-3 py-1.5 space-y-1">
                  <details
                    v-for="wt in getWorkTypesForDivision(div.id)"
                    :key="wt.id"
                    :open="stickyOpenKeys.has(`det-wt-${wt.id}`) || undefined"
                    class="border rounded px-2 py-1"
                  >
                    <summary
                      class="text-xs font-medium cursor-pointer select-none"
                      @click="handleSummaryClick($event, `det-wt-${wt.id}`, hasWorkTypeDetailLaborTypes(wt.id))"
                    >{{ wt.name }}</summary>
                    <div class="flex flex-wrap gap-3 pl-3 py-1.5">
                      <label class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Checkbox
                          :model-value="isAllDetailLaborTypes(wt.id)"
                          @update:model-value="toggleAllDetailLaborTypes(wt.id)"
                        />
                        모든 직종
                      </label>
                      <label
                        v-for="lt in getLaborTypesForWorkType(String(wt.id))"
                        :key="lt.id"
                        class="flex items-center gap-1.5 text-xs"
                      >
                        <Checkbox
                          :model-value="cellRef.attendanceDetail.includes(lt.id)"
                          @update:model-value="toggleAttendanceDetailLaborType(lt.id)"
                        />
                        {{ lt.name }}
                      </label>
                      <span v-if="getLaborTypesForWorkType(String(wt.id)).length === 0" class="text-xs text-muted-foreground">
                        직종 없음
                      </span>
                    </div>
                  </details>
                </div>
              </details>
            </div>
          </template>
        </div>

        <Separator class="my-4" />
      </template>

      <!-- 사진 -->
      <p class="text-xs text-muted-foreground font-medium mb-2">작업사진</p>
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <Label class="text-xs text-muted-foreground w-24 shrink-0">셀 목록</Label>
          <Input v-model="cellRef.photos.work.cells" placeholder="예: 1!A10, 1!A15, 1!A20" class="h-8 text-sm flex-1" />
        </div>
        <div class="flex items-center gap-2">
          <Label class="text-xs text-muted-foreground w-24 shrink-0">설명 오프셋</Label>
          <div class="flex items-center gap-1">
            <Label class="text-xs text-muted-foreground shrink-0">Row</Label>
            <Input v-model="cellRef.photos.work.descriptionOffsetRow" placeholder="0" type="number" class="h-8 text-sm w-16" />
          </div>
          <div class="flex items-center gap-1">
            <Label class="text-xs text-muted-foreground shrink-0">Col</Label>
            <Input v-model="cellRef.photos.work.descriptionOffsetCol" placeholder="0" type="number" class="h-8 text-sm w-16" />
          </div>
        </div>
      </div>
    </div>

    <!-- 저장 버튼 -->
    <div class="flex justify-end pt-4">
      <Button :disabled="isSaving" @click="save">
        {{ isSaving ? '저장 중...' : '저장' }}
      </Button>
    </div>
  </div>
</template>
