<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Checkbox } from '@/shared/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import ReferenceEditTrigger from '@/shared/helper-ui/ReferenceEditTrigger.vue'
import { referenceApi, type MaterialTypeResponse, type IdNameResponse } from '@/shared/network-core/apis/reference'
import { materialOrderApi } from '@/features/material/infra/material-order-api'
import { validateDirectMaterialDeliveryInput } from '@/features/material/model/material-order-rules'
import { analyticsClient } from '@/shared/analytics/analyticsClient'

const props = defineProps<{
  open: boolean
  defaultMaterialTypeId?: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'submitted', deliveryId: number): void
}>()

const isSaving = ref(false)
const selectedMaterialTypeId = ref('')
const deliveryNotes = ref<File[]>([])
const deliveryPhotos = ref<File[]>([])
const materialTypes = ref<MaterialTypeResponse[]>([])
const zones = ref<IdNameResponse[]>([])
const floors = ref<IdNameResponse[]>([])
const selectedZoneIds = ref<number[]>([])
const selectedFloorIds = ref<number[]>([])
const componentDivisions = ref<IdNameResponse[]>([])
const componentTypes = ref<IdNameResponse[]>([])
const selectedComponentDivisionId = ref('')
const selectedComponentTypeIds = ref<number[]>([])
const isLoadingComponentTypes = ref(false)

function toggleId(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((v) => v !== id) : [...list, id]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleComponentDivisionChange(divisionId: any) {
  selectedComponentDivisionId.value = String(divisionId ?? '')
  selectedComponentTypeIds.value = []
  componentTypes.value = []
  if (!divisionId) return
  isLoadingComponentTypes.value = true
  try {
    componentTypes.value = await referenceApi.getComponentTypeList(Number(divisionId))
  } catch {
    componentTypes.value = []
  } finally {
    isLoadingComponentTypes.value = false
  }
}

async function reloadMaterialTypes() {
  try {
    materialTypes.value = await referenceApi.getMaterialTypeList()
  } catch (error: unknown) {
    console.error('자재유형 새로고침 실패:', error)
  }
}

async function reloadZones() {
  try {
    zones.value = await referenceApi.getZoneList()
  } catch (error: unknown) {
    console.error('존 새로고침 실패:', error)
  }
}

async function reloadFloors() {
  try {
    floors.value = await referenceApi.getFloorList()
  } catch (error: unknown) {
    console.error('층 새로고침 실패:', error)
  }
}

watch(() => props.open, async (opened) => {
  if (opened) {
    deliveryNotes.value = []
    deliveryPhotos.value = []
    selectedMaterialTypeId.value = props.defaultMaterialTypeId ?? ''
    selectedZoneIds.value = []
    selectedFloorIds.value = []
    selectedComponentDivisionId.value = ''
    selectedComponentTypeIds.value = []
    componentTypes.value = []

    try {
      const [mtList, zoneList, floorList, compDivList] = await Promise.all([
        referenceApi.getMaterialTypeList(),
        referenceApi.getZoneList(),
        referenceApi.getFloorList(),
        referenceApi.getComponentDivisionList(),
      ])
      materialTypes.value = mtList
      zones.value = zoneList
      floors.value = floorList
      componentDivisions.value = compDivList
    } catch (error: unknown) {
      console.error('기초 데이터 로드 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    }
  }
})

const notePreviewUrls = ref<string[]>([])
const photoPreviewUrls = ref<string[]>([])

function buildPreviewUrls(files: File[]): string[] {
  return files.filter((f) => f.type.startsWith('image/')).map((f) => URL.createObjectURL(f))
}

function revokeUrls(urls: string[]) {
  urls.forEach((u) => URL.revokeObjectURL(u))
}

watch(deliveryNotes, (files, _, onCleanup) => {
  const urls = buildPreviewUrls(files)
  notePreviewUrls.value = urls
  onCleanup(() => revokeUrls(urls))
})

watch(deliveryPhotos, (files, _, onCleanup) => {
  const urls = buildPreviewUrls(files)
  photoPreviewUrls.value = urls
  onCleanup(() => revokeUrls(urls))
})

onUnmounted(() => {
  revokeUrls(notePreviewUrls.value)
  revokeUrls(photoPreviewUrls.value)
})

function onNotesChange(event: Event) {
  const input = event.target as HTMLInputElement
  deliveryNotes.value = input.files ? Array.from(input.files) : []
}

function onPhotosChange(event: Event) {
  const input = event.target as HTMLInputElement
  deliveryPhotos.value = input.files ? Array.from(input.files) : []
}

async function handleSave() {
  const validationError = validateDirectMaterialDeliveryInput({
    materialTypeId: selectedMaterialTypeId.value,
  })
  if (validationError) {
    alert(validationError)
    return
  }

  isSaving.value = true
  try {
    const result = await materialOrderApi.createMaterialDelivery({
      materialTypeId: Number(selectedMaterialTypeId.value),
      deliveryNotes: deliveryNotes.value,
      deliveryPhotos: deliveryPhotos.value,
      zoneIds: selectedZoneIds.value,
      floorIds: selectedFloorIds.value,
      componentTypeIds: selectedComponentTypeIds.value,
    })
    analyticsClient.trackAction('material_delivery', 'create_delivery', 'success')
    emit('update:open', false)
    emit('submitted', result.deliveryId)
  } catch (error: unknown) {
    console.error('송장입력 실패:', error)
    analyticsClient.trackAction('material_delivery', 'create_delivery', 'fail')
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent class="sm:max-w-[520px]">
      <DialogHeader>
        <DialogTitle>발주서없이 반입자재 생성</DialogTitle>
      </DialogHeader>

      <div class="space-y-5 py-2">
        <!-- 자재유형 -->
        <div class="space-y-2">
          <Label>자재유형</Label>
          <div class="flex items-center gap-1">
            <Select v-model="selectedMaterialTypeId" class="flex-1">
              <SelectTrigger>
                <SelectValue placeholder="자재유형 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="mt in materialTypes"
                  :key="mt.id"
                  :value="String(mt.id)"
                >
                  {{ mt.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <ReferenceEditTrigger type="material" @refresh="reloadMaterialTypes" />
          </div>
        </div>

        <!-- 송장파일 -->
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <Label>송장파일</Label>
            <span class="text-xs text-muted-foreground">미입력 가능, 다시 눌러서 사진 재선택</span>
          </div>
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg"
            class="block w-full text-sm text-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-input file:bg-muted file:text-sm file:font-medium hover:file:bg-muted/80 cursor-pointer"
            @change="onNotesChange"
          />
          <div v-if="notePreviewUrls.length > 0" class="flex flex-wrap gap-2 mt-1">
            <div v-for="(url, i) in notePreviewUrls" :key="i" class="w-[120px] h-[120px] rounded border border-border overflow-hidden">
              <img :src="url" class="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        <!-- 반입사진 -->
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <Label>반입사진</Label>
            <span class="text-xs text-muted-foreground">미입력 가능, 다시 눌러서 사진 재선택</span>
          </div>
          <input
            type="file"
            multiple
            accept="image/*"
            class="block w-full text-sm text-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-input file:bg-muted file:text-sm file:font-medium hover:file:bg-muted/80 cursor-pointer"
            @change="onPhotosChange"
          />
          <div v-if="photoPreviewUrls.length > 0" class="flex flex-wrap gap-2 mt-1">
            <div v-for="(url, i) in photoPreviewUrls" :key="i" class="w-[120px] h-[120px] rounded border border-border overflow-hidden">
              <img :src="url" class="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        <!-- 위치정보 -->
        <div v-if="zones.length > 0" class="space-y-2">
          <div class="flex items-center gap-1">
            <Label>존</Label>
            <ReferenceEditTrigger type="zone" @refresh="reloadZones" />
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="zone in zones" :key="zone.id"
              class="px-3 py-1 text-sm rounded-md border transition-colors"
              :class="selectedZoneIds.includes(zone.id) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-background border-border text-foreground hover:bg-muted'"
              @click="selectedZoneIds = toggleId(selectedZoneIds, zone.id)"
            >
              {{ zone.name }}
            </button>
          </div>
        </div>

        <div v-if="floors.length > 0" class="space-y-2">
          <div class="flex items-center gap-1">
            <Label>층</Label>
            <ReferenceEditTrigger type="floor" @refresh="reloadFloors" />
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="floor in floors" :key="floor.id"
              class="px-3 py-1 text-sm rounded-md border transition-colors"
              :class="selectedFloorIds.includes(floor.id) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-background border-border text-foreground hover:bg-muted'"
              @click="selectedFloorIds = toggleId(selectedFloorIds, floor.id)"
            >
              {{ floor.name }}
            </button>
          </div>
        </div>

        <!-- 부재 -->
        <div v-if="componentDivisions.length > 0" class="space-y-2">
          <div class="flex items-center gap-1">
            <Label>부재</Label>
            <ReferenceEditTrigger type="component" @refresh="async () => { componentDivisions = await referenceApi.getComponentDivisionList() }" />
          </div>
          <Select
            :model-value="selectedComponentDivisionId"
            @update:model-value="handleComponentDivisionChange"
          >
            <SelectTrigger>
              <SelectValue placeholder="부재 분류 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="div in componentDivisions"
                :key="div.id"
                :value="String(div.id)"
              >
                {{ div.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          <div v-if="componentTypes.length > 0" class="flex flex-wrap gap-1.5">
            <button
              v-for="ct in componentTypes" :key="ct.id"
              class="px-3 py-1 text-sm rounded-md border transition-colors"
              :class="selectedComponentTypeIds.includes(ct.id) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-background border-border text-foreground hover:bg-muted'"
              @click="selectedComponentTypeIds = toggleId(selectedComponentTypeIds, ct.id)"
            >
              {{ ct.name }}
            </button>
          </div>
          <p v-else-if="isLoadingComponentTypes" class="text-xs text-muted-foreground">로딩 중...</p>
        </div>
      </div>

      <DialogFooter class="flex-col items-end gap-2">
        <div class="flex gap-2">
          <Button variant="outline" @click="emit('update:open', false)">취소</Button>
          <Button :disabled="isSaving" @click="handleSave">
            {{ isSaving ? '저장 중...' : '저장' }}
          </Button>
        </div>
        <p v-if="isSaving" class="text-sm text-muted-foreground">
          시간이 좀 걸립니다. 기다려주세요.
        </p>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
