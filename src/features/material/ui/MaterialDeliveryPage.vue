<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
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
import { Checkbox } from '@/shared/ui/checkbox'
import { Label } from '@/shared/ui/label'
import { Input } from '@/shared/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
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
import { X, RotateCcw, Crop } from 'lucide-vue-next'
import { DateRangeFilter } from '@/shared/ui/date-range-picker'
import { dateRangeToStrings, toCalendarDate } from '@/shared/utils/date-convert'
import { useCalendarStore } from '@/app/context/stores/calendarStore'
import { today, getLocalTimeZone } from '@internationalized/date'
import ReferenceEditTrigger from '@/shared/helper-ui/ReferenceEditTrigger.vue'
// import MaterialDeliveryCreateDialog from '@/features/material/ui/components/MaterialDeliveryCreateDialog.vue'
import { materialOrderApi } from '@/features/material/infra/material-order-api'
import type {
  DeliveryLineResponse,
  MaterialDeliveryDetail,
  MaterialDeliverySummary,
} from '@/features/material/model/material-order-types'
import { useMaterialOrder } from '@/features/material/view-model/useMaterialOrder'
import {
  createMaterialInspectionRequest,
  deleteMaterialInspectionRequest,
  getMaterialInspectionRequests,
  validateMaterialInspectionRequest,
  materialInspectionRequestRepository,
  type MaterialInspectionRequestResponse,
  type ValidateMirResponse,
} from '@/features/document/public'
import { referenceApi } from '@/shared/network-core/apis/reference'
import type {
  MaterialSpecResponse,
  MaterialTypeResponse,
  IdNameResponse,
  WorkTypeResponse,
} from '@/shared/network-core/apis/reference'
import { analyticsClient } from '@/shared/analytics/analyticsClient'
import { rotateImageFile } from '@/shared/utils/rotateImage'
import { cropImageFile } from '@/shared/utils/cropImage'

const router = useRouter()
const { orders, loadOrders } = useMaterialOrder()
const calendarStore = useCalendarStore()
const calendarMinDate = computed(() =>
  calendarStore.calendarData?.projectStartDate ? toCalendarDate(calendarStore.calendarData.projectStartDate) : undefined,
)
const calendarMaxDate = computed(() =>
  calendarStore.calendarData?.projectEndDate ? toCalendarDate(calendarStore.calendarData.projectEndDate) : undefined,
)

// // 발주서 없이 송장입력 다이얼로그 상태
// const directDeliveryDialogOpen = ref(false)


// 삭제 다이얼로그 상태
const showDeleteDialog = ref(false)
const deleteTargetId = ref<number | null>(null)
const deleteTargetName = ref('')
const isDeletingDelivery = ref(false)

// 필터 상태
const filterMaterialTypeId = ref<string>('__all__')
const todayDate = today(getLocalTimeZone())
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const filterDateRange = ref<any>({ start: undefined, end: undefined })
const filterMaterialTypes = ref<MaterialTypeResponse[]>([])

// 반입자재 상태
const deliveries = ref<MaterialDeliverySummary[]>([])
const isLoadingDeliveries = ref(false)

// 필터 적용된 목록
const filteredDeliveries = computed(() => {
  let list = deliveries.value
  if (filterMaterialTypeId.value && filterMaterialTypeId.value !== '__all__') {
    const typeName = filterMaterialTypes.value.find(t => String(t.id) === filterMaterialTypeId.value)?.name
    list = list.filter((d) => d.materialTypeName === typeName)
  }
  const range = dateRangeToStrings(filterDateRange.value)
  if (range.start && range.end) {
    list = list.filter((d) => d.deliveryDate >= range.start! && d.deliveryDate <= range.end!)
  } else if (range.start) {
    list = list.filter((d) => d.deliveryDate === range.start!)
  }
  return list
})

// 반입자재 펼치기/접기 + 인라인 수정 상태
const expandedDeliveries = reactive<Record<number, boolean>>({})
const deliveryLinesMap = ref<Record<number, DeliveryLineResponse[]>>({})
const deliveryDetailMap = ref<Record<number, MaterialDeliveryDetail>>({})
const deliveryEditState = ref<Record<number, {
  supplier: string
  deliveryDate: string
  divisionId: string
  workTypeId: string
  selectedZoneIds: number[]
  selectedFloorIds: number[]
  selectedComponentTypeIds: number[]
  noteDescriptions: { noteId: number; description: string }[]
  photoDescriptions: { photoId: number; description: string }[]
}>>({})
const isLoadingLines = ref<Record<number, boolean>>({})
const isUpdatingDelivery = ref<Record<number, boolean>>({})
// 라인 삭제 추적
const deletedLineIds = ref<Record<number, number[]>>({})
// 파일 삭제/추가 추적
const deletedNoteIds = ref<Record<number, number[]>>({})
const deletedPhotoIds = ref<Record<number, number[]>>({})
const newDeliveryPhotos = ref<Record<number, File[]>>({})
const editDivisions = ref<IdNameResponse[]>([])
const editWorkTypes = ref<WorkTypeResponse[]>([])
const isLoadingEditWorkTypes = ref(false)
const editZones = ref<IdNameResponse[]>([])
const editFloors = ref<IdNameResponse[]>([])
const editComponentDivisions = ref<IdNameResponse[]>([])
const editComponentTypes = ref<IdNameResponse[]>([])
const isLoadingEditComponentTypes = ref(false)
const selectedEditComponentDivisionId = ref('')

function toggleId(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((v) => v !== id) : [...list, id]
}
const materialSpecs = ref<MaterialSpecResponse[]>([])
const currentMaterialTypeId = ref<number | null>(null)

async function reloadMaterialSpecs() {
  if (currentMaterialTypeId.value == null) return
  try {
    materialSpecs.value = await referenceApi.getMaterialSpecList(currentMaterialTypeId.value)
  } catch {
    materialSpecs.value = []
  }
}

// 인라인 이미지 뷰어 (per-delivery)
const deliveryImageUrls = ref<Record<number, string[]>>({})
const deliveryImageIndex = ref<Record<number, number>>({})
const isLoadingDeliveryImages = ref<Record<number, boolean>>({})
const deliveryImageScale = ref<Record<number, number>>({})
const deliveryImageTranslate = reactive<Record<number, { x: number; y: number }>>({})
const deliveryImageDragging = ref<Record<number, boolean>>({})
const deliveryDragStart = reactive<Record<number, { x: number; y: number }>>({})
const deliveryTranslateStart = reactive<Record<number, { x: number; y: number }>>({})

// 이미지 편집 상태 (회전/크롭)
const deliveryImageRotation = ref<Record<string, number>>({}) // key: `${deliveryId}-${imgIdx}`
const deliveryImageCropMode = ref<Record<number, boolean>>({})
const deliveryImageCropRect = reactive<Record<number, { startX: number; startY: number; endX: number; endY: number } | null>>({})
const isCropDragging = ref<Record<number, boolean>>({})
const deliveryImageRefs = ref<Record<number, HTMLImageElement | null>>({})
const deliveryImageContainerRefs = ref<Record<number, HTMLElement | null>>({})

function imageEditKey(deliveryId: number) {
  const idx = deliveryImageIndex.value[deliveryId] ?? 0
  return `${deliveryId}-${idx}`
}

function hasImageEdits(deliveryId: number): boolean {
  const key = imageEditKey(deliveryId)
  const rotation = deliveryImageRotation.value[key] ?? 0
  const cropRect = deliveryImageCropRect[deliveryId]
  return rotation !== 0 || cropRect != null
}

function rotateImage(deliveryId: number, direction: 'cw' | 'ccw') {
  const key = imageEditKey(deliveryId)
  const current = deliveryImageRotation.value[key] ?? 0
  const delta = direction === 'cw' ? 90 : -90
  deliveryImageRotation.value[key] = ((current + delta) % 360 + 360) % 360
}

function toggleCropMode(deliveryId: number) {
  const active = deliveryImageCropMode.value[deliveryId]
  if (active) {
    deliveryImageCropMode.value[deliveryId] = false
    deliveryImageCropRect[deliveryId] = null
  } else {
    deliveryImageCropMode.value[deliveryId] = true
    deliveryImageCropRect[deliveryId] = null
    // 크롭 모드에서는 zoom/pan 초기화
    resetDeliveryImageTransform(deliveryId)
  }
}

function onCropPointerDown(deliveryId: number, e: PointerEvent) {
  const container = deliveryImageContainerRefs.value[deliveryId]
  if (!container) return
  const rect = container.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  deliveryImageCropRect[deliveryId] = { startX: x, startY: y, endX: x, endY: y }
  isCropDragging.value[deliveryId] = true
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}

function onCropPointerMove(deliveryId: number, e: PointerEvent) {
  if (!isCropDragging.value[deliveryId]) return
  const container = deliveryImageContainerRefs.value[deliveryId]
  if (!container) return
  const rect = container.getBoundingClientRect()
  const crop = deliveryImageCropRect[deliveryId]
  if (!crop) return
  crop.endX = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  crop.endY = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
}

function onCropPointerUp(deliveryId: number) {
  isCropDragging.value[deliveryId] = false
  // 너무 작은 크롭 영역은 무시
  const crop = deliveryImageCropRect[deliveryId]
  if (crop) {
    const w = Math.abs(crop.endX - crop.startX)
    const h = Math.abs(crop.endY - crop.startY)
    if (w < 10 || h < 10) {
      deliveryImageCropRect[deliveryId] = null
    }
  }
}

function getCropStyle(deliveryId: number) {
  const crop = deliveryImageCropRect[deliveryId]
  if (!crop) return {}
  const left = Math.min(crop.startX, crop.endX)
  const top = Math.min(crop.startY, crop.endY)
  const width = Math.abs(crop.endX - crop.startX)
  const height = Math.abs(crop.endY - crop.startY)
  return { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` }
}

function screenToImageCropRect(
  deliveryId: number,
): { x: number; y: number; width: number; height: number } | null {
  const crop = deliveryImageCropRect[deliveryId]
  const imgEl = deliveryImageRefs.value[deliveryId]
  const container = deliveryImageContainerRefs.value[deliveryId]
  if (!crop || !imgEl || !container) return null

  const natW = imgEl.naturalWidth
  const natH = imgEl.naturalHeight
  const containerRect = container.getBoundingClientRect()
  const cW = containerRect.width
  const cH = containerRect.height

  // object-contain 렌더링 영역 계산
  const imgAspect = natW / natH
  const containerAspect = cW / cH
  let renderedW: number, renderedH: number, offsetX: number, offsetY: number
  if (imgAspect > containerAspect) {
    renderedW = cW
    renderedH = cW / imgAspect
    offsetX = 0
    offsetY = (cH - renderedH) / 2
  } else {
    renderedH = cH
    renderedW = cH * imgAspect
    offsetX = (cW - renderedW) / 2
    offsetY = 0
  }

  const left = Math.min(crop.startX, crop.endX)
  const top = Math.min(crop.startY, crop.endY)
  const width = Math.abs(crop.endX - crop.startX)
  const height = Math.abs(crop.endY - crop.startY)

  // 스크린 좌표 → 이미지 좌표
  const scale = natW / renderedW
  const imgX = Math.max(0, (left - offsetX) * scale)
  const imgY = Math.max(0, (top - offsetY) * scale)
  const imgW = Math.min(natW - imgX, width * scale)
  const imgH = Math.min(natH - imgY, height * scale)

  if (imgW <= 0 || imgH <= 0) return null
  return { x: Math.round(imgX), y: Math.round(imgY), width: Math.round(imgW), height: Math.round(imgH) }
}

/** 모든 이미지의 회전/크롭 편집을 수집. 기존 파일은 replace 데이터로, 새 파일은 직접 편집 적용. */
async function collectImageEdits(deliveryId: number) {
  const id = deliveryId
  const detail = deliveryDetailMap.value[id]
  if (!detail) return { replaceNotes: [], replacePhotos: [], replaceNoteFiles: [] as File[], replacePhotoFiles: [] as File[] }
  const noteLen = detail.noteFiles.length
  const photoLen = detail.photoFiles.length
  const existingLen = noteLen + photoLen
  const addedNotes = newDeliveryNotes.value[id] ?? []
  const addedPhotos = newDeliveryPhotos.value[id] ?? []
  const urls = deliveryImageUrls.value[id] ?? []

  const replaceNotes: { noteId: number; fileIndex: number }[] = []
  const replacePhotos: { photoId: number; fileIndex: number }[] = []
  const replaceNoteFiles: File[] = []
  const replacePhotoFiles: File[] = []

  async function applyEdits(imgIdx: number, sourceFile: File | null) {
    const key = `${id}-${imgIdx}`
    const rotation = deliveryImageRotation.value[key] ?? 0
    const cropRect = imgIdx === (deliveryImageIndex.value[id] ?? 0) ? screenToImageCropRect(id) : null
    if (rotation === 0 && !cropRect) return null

    let file: File
    if (sourceFile) {
      file = sourceFile
    } else {
      const response = await fetch(urls[imgIdx])
      const blob = await response.blob()
      file = new File([blob], 'image.jpg', { type: blob.type || 'image/jpeg' })
    }
    if (rotation !== 0) {
      file = await rotateImageFile(file, rotation as 90 | 180 | 270)
    }
    if (cropRect) {
      file = await cropImageFile(file, cropRect)
    }
    return file
  }

  for (let imgIdx = 0; imgIdx < urls.length; imgIdx++) {
    if (imgIdx < noteLen) {
      // 기존 송장
      const edited = await applyEdits(imgIdx, null)
      if (edited) {
        const noteFile = detail.noteFiles[imgIdx]
        if (noteFile.noteId) {
          replaceNotes.push({ noteId: noteFile.noteId, fileIndex: replaceNoteFiles.length })
          replaceNoteFiles.push(edited)
        }
      }
    } else if (imgIdx < existingLen) {
      // 기존 사진
      const edited = await applyEdits(imgIdx, null)
      if (edited) {
        const photoFile = detail.photoFiles[imgIdx - noteLen]
        if (photoFile.photoId) {
          replacePhotos.push({ photoId: photoFile.photoId, fileIndex: replacePhotoFiles.length })
          replacePhotoFiles.push(edited)
        }
      }
    } else if (imgIdx < existingLen + addedNotes.length) {
      // 새로 추가한 송장
      const addedIdx = imgIdx - existingLen
      const edited = await applyEdits(imgIdx, addedNotes[addedIdx])
      if (edited) {
        addedNotes[addedIdx] = edited
      }
    } else {
      // 새로 추가한 사진
      const addedIdx = imgIdx - existingLen - addedNotes.length
      const edited = await applyEdits(imgIdx, addedPhotos[addedIdx])
      if (edited) {
        addedPhotos[addedIdx] = edited
      }
    }
  }

  // 편집된 새 파일을 반영
  if (addedNotes.length > 0) newDeliveryNotes.value[id] = [...addedNotes]
  if (addedPhotos.length > 0) newDeliveryPhotos.value[id] = [...addedPhotos]

  return { replaceNotes, replacePhotos, replaceNoteFiles, replacePhotoFiles }
}

// 자재반입검수요청서 상태
const mirList = ref<MaterialInspectionRequestResponse[]>([])
const mirDeliveryIds = computed(() => new Set(mirList.value.map((m) => m.materialDeliveryId)))
const isGeneratingMir = ref<Record<number, boolean>>({})

// MIR 삭제 다이얼로그
const showMirDeleteDialog = ref(false)
const mirDeleteTargetId = ref<number | null>(null)
const mirDeleteTargetName = ref('')
const isDeletingMir = ref(false)

// MIR 검증 다이얼로그
const showMirValidationDialog = ref(false)
const mirValidationResult = ref<ValidateMirResponse | null>(null)
const mirValidationDeliveryId = ref<number | null>(null)
const mirExcludedIndices = ref<number[]>([])
const isCreatingMirAfterValidation = ref(false)

function addDeliveryLine(deliveryId: number) {
  const lines = deliveryLinesMap.value[deliveryId]
  if (!lines) return
  deliveryLinesMap.value[deliveryId] = [
    ...lines,
    {
      deliveryLineId: 0,
      manufacturer: '',
      materialSpecId: 0,
      materialSpecName: '',
      quantity: 0,
    },
  ]
}

function removeDeliveryLine(deliveryId: number, lineIdx: number) {
  const lines = deliveryLinesMap.value[deliveryId]
  if (!lines) return
  const removed = lines[lineIdx]
  if (removed && removed.deliveryLineId > 0) {
    if (!deletedLineIds.value[deliveryId]) deletedLineIds.value[deliveryId] = []
    deletedLineIds.value[deliveryId].push(removed.deliveryLineId)
  }
  deliveryLinesMap.value[deliveryId] = lines.filter((_, i) => i !== lineIdx)
}

function deleteCurrentImage(deliveryId: number) {
  const id = deliveryId
  const detail = deliveryDetailMap.value[id]
  if (!detail) return
  const imgIdx = deliveryImageIndex.value[id] ?? 0
  const noteLen = detail.noteFiles.length

  if (imgIdx < noteLen) {
    const noteFile = detail.noteFiles[imgIdx]
    if (noteFile.noteId) {
      if (!deletedNoteIds.value[id]) deletedNoteIds.value[id] = []
      deletedNoteIds.value[id].push(noteFile.noteId)
    }
    detail.noteFiles.splice(imgIdx, 1)
    const editState = deliveryEditState.value[id]
    if (editState) editState.noteDescriptions.splice(imgIdx, 1)
  } else {
    const photoIdx = imgIdx - noteLen
    const photoFile = detail.photoFiles[photoIdx]
    if (photoFile.photoId) {
      if (!deletedPhotoIds.value[id]) deletedPhotoIds.value[id] = []
      deletedPhotoIds.value[id].push(photoFile.photoId)
    }
    detail.photoFiles.splice(photoIdx, 1)
    const editState = deliveryEditState.value[id]
    if (editState) editState.photoDescriptions.splice(photoIdx, 1)
  }

  // 이미지 URL도 제거
  const urls = deliveryImageUrls.value[id]
  if (urls) {
    urls.splice(imgIdx, 1)
    const newTotal = urls.length
    if (newTotal === 0) {
      deliveryImageIndex.value[id] = 0
    } else if ((deliveryImageIndex.value[id] ?? 0) >= newTotal) {
      deliveryImageIndex.value[id] = newTotal - 1
    }
  }
}

const newDeliveryNotes = ref<Record<number, File[]>>({})
const noteInputRefs = ref<Record<number, HTMLInputElement | null>>({})
const photoInputRefs = ref<Record<number, HTMLInputElement | null>>({})

function triggerNoteInput(deliveryId: number) {
  noteInputRefs.value[deliveryId]?.click()
}

function triggerPhotoInput(deliveryId: number) {
  photoInputRefs.value[deliveryId]?.click()
}

function onNewNotesChange(deliveryId: number, event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  newDeliveryNotes.value[deliveryId] = [...(newDeliveryNotes.value[deliveryId] ?? []), ...files]
  // 미리보기에 추가
  const urls = deliveryImageUrls.value[deliveryId] ?? []
  deliveryImageUrls.value[deliveryId] = [...urls, ...files.map((f) => URL.createObjectURL(f))]
  input.value = ''
}

function onNewPhotosChange(deliveryId: number, event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  newDeliveryPhotos.value[deliveryId] = [...(newDeliveryPhotos.value[deliveryId] ?? []), ...files]
  // 미리보기에 추가
  const urls = deliveryImageUrls.value[deliveryId] ?? []
  deliveryImageUrls.value[deliveryId] = [...urls, ...files.map((f) => URL.createObjectURL(f))]
  input.value = ''
}

// function openDirectDeliveryDialog() {
//   directDeliveryDialogOpen.value = true
// }

async function loadWorkClassifications(delivery: MaterialDeliverySummary) {
  try {
    editDivisions.value = await referenceApi.getDivisionList()
    const editState = deliveryEditState.value[delivery.materialDeliveryId]
    if (editState?.divisionId) {
      editWorkTypes.value = await referenceApi.getWorkTypeList(Number(editState.divisionId))
    }
  } catch {
    // ignore
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleEditComponentDivisionChange(divisionId: any) {
  selectedEditComponentDivisionId.value = String(divisionId ?? '')
  editComponentTypes.value = []
  if (!divisionId) return
  isLoadingEditComponentTypes.value = true
  try {
    editComponentTypes.value = await referenceApi.getComponentTypeList(Number(divisionId))
  } catch {
    editComponentTypes.value = []
  } finally {
    isLoadingEditComponentTypes.value = false
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleEditDivisionChange(deliveryId: number, divisionId: any) {
  const editState = deliveryEditState.value[deliveryId]
  if (!editState) return
  editState.divisionId = String(divisionId ?? '')
  editState.workTypeId = ''
  editWorkTypes.value = []
  if (!editState.divisionId) return

  isLoadingEditWorkTypes.value = true
  try {
    editWorkTypes.value = await referenceApi.getWorkTypeList(Number(editState.divisionId))
  } catch (error: unknown) {
    console.error('공종 목록 로드 실패:', error)
  } finally {
    isLoadingEditWorkTypes.value = false
  }
}

// async function onDirectDeliverySubmitted(deliveryId: number) {
//   materialSpecs.value = []
//   loadOrders()
//   await loadDeliveries()
//   const newDelivery = deliveries.value.find(d => d.materialDeliveryId === deliveryId)
//   if (newDelivery) {
//     await toggleDelivery(newDelivery)
//   }
// }

function openDeleteDialog(deliveryId: number, deliveryName: string) {
  deleteTargetId.value = deliveryId
  deleteTargetName.value = deliveryName
  showDeleteDialog.value = true
}

async function confirmDeleteDelivery() {
  if (deleteTargetId.value == null) return
  isDeletingDelivery.value = true
  try {
    await materialOrderApi.deleteMaterialDelivery(deleteTargetId.value)
    showDeleteDialog.value = false
    const deletedId = deleteTargetId.value
    deliveries.value = deliveries.value.filter((d) => d.materialDeliveryId !== deletedId)
    // 관련 상태 정리
    delete expandedDeliveries[deletedId]
    delete deliveryDetailMap.value[deletedId]
    delete deliveryLinesMap.value[deletedId]
    delete deliveryEditState.value[deletedId]
    delete deliveryImageUrls.value[deletedId]
    delete deliveryImageIndex.value[deletedId]
    delete isLoadingLines.value[deletedId]
    delete isUpdatingDelivery.value[deletedId]
    delete isLoadingDeliveryImages.value[deletedId]
    delete deliveryImageScale.value[deletedId]
    delete deliveryImageTranslate[deletedId]
    delete deliveryImageDragging.value[deletedId]
    delete deliveryDragStart[deletedId]
    delete deliveryTranslateStart[deletedId]
    delete isGeneratingMir.value[deletedId]
    analyticsClient.trackAction('material_delivery', 'delete_delivery', 'success')
  } catch (error: unknown) {
    console.error('반입자재 삭제 실패:', error)
    analyticsClient.trackAction('material_delivery', 'delete_delivery', 'fail')
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  } finally {
    isDeletingDelivery.value = false
  }
}

function getMirForDelivery(deliveryId: number) {
  return mirList.value.find((m) => m.materialDeliveryId === deliveryId)
}

function openMirDeleteDialog(mirId: number, deliveryName: string) {
  mirDeleteTargetId.value = mirId
  mirDeleteTargetName.value = deliveryName
  showMirDeleteDialog.value = true
}

async function confirmDeleteMir() {
  if (mirDeleteTargetId.value == null) return
  isDeletingMir.value = true
  try {
    await deleteMaterialInspectionRequest(materialInspectionRequestRepository, mirDeleteTargetId.value)
    showMirDeleteDialog.value = false
    mirList.value = mirList.value.filter((m) => m.id !== mirDeleteTargetId.value)
    analyticsClient.trackAction('material_delivery', 'delete_mir', 'success')
  } catch (error: unknown) {
    console.error('검수요청서 삭제 실패:', error)
    analyticsClient.trackAction('material_delivery', 'delete_mir', 'fail')
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  } finally {
    isDeletingMir.value = false
  }
}

async function generateMir(deliveryId: number) {
  isGeneratingMir.value[deliveryId] = true
  try {
    const result = await validateMaterialInspectionRequest(materialInspectionRequestRepository, deliveryId)
    if (!result.exceeded) {
      await createMaterialInspectionRequest(materialInspectionRequestRepository, deliveryId)
      router.push('/helper/document/material-inspection')
      analyticsClient.trackAction('material_delivery', 'create_mir', 'success')
    } else {
      mirValidationResult.value = result
      mirValidationDeliveryId.value = deliveryId
      mirExcludedIndices.value = []
      showMirValidationDialog.value = true
    }
  } catch (error: unknown) {
    console.error('자재반입검수요청서 생성 실패:', error)
    analyticsClient.trackAction('material_delivery', 'create_mir', 'fail')
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  } finally {
    isGeneratingMir.value[deliveryId] = false
  }
}

async function confirmMirWithExclusions() {
  if (mirValidationDeliveryId.value == null) return
  isCreatingMirAfterValidation.value = true
  try {
    const body = mirExcludedIndices.value.length > 0
      ? { excludedIndices: mirExcludedIndices.value }
      : undefined
    await createMaterialInspectionRequest(materialInspectionRequestRepository, mirValidationDeliveryId.value, body)
    showMirValidationDialog.value = false
    router.push('/helper/document/material-inspection')
    analyticsClient.trackAction('material_delivery', 'create_mir', 'success')
  } catch (error: unknown) {
    console.error('자재반입검수요청서 생성 실패:', error)
    analyticsClient.trackAction('material_delivery', 'create_mir', 'fail')
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  } finally {
    isCreatingMirAfterValidation.value = false
  }
}

async function toggleDelivery(delivery: MaterialDeliverySummary) {
  const id = delivery.materialDeliveryId
  if (expandedDeliveries[id]) {
    // 접기: 상태 정리 + 이미지 URL revoke
    expandedDeliveries[id] = false
    deliveryImageUrls.value[id]?.forEach((url) => URL.revokeObjectURL(url))
    delete deliveryDetailMap.value[id]
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

  // 다른 반입자재 모두 접기 (아코디언)
  for (const key of Object.keys(expandedDeliveries)) {
    const otherId = Number(key)
    if (expandedDeliveries[otherId]) {
      expandedDeliveries[otherId] = false
      deliveryImageUrls.value[otherId]?.forEach((url) => URL.revokeObjectURL(url))
      delete deliveryDetailMap.value[otherId]
      delete deliveryLinesMap.value[otherId]
      delete deliveryEditState.value[otherId]
      delete deliveryImageUrls.value[otherId]
      delete deliveryImageIndex.value[otherId]
      delete deliveryImageScale.value[otherId]
      delete deliveryImageTranslate[otherId]
      delete deliveryImageDragging.value[otherId]
      delete deliveryDragStart[otherId]
      delete deliveryTranslateStart[otherId]
    }
  }

  // 펼치기
  expandedDeliveries[id] = true
  isLoadingLines.value[id] = true

  try {
    // 상세 정보 로드
    const detail = await materialOrderApi.getMaterialDeliveryDetail(id)
    deliveryDetailMap.value[id] = detail
    deliveryLinesMap.value[id] = detail.deliveryLines

    // materialSpecs 로드
    const matchedType = filterMaterialTypes.value.find((t) => t.name === delivery.materialTypeName)
    let initDivisionId = ''
    let initWorkTypeId = ''
    if (matchedType) {
      currentMaterialTypeId.value = matchedType.id
      try {
        materialSpecs.value = await referenceApi.getMaterialSpecList(matchedType.id)
      } catch {
        materialSpecs.value = []
      }
    } else {
      materialSpecs.value = []
    }

    // 분류/공종 목록 로드 + 현재 값 사전 선택
    try {
      editDivisions.value = await referenceApi.getDivisionList()
      if (detail.workTypeName) {
        const allWorkTypes = await Promise.all(
          editDivisions.value.map((d) => referenceApi.getWorkTypeList(d.id)),
        )
        const flatWorkTypes = allWorkTypes.flat()
        const currentWt = flatWorkTypes.find((wt) => wt.name === detail.workTypeName)
        if (currentWt) {
          initDivisionId = String(currentWt.divisionId)
          initWorkTypeId = String(currentWt.id)
          editWorkTypes.value = await referenceApi.getWorkTypeList(currentWt.divisionId)
        }
      }
    } catch {
      editDivisions.value = []
      editWorkTypes.value = []
    }

    // 존/층/부재분류 목록 로드
    try {
      const [zoneList, floorList, compDivList] = await Promise.all([
        referenceApi.getZoneList(),
        referenceApi.getFloorList(),
        referenceApi.getComponentDivisionList(),
      ])
      editZones.value = zoneList
      editFloors.value = floorList
      editComponentDivisions.value = compDivList

      // 부재타입: detail에 componentTypes가 있으면 첫번째의 divisionId로 로드
      if (detail.componentTypes.length > 0) {
        const firstDivId = detail.componentTypes[0].componentDivisionId
        selectedEditComponentDivisionId.value = String(firstDivId)
        editComponentTypes.value = await referenceApi.getComponentTypeList(firstDivId)
      } else {
        selectedEditComponentDivisionId.value = ''
        editComponentTypes.value = []
      }
    } catch {
      editZones.value = []
      editFloors.value = []
      editComponentDivisions.value = []
      editComponentTypes.value = []
    }

    deliveryEditState.value[id] = {
      supplier: detail.supplier,
      deliveryDate: delivery.deliveryDate,
      divisionId: initDivisionId,
      workTypeId: initWorkTypeId,
      selectedZoneIds: detail.zones.map((z) => z.id),
      selectedFloorIds: detail.floors.map((f) => f.id),
      selectedComponentTypeIds: detail.componentTypes.map((c) => c.componentTypeId),
      noteDescriptions: detail.noteFiles.map((f) => ({ noteId: f.noteId!, description: f.description })),
      photoDescriptions: detail.photoFiles.map((f) => ({ photoId: f.photoId!, description: f.description })),
    }
    deletedLineIds.value[id] = []
    deletedNoteIds.value[id] = []
    deletedPhotoIds.value[id] = []
    newDeliveryNotes.value[id] = []
    newDeliveryPhotos.value[id] = []
    deliveryImageIndex.value[id] = 0
    deliveryImageScale.value[id] = 1
    deliveryImageTranslate[id] = { x: 0, y: 0 }
    deliveryImageDragging.value[id] = false
    deliveryDragStart[id] = { x: 0, y: 0 }
    deliveryTranslateStart[id] = { x: 0, y: 0 }

    // noteFiles + photoFiles 기반 이미지 로드 (public URL 직접 사용)
    const allFileUrls = [
      ...detail.noteFiles.map((f) => f.url),
      ...detail.photoFiles.map((f) => f.url),
    ]
    if (allFileUrls.length > 0) {
      deliveryImageUrls.value[id] = allFileUrls
    }
  } catch (error: unknown) {
    console.error('반입자재 상세 로드 실패:', error)
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
  if (deliveryImageCropMode.value[deliveryId]) return
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const current = deliveryImageScale.value[deliveryId] ?? 1
  deliveryImageScale.value[deliveryId] = Math.min(5, Math.max(0.5, current + delta))
}

function onDeliveryImagePointerDown(deliveryId: number, e: PointerEvent) {
  if (deliveryImageCropMode.value[deliveryId]) return
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
  const urls = deliveryImageUrls.value[deliveryId] ?? []
  if (urls.length === 0) return
  const idx = deliveryImageIndex.value[deliveryId] ?? 0
  deliveryImageIndex.value[deliveryId] = idx > 0 ? idx - 1 : urls.length - 1
  resetDeliveryImageTransform(deliveryId)
}

function nextDeliveryImage(deliveryId: number) {
  const urls = deliveryImageUrls.value[deliveryId] ?? []
  if (urls.length === 0) return
  const idx = deliveryImageIndex.value[deliveryId] ?? 0
  deliveryImageIndex.value[deliveryId] = idx < urls.length - 1 ? idx + 1 : 0
  resetDeliveryImageTransform(deliveryId)
}

async function updateDelivery(delivery: MaterialDeliverySummary) {
  const id = delivery.materialDeliveryId
  const editState = deliveryEditState.value[id]
  const lines = deliveryLinesMap.value[id]
  if (!editState || !lines) return

  isUpdatingDelivery.value[id] = true
  try {
    const addLines = lines
      .filter((line) => line.deliveryLineId === 0)
      .map((line) => ({
        manufacturer: line.manufacturer || undefined,
        specId: line.materialSpecId || undefined,
        quantity: String(line.quantity),
      }))
    const updateLines = lines
      .filter((line) => line.deliveryLineId > 0)
      .map((line) => ({
        deliveryLineId: line.deliveryLineId,
        manufacturer: line.manufacturer || undefined,
        specId: line.materialSpecId || undefined,
        quantity: String(line.quantity),
      }))

    // 이미지 회전/크롭 편집 수집
    const imageEdits = await collectImageEdits(id)

    await materialOrderApi.updateMaterialDelivery(
      id,
      {
        supplier: editState.supplier,
        deliveryDate: editState.deliveryDate,
        workTypeId: editState.workTypeId ? Number(editState.workTypeId) : undefined,
        zoneIds: editState.selectedZoneIds,
        floorIds: editState.selectedFloorIds,
        componentTypeIds: editState.selectedComponentTypeIds,
        addLines: addLines.length > 0 ? addLines : undefined,
        updateLines: updateLines.length > 0 ? updateLines : undefined,
        deleteLineIds: deletedLineIds.value[id]?.length ? deletedLineIds.value[id] : undefined,
        noteDescriptions: editState.noteDescriptions,
        photoDescriptions: editState.photoDescriptions,
        deleteNoteIds: deletedNoteIds.value[id]?.length ? deletedNoteIds.value[id] : undefined,
        deletePhotoIds: deletedPhotoIds.value[id]?.length ? deletedPhotoIds.value[id] : undefined,
        replaceNotes: imageEdits.replaceNotes.length > 0 ? imageEdits.replaceNotes : undefined,
        replacePhotos: imageEdits.replacePhotos.length > 0 ? imageEdits.replacePhotos : undefined,
      },
      {
        deliveryNotes: newDeliveryNotes.value[id]?.length ? newDeliveryNotes.value[id] : undefined,
        deliveryPhotos: newDeliveryPhotos.value[id]?.length ? newDeliveryPhotos.value[id] : undefined,
        replaceNoteFiles: imageEdits.replaceNoteFiles.length > 0 ? imageEdits.replaceNoteFiles : undefined,
        replacePhotoFiles: imageEdits.replacePhotoFiles.length > 0 ? imageEdits.replacePhotoFiles : undefined,
      },
    )
    // 성공 시 접기 + 목록 새로고침
    expandedDeliveries[id] = false
    delete deliveryDetailMap.value[id]
    delete deliveryLinesMap.value[id]
    delete deliveryEditState.value[id]
    delete deliveryImageUrls.value[id]
    delete deliveryImageIndex.value[id]
    delete deliveryImageScale.value[id]
    delete deliveryImageTranslate[id]
    delete deletedLineIds.value[id]
    delete deletedNoteIds.value[id]
    delete deletedPhotoIds.value[id]
    delete newDeliveryNotes.value[id]
    delete newDeliveryPhotos.value[id]
    analyticsClient.trackAction('material_delivery', 'update_delivery', 'success')
    loadDeliveries()
  } catch (error: unknown) {
    console.error('반입자재 수정 실패:', error)
    analyticsClient.trackAction('material_delivery', 'update_delivery', 'fail')
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

// 화면 가로세로 비율 감지 — 1:1보다 세로가 길면 카드 내부를 세로 배치
const isPortrait = ref(window.innerHeight > window.innerWidth)
function onWindowResize() {
  isPortrait.value = window.innerHeight > window.innerWidth
}

onMounted(() => {
  loadOrders()
  loadDeliveries()
  referenceApi.getMaterialTypeList()
    .then((list) => (filterMaterialTypes.value = list))
    .catch(() => {})
  getMaterialInspectionRequests(materialInspectionRequestRepository)
    .then((list) => (mirList.value = list))
    .catch(() => {})
  window.addEventListener('resize', onWindowResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onWindowResize)
})
</script>

<template>
  <PageContainer title="반입자재">
    <AreaCard height="flex-1" min-height="1100px">
      <!-- 필터 -->
      <div class="flex items-center justify-center gap-4 mb-4">
        <Select v-model="filterMaterialTypeId">
          <SelectTrigger class="w-[180px]">
            <SelectValue placeholder="자재유형 전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">자재 전체</SelectItem>
            <SelectItem v-for="mt in filterMaterialTypes" :key="mt.id" :value="String(mt.id)">
              {{ mt.name }}
            </SelectItem>
          </SelectContent>
        </Select>
        <DateRangeFilter v-model="filterDateRange" :min-value="calendarMinDate" :max-value="calendarMaxDate" />
        <Button
          v-if="filterDateRange.start"
          variant="ghost"
          size="sm"
          class="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          @click="filterDateRange = { start: undefined, end: undefined }"
        >
          <X class="h-4 w-4" />
        </Button>
      </div>

      <!-- 로딩 -->
      <div v-if="isLoadingDeliveries" class="text-sm text-muted-foreground text-center py-8">
        반입자재 목록 로딩 중...
      </div>

      <!-- 반입자재 카드 목록 -->
      <div v-else class="space-y-4">
        <!-- 새 반입자재 생성 카드 (비활성) -->
        <!-- <div
          class="create-delivery-card relative rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/30 transition-colors"
          style="min-height: 80px"
          @click="openDirectDeliveryDialog"
        >
          <span class="text-6xl text-muted-foreground/50 select-none leading-none">＋</span>
        </div> -->
        <div
          v-for="delivery in filteredDeliveries"
          :key="delivery.materialDeliveryId"
          class="border border-border rounded-lg overflow-hidden"
        >
          <!-- 카드 헤더 (클릭으로 펼치기/접기) -->
          <div
            class="bg-muted/30 cursor-pointer select-none"
            @click="toggleDelivery(delivery)"
          >
            <div class="flex items-center gap-3 px-4 py-3">
              <span class="text-xs text-muted-foreground">{{ expandedDeliveries[delivery.materialDeliveryId] ? '▲' : '▼' }}</span>
              <span class="text-sm font-medium inline-flex items-center gap-1">
                {{ delivery.materialTypeName }}
                <span @click.stop>
                  <ReferenceEditTrigger type="material" @refresh="loadDeliveries" />
                </span>
              </span>
              <span v-if="delivery.totalQuantity" class="text-sm text-muted-foreground">
                {{ delivery.totalQuantity }}{{ delivery.unit }}
              </span>
              <span v-if="mirDeliveryIds.has(delivery.materialDeliveryId)" class="text-xs text-muted-foreground">
                문서번호 : {{ getMirForDelivery(delivery.materialDeliveryId)?.documentNumber }}
              </span>
              <div class="flex items-center gap-1 ml-auto" @click.stop>
                <Button
                  v-if="!mirDeliveryIds.has(delivery.materialDeliveryId)"
                  variant="outline"
                  size="sm"
                  :disabled="isGeneratingMir[delivery.materialDeliveryId]"
                  @click="generateMir(delivery.materialDeliveryId)"
                >
                  {{ isGeneratingMir[delivery.materialDeliveryId] ? '생성 중...' : '검수요청서 생성' }}
                </Button>
                <template v-else>
                  <Badge variant="secondary">검수요청 완료</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    @click="openMirDeleteDialog(getMirForDelivery(delivery.materialDeliveryId)!.id, delivery.materialTypeName)"
                  >
                    <X class="h-3 w-3" />
                  </Button>
                </template>
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  :disabled="mirDeliveryIds.has(delivery.materialDeliveryId)"
                  @click="openDeleteDialog(delivery.materialDeliveryId, delivery.materialTypeName)"
                >
                  <X class="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <!-- 펼친 영역 -->
          <div v-if="expandedDeliveries[delivery.materialDeliveryId]" class="p-4">
            <!-- 로딩 -->
            <div v-if="isLoadingLines[delivery.materialDeliveryId]" class="text-sm text-muted-foreground text-center py-8">
              라인 정보 로딩 중...
            </div>

            <template v-else>
              <div class="gap-4" :class="isPortrait ? 'flex flex-col' : 'flex'">
                <!-- 좌측: 이미지 뷰어 (고정 높이) -->
                <div class="flex flex-col gap-2" :class="isPortrait ? 'w-full' : 'w-1/2'">
                  <div v-if="isLoadingDeliveryImages[delivery.materialDeliveryId]" class="h-[720px] flex items-center justify-center border border-border rounded-lg bg-muted/20">
                    <p class="text-sm text-muted-foreground">이미지 로딩 중...</p>
                  </div>
                  <template v-else-if="(deliveryImageUrls[delivery.materialDeliveryId] ?? []).length > 0">
                    <div
                      :ref="(el) => { deliveryImageContainerRefs[delivery.materialDeliveryId] = el as HTMLElement }"
                      class="h-[720px] border border-border rounded-lg overflow-hidden bg-muted/20 relative"
                      @wheel="onDeliveryImageWheel(delivery.materialDeliveryId, $event)"
                      @pointerdown="onDeliveryImagePointerDown(delivery.materialDeliveryId, $event)"
                      @pointermove="onDeliveryImagePointerMove(delivery.materialDeliveryId, $event)"
                      @pointerup="onDeliveryImagePointerUp(delivery.materialDeliveryId)"
                    >
                      <img
                        :ref="(el) => { deliveryImageRefs[delivery.materialDeliveryId] = el as HTMLImageElement }"
                        :src="deliveryImageUrls[delivery.materialDeliveryId]?.[deliveryImageIndex[delivery.materialDeliveryId] ?? 0]"
                        alt="송장 이미지"
                        class="w-full h-full object-contain select-none"
                        draggable="false"
                        :style="{
                          transform: `translate(${deliveryImageTranslate[delivery.materialDeliveryId]?.x ?? 0}px, ${deliveryImageTranslate[delivery.materialDeliveryId]?.y ?? 0}px) scale(${deliveryImageScale[delivery.materialDeliveryId] ?? 1}) rotate(${deliveryImageRotation[imageEditKey(delivery.materialDeliveryId)] ?? 0}deg)`,
                          transformOrigin: 'center center',
                          transition: deliveryImageDragging[delivery.materialDeliveryId] ? 'none' : 'transform 0.15s ease',
                        }"
                      />
                      <!-- 크롭 오버레이 -->
                      <div
                        v-if="deliveryImageCropMode[delivery.materialDeliveryId]"
                        class="absolute inset-0 cursor-crosshair z-10"
                        @pointerdown="onCropPointerDown(delivery.materialDeliveryId, $event)"
                        @pointermove="onCropPointerMove(delivery.materialDeliveryId, $event)"
                        @pointerup="onCropPointerUp(delivery.materialDeliveryId)"
                      >
                        <div
                          v-if="deliveryImageCropRect[delivery.materialDeliveryId]"
                          class="absolute border-2 border-dashed border-blue-500 bg-blue-500/10 pointer-events-none"
                          :style="getCropStyle(delivery.materialDeliveryId)"
                        />
                      </div>
                      <!-- 편집 도구 (상단 우측) -->
                      <div class="absolute top-2 right-2 flex items-center gap-1.5 bg-background/80 rounded-md border border-border px-2 py-1 z-20">
                        <Button variant="ghost" size="sm" class="h-8 w-8 p-0" title="회전" @click="rotateImage(delivery.materialDeliveryId, 'ccw')">
                          <RotateCcw class="h-5 w-5" />
                        </Button>
                        <Button
                          :variant="deliveryImageCropMode[delivery.materialDeliveryId] ? 'default' : 'ghost'"
                          size="sm"
                          class="h-8 w-8 p-0"
                          title="자르기"
                          @click="toggleCropMode(delivery.materialDeliveryId)"
                        >
                          <Crop class="h-5 w-5" />
                        </Button>
                      </div>
                      <!-- 줌 컨트롤 (하단 우측) -->
                      <div class="absolute bottom-2 right-2 flex items-center gap-1 bg-background/80 rounded-md border border-border px-1.5 py-0.5">
                        <Button variant="ghost" size="sm" class="h-6 w-6 p-0" @click="deliveryImageScale[delivery.materialDeliveryId] = Math.max(0.5, (deliveryImageScale[delivery.materialDeliveryId] ?? 1) - 0.25)">−</Button>
                        <span class="text-xs text-muted-foreground min-w-[3ch] text-center">{{ Math.round((deliveryImageScale[delivery.materialDeliveryId] ?? 1) * 100) }}%</span>
                        <Button variant="ghost" size="sm" class="h-6 w-6 p-0" @click="deliveryImageScale[delivery.materialDeliveryId] = Math.min(5, (deliveryImageScale[delivery.materialDeliveryId] ?? 1) + 0.25)">+</Button>
                        <Button v-if="(deliveryImageScale[delivery.materialDeliveryId] ?? 1) !== 1" variant="ghost" size="sm" class="h-6 px-1 text-xs" @click="resetDeliveryImageTransform(delivery.materialDeliveryId)">초기화</Button>
                      </div>
                    </div>
                    <!-- 현재 이미지의 설명 -->
                    <div v-if="deliveryEditState[delivery.materialDeliveryId]" class="shrink-0">
                      <template v-if="deliveryDetailMap[delivery.materialDeliveryId] && (deliveryImageIndex[delivery.materialDeliveryId] ?? 0) < deliveryDetailMap[delivery.materialDeliveryId]!.noteFiles.length">
                        <Input
                          v-model="deliveryEditState[delivery.materialDeliveryId]!.noteDescriptions[(deliveryImageIndex[delivery.materialDeliveryId] ?? 0)]!.description"
                          class="h-8 text-sm"
                          placeholder="송장 설명"
                        />
                      </template>
                      <template v-else-if="deliveryDetailMap[delivery.materialDeliveryId]">
                        <Input
                          v-model="deliveryEditState[delivery.materialDeliveryId]!.photoDescriptions[(deliveryImageIndex[delivery.materialDeliveryId] ?? 0) - deliveryDetailMap[delivery.materialDeliveryId]!.noteFiles.length]!.description"
                          class="h-8 text-sm"
                          placeholder="사진 설명"
                        />
                      </template>
                    </div>
                    <!-- 페이지 넘기기 -->
                    <div v-if="(deliveryImageUrls[delivery.materialDeliveryId] ?? []).length > 1" class="flex items-center justify-center gap-3 shrink-0">
                      <Button variant="outline" size="sm" @click="prevDeliveryImage(delivery.materialDeliveryId)">
                        ← 이전
                      </Button>
                      <span class="text-sm text-muted-foreground">
                        {{ (deliveryImageIndex[delivery.materialDeliveryId] ?? 0) + 1 }} / {{ (deliveryImageUrls[delivery.materialDeliveryId] ?? []).length }}
                      </span>
                      <Button variant="outline" size="sm" @click="nextDeliveryImage(delivery.materialDeliveryId)">
                        다음 →
                      </Button>
                    </div>
                    <!-- 이미지 추가/삭제 버튼 -->
                    <div v-if="deliveryEditState[delivery.materialDeliveryId]" class="flex items-center justify-center gap-2">
                      <Button variant="outline" size="sm" @click="triggerNoteInput(delivery.materialDeliveryId)">
                        송장추가
                      </Button>
                      <Button variant="outline" size="sm" @click="triggerPhotoInput(delivery.materialDeliveryId)">
                        반입사진추가
                      </Button>
                      <Button
                        v-if="(deliveryImageUrls[delivery.materialDeliveryId] ?? []).length > 0"
                        variant="outline"
                        size="sm"
                        class="text-destructive hover:text-destructive"
                        @click="deleteCurrentImage(delivery.materialDeliveryId)"
                      >
                        현재 이미지 삭제
                      </Button>
                      <input
                        :ref="(el) => { noteInputRefs[delivery.materialDeliveryId] = el as HTMLInputElement }"
                        type="file"
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg"
                        class="hidden"
                        @change="onNewNotesChange(delivery.materialDeliveryId, $event)"
                      />
                      <input
                        :ref="(el) => { photoInputRefs[delivery.materialDeliveryId] = el as HTMLInputElement }"
                        type="file"
                        multiple
                        accept="image/*"
                        class="hidden"
                        @change="onNewPhotosChange(delivery.materialDeliveryId, $event)"
                      />
                    </div>
                    <!-- 추가된 파일 표시 -->
                    <div v-if="(newDeliveryNotes[delivery.materialDeliveryId]?.length ?? 0) + (newDeliveryPhotos[delivery.materialDeliveryId]?.length ?? 0) > 0" class="text-xs text-muted-foreground text-center">
                      <span v-if="newDeliveryNotes[delivery.materialDeliveryId]?.length">송장 {{ newDeliveryNotes[delivery.materialDeliveryId].length }}건</span>
                      <span v-if="newDeliveryNotes[delivery.materialDeliveryId]?.length && newDeliveryPhotos[delivery.materialDeliveryId]?.length"> · </span>
                      <span v-if="newDeliveryPhotos[delivery.materialDeliveryId]?.length">사진 {{ newDeliveryPhotos[delivery.materialDeliveryId].length }}건</span>
                      추가됨 (수정하기 시 저장)
                    </div>
                  </template>
                  <div v-else class="h-[720px] flex items-center justify-center border border-border rounded-lg bg-muted/20">
                    <p class="text-sm text-muted-foreground">이미지가 없습니다</p>
                  </div>
                </div>

                <!-- 우측: 수정 폼 -->
                <div class="space-y-4 overflow-y-auto" :class="isPortrait ? 'w-full' : 'w-1/2'">
                  <!-- 공종 -->
                  <div class="space-y-1.5">
                    <Label class="inline-flex items-center gap-1">
                      공종
                      <ReferenceEditTrigger type="work-classification" @refresh="loadWorkClassifications(delivery)" />
                    </Label>
                    <div class="grid grid-cols-2 gap-4">
                      <Select
                        :model-value="deliveryEditState[delivery.materialDeliveryId]!.divisionId"
                        @update:model-value="handleEditDivisionChange(delivery.materialDeliveryId, $event)"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="분류 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            v-for="div in editDivisions"
                            :key="div.id"
                            :value="String(div.id)"
                          >
                            {{ div.name }}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        v-model="deliveryEditState[delivery.materialDeliveryId]!.workTypeId"
                        :disabled="!deliveryEditState[delivery.materialDeliveryId]!.divisionId || isLoadingEditWorkTypes"
                      >
                        <SelectTrigger>
                          <SelectValue :placeholder="isLoadingEditWorkTypes ? '로딩중...' : '공종 선택'" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            v-for="wt in editWorkTypes"
                            :key="wt.id"
                            :value="String(wt.id)"
                          >
                            {{ wt.name }}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

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

                  <!-- 위치정보 (존/층) -->
                  <div v-if="editZones.length > 0" class="space-y-1.5">
                    <Label class="inline-flex items-center gap-1">
                      존
                      <ReferenceEditTrigger type="zone" @refresh="async () => { editZones = await referenceApi.getZoneList() }" />
                    </Label>
                    <div class="flex flex-wrap gap-1.5">
                      <button
                        v-for="zone in editZones" :key="zone.id"
                        class="px-3 py-1 text-sm rounded-md border transition-colors"
                        :class="deliveryEditState[delivery.materialDeliveryId]!.selectedZoneIds.includes(zone.id) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-background border-border text-foreground hover:bg-muted'"
                        @click="deliveryEditState[delivery.materialDeliveryId]!.selectedZoneIds = toggleId(deliveryEditState[delivery.materialDeliveryId]!.selectedZoneIds, zone.id)"
                      >
                        {{ zone.name }}
                      </button>
                    </div>
                  </div>

                  <div v-if="editFloors.length > 0" class="space-y-1.5">
                    <Label class="inline-flex items-center gap-1">
                      층
                      <ReferenceEditTrigger type="floor" @refresh="async () => { editFloors = await referenceApi.getFloorList() }" />
                    </Label>
                    <div class="flex flex-wrap gap-1.5">
                      <button
                        v-for="floor in editFloors" :key="floor.id"
                        class="px-3 py-1 text-sm rounded-md border transition-colors"
                        :class="deliveryEditState[delivery.materialDeliveryId]!.selectedFloorIds.includes(floor.id) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-background border-border text-foreground hover:bg-muted'"
                        @click="deliveryEditState[delivery.materialDeliveryId]!.selectedFloorIds = toggleId(deliveryEditState[delivery.materialDeliveryId]!.selectedFloorIds, floor.id)"
                      >
                        {{ floor.name }}
                      </button>
                    </div>
                  </div>

                  <!-- 부재 -->
                  <div v-if="editComponentDivisions.length > 0" class="space-y-1.5">
                    <Label class="inline-flex items-center gap-1">
                      부재
                      <ReferenceEditTrigger type="component" @refresh="async () => { editComponentDivisions = await referenceApi.getComponentDivisionList() }" />
                    </Label>
                    <Select
                      :model-value="selectedEditComponentDivisionId"
                      @update:model-value="handleEditComponentDivisionChange"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="부재 분류 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          v-for="div in editComponentDivisions"
                          :key="div.id"
                          :value="String(div.id)"
                        >
                          {{ div.name }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div v-if="editComponentTypes.length > 0" class="flex flex-wrap gap-1.5">
                      <button
                        v-for="ct in editComponentTypes" :key="ct.id"
                        class="px-3 py-1 text-sm rounded-md border transition-colors"
                        :class="deliveryEditState[delivery.materialDeliveryId]!.selectedComponentTypeIds.includes(ct.id) ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-background border-border text-foreground hover:bg-muted'"
                        @click="deliveryEditState[delivery.materialDeliveryId]!.selectedComponentTypeIds = toggleId(deliveryEditState[delivery.materialDeliveryId]!.selectedComponentTypeIds, ct.id)"
                      >
                        {{ ct.name }}
                      </button>
                    </div>
                    <p v-else-if="isLoadingEditComponentTypes" class="text-xs text-muted-foreground">로딩 중...</p>
                  </div>

                  <!-- 행 추가 버튼 -->
                  <Button
                    variant="outline"
                    size="sm"
                    :disabled="mirDeliveryIds.has(delivery.materialDeliveryId)"
                    @click="addDeliveryLine(delivery.materialDeliveryId)"
                  >
                    + 행 추가
                  </Button>

                  <!-- 라인 테이블 -->
                  <div class="overflow-x-auto border border-border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>제조사</TableHead>
                          <TableHead>
                            <span class="inline-flex items-center gap-1">
                              규격
                              <ReferenceEditTrigger type="material" @refresh="reloadMaterialSpecs" />
                            </span>
                          </TableHead>
                          <TableHead class="w-[200px] text-right">수량</TableHead>
                          <TableHead class="w-[40px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow
                          v-for="(line, lineIdx) in deliveryLinesMap[delivery.materialDeliveryId]"
                          :key="line.deliveryLineId ?? lineIdx"
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
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              class="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                              @click="removeDeliveryLine(delivery.materialDeliveryId, lineIdx)"
                            >
                              <X class="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>

                  <!-- 수정하기 버튼 -->
                  <div class="flex justify-end">
                    <Button
                      :disabled="isUpdatingDelivery[delivery.materialDeliveryId] || mirDeliveryIds.has(delivery.materialDeliveryId)"
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
    </AreaCard>

    <!-- 발주서없이 반입자재 생성 다이얼로그 (비활성) -->
    <!-- <MaterialDeliveryCreateDialog
      v-model:open="directDeliveryDialogOpen"
      :default-material-type-id="filterMaterialTypeId !== '__all__' ? filterMaterialTypeId : undefined"
      @submitted="onDirectDeliverySubmitted"
    /> -->

    <!-- 반입자재 삭제 확인 다이얼로그 -->
    <AlertDialog :open="showDeleteDialog" @update:open="showDeleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>삭제 확인</AlertDialogTitle>
          <AlertDialogDescription>
            '{{ deleteTargetName }}' 반입자재를 삭제하시겠습니까?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="isDeletingDelivery">취소</AlertDialogCancel>
          <AlertDialogAction :disabled="isDeletingDelivery" @click="confirmDeleteDelivery">
            {{ isDeletingDelivery ? '삭제 중...' : '삭제' }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- MIR 삭제 확인 다이얼로그 -->
    <AlertDialog :open="showMirDeleteDialog" @update:open="showMirDeleteDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>검수요청서 삭제 확인</AlertDialogTitle>
          <AlertDialogDescription>
            '{{ mirDeleteTargetName }}' 검수요청서를 삭제하시겠습니까?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="isDeletingMir">취소</AlertDialogCancel>
          <AlertDialogAction :disabled="isDeletingMir" @click="confirmDeleteMir">
            {{ isDeletingMir ? '삭제 중...' : '삭제' }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <!-- MIR 검증 다이얼로그 -->
    <Dialog v-model:open="showMirValidationDialog">
      <DialogContent class="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>자재반입검수요청서 항목 초과</DialogTitle>
        </DialogHeader>

        <div v-if="mirValidationResult" class="space-y-4 py-2">
          <p class="text-sm text-muted-foreground">
            총 {{ mirValidationResult.dataRowCount }}개 항목 중 최대 {{ mirValidationResult.totalMaxRows }}개만 포함 가능합니다.
            제외할 항목을 선택하세요.
          </p>

          <div class="border border-border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead class="w-[40px]" />
                  <TableHead>No</TableHead>
                  <TableHead>규격명</TableHead>
                  <TableHead class="text-right">수량</TableHead>
                  <TableHead>단위</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="item in mirValidationResult.items"
                  :key="item.index"
                  :class="{ 'opacity-40': mirExcludedIndices.includes(item.index) }"
                >
                  <TableCell>
                    <Checkbox
                      :model-value="mirExcludedIndices.includes(item.index)"
                      @update:model-value="mirExcludedIndices = toggleId(mirExcludedIndices, item.index)"
                    />
                  </TableCell>
                  <TableCell class="text-sm">{{ item.index + 1 }}</TableCell>
                  <TableCell class="text-sm">{{ item.specName }}</TableCell>
                  <TableCell class="text-sm text-right">{{ item.quantity }}</TableCell>
                  <TableCell class="text-sm">{{ item.unit }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <p class="text-sm">
            제외 후 남은 행 수:
            <span :class="mirValidationResult.dataRowCount - mirExcludedIndices.length > mirValidationResult.totalMaxRows ? 'text-destructive font-semibold' : 'text-green-600 font-semibold'">
              {{ mirValidationResult.dataRowCount - mirExcludedIndices.length }}
            </span>
            / {{ mirValidationResult.totalMaxRows }}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" :disabled="isCreatingMirAfterValidation" @click="showMirValidationDialog = false">취소</Button>
          <Button
            :disabled="isCreatingMirAfterValidation || (mirValidationResult != null && mirValidationResult.dataRowCount - mirExcludedIndices.length > mirValidationResult.totalMaxRows)"
            @click="confirmMirWithExclusions"
          >
            {{ isCreatingMirAfterValidation ? '생성 중...' : '생성' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </PageContainer>
</template>

<!-- <style scoped>
.create-delivery-card {
  border: none;
}
.create-delivery-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Crect width='100%25' height='100%25' fill='none' rx='8' ry='8' stroke='hsl(0 0%25 50%25 / 0.5)' stroke-width='3' stroke-dasharray='16 10' stroke-linecap='round'/%3E%3C/svg%3E");
}
</style> -->
