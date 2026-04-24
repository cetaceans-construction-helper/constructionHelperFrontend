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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Checkbox } from '@/shared/ui/checkbox'
import { X, RotateCcw, Crop } from 'lucide-vue-next'
import { DateRangeFilter } from '@/shared/ui/date-range-picker'
import { dateRangeToStrings, toCalendarDate } from '@/shared/utils/date-convert'
import { useCalendarStore } from '@/app/context/stores/calendarStore'
import ReferenceEditTrigger from '@/shared/helper-ui/ReferenceEditTrigger.vue'
import MaterialDeliveryCreateDialog from '@/features/material/ui/components/MaterialDeliveryCreateDialog.vue'
import { materialOrderApi } from '@/features/material/infra/material-order-api'
import type {
  DeliveryLineResponse,
  MaterialDeliveryDetail,
  MaterialDeliverySummary,
  PhotoType,
} from '@/features/material/model/material-order-types'
import { useMaterialOrder } from '@/features/material/view-model/useMaterialOrder'
import {
  createMir,
  deleteDocument,
  getMaterialInspectionRequests,
  materialInspectionRequestRepository,
  type MaterialInspectionRequestResponse,
} from '@/features/document/public'
import { fileApi } from '@/shared/network-core/apis/file'
import { referenceApi } from '@/shared/network-core/apis/reference'
import type {
  MaterialSpecResponse,
  MaterialTypeResponse,
  WorkTypeResponse,
  IdNameResponse,
} from '@/shared/network-core/apis/reference'
import { analyticsClient } from '@/shared/analytics/analyticsClient'
import { rotateImageFile } from '@/shared/utils/rotateImage'
import { cropImageFile } from '@/shared/utils/cropImage'

const router = useRouter()
const { loadOrders } = useMaterialOrder()
const calendarStore = useCalendarStore()
const calendarMinDate = computed(() =>
  calendarStore.calendarData?.projectStartDate ? toCalendarDate(calendarStore.calendarData.projectStartDate) : undefined,
)
const calendarMaxDate = computed(() =>
  calendarStore.calendarData?.projectEndDate ? toCalendarDate(calendarStore.calendarData.projectEndDate) : undefined,
)

const createDeliveryDialogOpen = ref(false)

const showDeleteDialog = ref(false)
const deleteTargetId = ref<number | null>(null)
const deleteTargetName = ref('')
const isDeletingDelivery = ref(false)

const filterMaterialTypeId = ref<string>('__all__')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const filterDateRange = ref<any>({ start: undefined, end: undefined })
const filterMaterialTypes = ref<MaterialTypeResponse[]>([])

const deliveries = ref<MaterialDeliverySummary[]>([])
const isLoadingDeliveries = ref(false)

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

const expandedDeliveries = reactive<Record<number, boolean>>({})
const deliveryLinesMap = ref<Record<number, DeliveryLineResponse[]>>({})
const deliveryDetailMap = ref<Record<number, MaterialDeliveryDetail>>({})
const deliveryEditState = ref<Record<number, {
  supplier: string
  deliveryDate: string
  application: string
  divisionId: string
  workTypeId: string
  photoDescriptions: { photoId: number; description: string }[]
}>>({})
const isLoadingLines = ref<Record<number, boolean>>({})
const isUpdatingDelivery = ref<Record<number, boolean>>({})
const deletedLineIds = ref<Record<number, number[]>>({})
const deletedPhotoIds = ref<Record<number, number[]>>({})
const newDeliveryPhotos = ref<Record<number, File[]>>({})
const editDivisions = ref<IdNameResponse[]>([])
const editWorkTypes = ref<WorkTypeResponse[]>([])
const isLoadingEditWorkTypes = ref(false)

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

const deliveryImageUrls = ref<Record<number, string[]>>({})
const deliveryImageIndex = ref<Record<number, number>>({})
const isLoadingDeliveryImages = ref<Record<number, boolean>>({})
const deliveryImageScale = ref<Record<number, number>>({})
const deliveryImageTranslate = reactive<Record<number, { x: number; y: number }>>({})
const deliveryImageDragging = ref<Record<number, boolean>>({})
const deliveryDragStart = reactive<Record<number, { x: number; y: number }>>({})
const deliveryTranslateStart = reactive<Record<number, { x: number; y: number }>>({})

const deliveryImageRotation = ref<Record<string, number>>({})
const deliveryImageCropMode = ref<Record<string, boolean>>({})
const deliveryImageCropRect = reactive<Record<string, { startX: number; startY: number; endX: number; endY: number } | null>>({})
const isCropDragging = ref<Record<string, boolean>>({})
const deliveryImageRefs = ref<Record<number, HTMLImageElement | null>>({})
const deliveryImageContainerRefs = ref<Record<number, HTMLElement | null>>({})

const photoTypeLabels: Record<PhotoType, string> = {
  DELIVERY_NOTE: '송장',
  MILL_SHEET: '밀시트',
  TAG: '태그',
  DELIVERY_PHOTO: '반입사진',
}

const photoTypeBorder: Record<PhotoType, string> = {
  DELIVERY_NOTE: 'border-blue-600',
  MILL_SHEET: 'border-amber-600',
  TAG: 'border-purple-600',
  DELIVERY_PHOTO: 'border-green-600',
}

const photoTypeText: Record<PhotoType, string> = {
  DELIVERY_NOTE: 'text-blue-600',
  MILL_SHEET: 'text-amber-600',
  TAG: 'text-purple-600',
  DELIVERY_PHOTO: 'text-green-600',
}

function currentPhotoType(deliveryId: number): PhotoType | null {
  const detail = deliveryDetailMap.value[deliveryId]
  if (!detail) return null
  const idx = deliveryImageIndex.value[deliveryId] ?? 0
  if (idx >= detail.photoFiles.length) return null
  return detail.photoFiles[idx]?.type ?? null
}

function imageEditKey(deliveryId: number) {
  const idx = deliveryImageIndex.value[deliveryId] ?? 0
  return `${deliveryId}-${idx}`
}

function clearImageEditState(deliveryId: number) {
  const prefix = `${deliveryId}-`
  for (const key of Object.keys(deliveryImageRotation.value)) {
    if (key.startsWith(prefix)) delete deliveryImageRotation.value[key]
  }
  for (const key of Object.keys(deliveryImageCropMode.value)) {
    if (key.startsWith(prefix)) delete deliveryImageCropMode.value[key]
  }
  for (const key of Object.keys(deliveryImageCropRect)) {
    if (key.startsWith(prefix)) delete deliveryImageCropRect[key]
  }
  for (const key of Object.keys(isCropDragging.value)) {
    if (key.startsWith(prefix)) delete isCropDragging.value[key]
  }
  delete deliveryImageRefs.value[deliveryId]
  delete deliveryImageContainerRefs.value[deliveryId]
}

function rotateImage(deliveryId: number, direction: 'cw' | 'ccw') {
  const key = imageEditKey(deliveryId)
  const current = deliveryImageRotation.value[key] ?? 0
  const delta = direction === 'cw' ? 90 : -90
  deliveryImageRotation.value[key] = ((current + delta) % 360 + 360) % 360
}

function toggleCropMode(deliveryId: number) {
  const key = imageEditKey(deliveryId)
  const active = deliveryImageCropMode.value[key]
  if (active) {
    deliveryImageCropMode.value[key] = false
    deliveryImageCropRect[key] = null
  } else {
    deliveryImageCropMode.value[key] = true
    deliveryImageCropRect[key] = null
    resetDeliveryImageTransform(deliveryId)
  }
}

function onCropPointerDown(deliveryId: number, e: PointerEvent) {
  const key = imageEditKey(deliveryId)
  const container = deliveryImageContainerRefs.value[deliveryId]
  if (!container) return
  const rect = container.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  deliveryImageCropRect[key] = { startX: x, startY: y, endX: x, endY: y }
  isCropDragging.value[key] = true
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
}

function onCropPointerMove(deliveryId: number, e: PointerEvent) {
  const key = imageEditKey(deliveryId)
  if (!isCropDragging.value[key]) return
  const container = deliveryImageContainerRefs.value[deliveryId]
  if (!container) return
  const rect = container.getBoundingClientRect()
  const crop = deliveryImageCropRect[key]
  if (!crop) return
  crop.endX = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
  crop.endY = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
}

function onCropPointerUp(deliveryId: number) {
  const key = imageEditKey(deliveryId)
  isCropDragging.value[key] = false
  const crop = deliveryImageCropRect[key]
  if (crop) {
    const w = Math.abs(crop.endX - crop.startX)
    const h = Math.abs(crop.endY - crop.startY)
    if (w < 10 || h < 10) {
      deliveryImageCropRect[key] = null
    }
  }
}

function getCropStyle(deliveryId: number) {
  const key = imageEditKey(deliveryId)
  const crop = deliveryImageCropRect[key]
  if (!crop) return {}
  const left = Math.min(crop.startX, crop.endX)
  const top = Math.min(crop.startY, crop.endY)
  const width = Math.abs(crop.endX - crop.startX)
  const height = Math.abs(crop.endY - crop.startY)
  return { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` }
}

function screenToImageCropRect(
  deliveryId: number,
  imgIdx?: number,
): { x: number; y: number; width: number; height: number } | null {
  const key = imgIdx != null ? `${deliveryId}-${imgIdx}` : imageEditKey(deliveryId)
  const crop = deliveryImageCropRect[key]
  const imgEl = deliveryImageRefs.value[deliveryId]
  const container = deliveryImageContainerRefs.value[deliveryId]
  if (!crop || !imgEl || !container) return null

  const natW = imgEl.naturalWidth
  const natH = imgEl.naturalHeight
  const containerRect = container.getBoundingClientRect()
  const cW = containerRect.width
  const cH = containerRect.height

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

  const scale = natW / renderedW
  const imgX = Math.max(0, (left - offsetX) * scale)
  const imgY = Math.max(0, (top - offsetY) * scale)
  const imgW = Math.min(natW - imgX, width * scale)
  const imgH = Math.min(natH - imgY, height * scale)

  if (imgW <= 0 || imgH <= 0) return null
  return { x: Math.round(imgX), y: Math.round(imgY), width: Math.round(imgW), height: Math.round(imgH) }
}

async function collectImageEdits(deliveryId: number) {
  const id = deliveryId
  const detail = deliveryDetailMap.value[id]
  if (!detail) return { replacePhotos: [], replacePhotoFiles: [] as File[] }
  const photoLen = detail.photoFiles.length
  const addedPhotos = newDeliveryPhotos.value[id] ?? []
  const urls = deliveryImageUrls.value[id] ?? []

  const replacePhotos: { photoId: number; fileIndex: number }[] = []
  const replacePhotoFiles: File[] = []

  async function applyEdits(imgIdx: number, sourceFile: File | null) {
    const key = `${id}-${imgIdx}`
    const rotation = deliveryImageRotation.value[key] ?? 0
    const cropRect = screenToImageCropRect(id, imgIdx)
    if (rotation === 0 && !cropRect) return null

    let file: File
    if (sourceFile) {
      file = sourceFile
    } else {
      const url = urls[imgIdx]
      if (!url) return null
      const response = await fetch(url)
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
    if (imgIdx < photoLen) {
      const edited = await applyEdits(imgIdx, null)
      if (edited) {
        const photoFile = detail.photoFiles[imgIdx]
        if (photoFile?.photoId) {
          replacePhotos.push({ photoId: photoFile.photoId, fileIndex: replacePhotoFiles.length })
          replacePhotoFiles.push(edited)
        }
      }
    } else {
      const addedIdx = imgIdx - photoLen
      const edited = await applyEdits(imgIdx, addedPhotos[addedIdx] ?? null)
      if (edited) {
        addedPhotos[addedIdx] = edited
      }
    }
  }

  if (addedPhotos.length > 0) newDeliveryPhotos.value[id] = [...addedPhotos]

  return { replacePhotos, replacePhotoFiles }
}

const mirList = ref<MaterialInspectionRequestResponse[]>([])
const isGeneratingMir = ref<Record<number, boolean>>({})

const showMirDeleteDialog = ref(false)
const mirDeleteTargetId = ref<number | null>(null)
const mirDeleteTargetName = ref('')
const isDeletingMir = ref(false)


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
  const photoLen = detail.photoFiles.length

  if (imgIdx < photoLen) {
    const photoFile = detail.photoFiles[imgIdx]
    if (photoFile?.photoId) {
      if (!deletedPhotoIds.value[id]) deletedPhotoIds.value[id] = []
      deletedPhotoIds.value[id]!.push(photoFile.photoId)
    }
    detail.photoFiles.splice(imgIdx, 1)
    const editState = deliveryEditState.value[id]
    if (editState) editState.photoDescriptions.splice(imgIdx, 1)
  } else {
    const addedIdx = imgIdx - photoLen
    const added = newDeliveryPhotos.value[id]
    if (added) added.splice(addedIdx, 1)
  }

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

const photoInputRefs = ref<Record<number, HTMLInputElement | null>>({})

function triggerPhotoInput(deliveryId: number) {
  photoInputRefs.value[deliveryId]?.click()
}

function onNewPhotosChange(deliveryId: number, event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  const imageFiles = files.filter((f) => f.type.startsWith('image/'))
  if (imageFiles.length < files.length) {
    alert('이미지 파일만 업로드 가능합니다.')
  }
  newDeliveryPhotos.value[deliveryId] = [...(newDeliveryPhotos.value[deliveryId] ?? []), ...imageFiles]
  const urls = deliveryImageUrls.value[deliveryId] ?? []
  deliveryImageUrls.value[deliveryId] = [...urls, ...imageFiles.map((f) => URL.createObjectURL(f))]
  input.value = ''
}

function openCreateDeliveryDialog() {
  createDeliveryDialogOpen.value = true
}

async function onCreateDeliverySubmitted(deliveryId: number) {
  materialSpecs.value = []
  loadOrders()
  await loadDeliveries()
  const newDelivery = deliveries.value.find(
    (d) => d.materialDeliveryId === deliveryId,
  )
  if (newDelivery) {
    await toggleDelivery(newDelivery)
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
    clearImageEditState(deletedId)
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

function openMirDeleteDialog(jobId: number, deliveryName: string) {
  mirDeleteTargetId.value = jobId
  mirDeleteTargetName.value = deliveryName
  showMirDeleteDialog.value = true
}

async function confirmDeleteMir() {
  if (mirDeleteTargetId.value == null) return
  isDeletingMir.value = true
  try {
    const jobId = mirDeleteTargetId.value
    await deleteDocument(materialInspectionRequestRepository, jobId)
    showMirDeleteDialog.value = false
    mirList.value = mirList.value.filter((m) => m.id !== jobId)
    deliveries.value = deliveries.value.map((d) =>
      d.docId === jobId ? { ...d, docId: null, mirDocumentNumber: null } : d,
    )
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
    const created = await createMir(materialInspectionRequestRepository, deliveryId)
    mirList.value = [created, ...mirList.value.filter((m) => m.id !== created.id)]
    deliveries.value = deliveries.value.map((d) =>
      d.materialDeliveryId === deliveryId
        ? { ...d, docId: created.id, mirDocumentNumber: created.docNo ?? d.mirDocumentNumber }
        : d,
    )
    router.push('/helper/document/material-inspection')
    analyticsClient.trackAction('material_delivery', 'create_mir', 'success')
  } catch (error: unknown) {
    console.error('자재반입검수요청서 생성 실패:', error)
    analyticsClient.trackAction('material_delivery', 'create_mir', 'fail')
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    alert(err.response?.data?.message || err.message)
  } finally {
    isGeneratingMir.value[deliveryId] = false
  }
}

async function toggleDelivery(delivery: MaterialDeliverySummary) {
  const id = delivery.materialDeliveryId
  if (expandedDeliveries[id]) {
    expandedDeliveries[id] = false
    deliveryImageUrls.value[id]?.forEach((url) => {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url)
    })
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
    clearImageEditState(id)
    return
  }

  for (const key of Object.keys(expandedDeliveries)) {
    const otherId = Number(key)
    if (expandedDeliveries[otherId]) {
      expandedDeliveries[otherId] = false
      deliveryImageUrls.value[otherId]?.forEach((url) => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url)
      })
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
      clearImageEditState(otherId)
    }
  }

  expandedDeliveries[id] = true
  isLoadingLines.value[id] = true

  try {
    const detail = await materialOrderApi.getMaterialDeliveryDetail(id)
    deliveryDetailMap.value[id] = detail
    deliveryLinesMap.value[id] = detail.deliveryLines

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

    deliveryEditState.value[id] = {
      supplier: detail.supplier,
      deliveryDate: delivery.deliveryDate,
      application: detail.application ?? '',
      divisionId: initDivisionId,
      workTypeId: initWorkTypeId,
      photoDescriptions: detail.photoFiles.map((f) => ({ photoId: f.photoId, description: f.description })),
    }
    deletedLineIds.value[id] = []
    deletedPhotoIds.value[id] = []
    newDeliveryPhotos.value[id] = []
    deliveryImageIndex.value[id] = 0
    deliveryImageScale.value[id] = 1
    deliveryImageTranslate[id] = { x: 0, y: 0 }
    deliveryImageDragging.value[id] = false
    deliveryDragStart[id] = { x: 0, y: 0 }
    deliveryTranslateStart[id] = { x: 0, y: 0 }

    if (detail.photoFiles.length > 0) {
      const settled = await Promise.allSettled(
        detail.photoFiles.map((f) => fileApi.objectUrlByKey(f.url)),
      )
      const blobUrls = settled
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
        .map((r) => r.value)
      if (blobUrls.length > 0) {
        deliveryImageUrls.value[id] = blobUrls
      }
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
  if (deliveryImageCropMode.value[imageEditKey(deliveryId)]) return
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  const current = deliveryImageScale.value[deliveryId] ?? 1
  deliveryImageScale.value[deliveryId] = Math.min(5, Math.max(0.5, current + delta))
}

function onDeliveryImagePointerDown(deliveryId: number, e: PointerEvent) {
  if (deliveryImageCropMode.value[imageEditKey(deliveryId)]) return
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

    const imageEdits = await collectImageEdits(id)

    await materialOrderApi.updateMaterialDelivery(
      id,
      {
        supplier: editState.supplier,
        deliveryDate: editState.deliveryDate,
        application: editState.application,
        workTypeId: editState.workTypeId ? Number(editState.workTypeId) : undefined,
        addLines: addLines.length > 0 ? addLines : undefined,
        updateLines: updateLines.length > 0 ? updateLines : undefined,
        deleteLineIds: deletedLineIds.value[id]?.length ? deletedLineIds.value[id] : undefined,
        photoDescriptions: editState.photoDescriptions,
        deletePhotoIds: deletedPhotoIds.value[id]?.length ? deletedPhotoIds.value[id] : undefined,
        replacePhotos: imageEdits.replacePhotos.length > 0 ? imageEdits.replacePhotos : undefined,
      },
      {
        deliveryPhotos: newDeliveryPhotos.value[id]?.length ? newDeliveryPhotos.value[id] : undefined,
        replacePhotoFiles: imageEdits.replacePhotoFiles.length > 0 ? imageEdits.replacePhotoFiles : undefined,
      },
    )
    expandedDeliveries[id] = false
    delete deliveryDetailMap.value[id]
    delete deliveryLinesMap.value[id]
    delete deliveryEditState.value[id]
    delete deliveryImageUrls.value[id]
    delete deliveryImageIndex.value[id]
    delete deliveryImageScale.value[id]
    delete deliveryImageTranslate[id]
    clearImageEditState(id)
    delete deletedLineIds.value[id]
    delete deletedPhotoIds.value[id]
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
        <Button size="sm" @click="openCreateDeliveryDialog">
          + 반입자재 생성
        </Button>
      </div>

      <!-- 로딩 -->
      <div v-if="isLoadingDeliveries" class="text-sm text-muted-foreground text-center py-8">
        반입자재 목록 로딩 중...
      </div>

      <!-- 반입자재 카드 목록 -->
      <div v-else class="space-y-4">
        <div
          v-for="delivery in filteredDeliveries"
          :key="delivery.materialDeliveryId"
          class="border border-border rounded-lg overflow-hidden"
        >
          <div
            class="bg-muted/30 cursor-pointer select-none"
            @click="toggleDelivery(delivery)"
          >
            <div class="flex items-center gap-3 px-4 py-3">
              <span class="text-xs text-muted-foreground">{{ expandedDeliveries[delivery.materialDeliveryId] ? '▲' : '▼' }}</span>
              <span class="text-xs text-muted-foreground">#{{ delivery.materialDeliveryId }}</span>
              <span class="text-xs text-muted-foreground">{{ delivery.deliveryDate }}</span>
              <span class="text-sm font-medium inline-flex items-center gap-1">
                {{ delivery.materialTypeName }}
                <span @click.stop>
                  <ReferenceEditTrigger type="material" @refresh="loadDeliveries" />
                </span>
              </span>
              <span v-if="delivery.totalQuantity" class="text-sm text-muted-foreground">
                {{ delivery.totalQuantity }}{{ delivery.unit }}
              </span>
              <span v-if="delivery.docId != null" class="text-xs text-muted-foreground">
                문서번호 : {{ delivery.mirDocumentNumber }}
              </span>
              <div class="flex items-center gap-1 ml-auto" @click.stop>
                <Button
                  variant="outline"
                  size="sm"
                  :disabled="!!delivery.mirDocumentNumber || isGeneratingMir[delivery.materialDeliveryId]"
                  @click="generateMir(delivery.materialDeliveryId)"
                >
                  {{ isGeneratingMir[delivery.materialDeliveryId] ? '생성 중...' : '검수요청서 생성' }}
                </Button>
                <template v-if="delivery.docId != null">
                  <Badge variant="secondary">검수요청 완료</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    @click="openMirDeleteDialog(delivery.docId!, delivery.materialTypeName)"
                  >
                    <X class="h-3 w-3" />
                  </Button>
                </template>
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  :disabled="delivery.docId != null"
                  @click="openDeleteDialog(delivery.materialDeliveryId, delivery.materialTypeName)"
                >
                  <X class="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div v-if="expandedDeliveries[delivery.materialDeliveryId]" class="p-4">
            <div v-if="isLoadingLines[delivery.materialDeliveryId]" class="text-sm text-muted-foreground text-center py-8">
              라인 정보 로딩 중...
            </div>

            <template v-else>
              <div class="gap-4" :class="isPortrait ? 'flex flex-col' : 'flex'">
                <!-- 좌측: 이미지 뷰어 -->
                <div class="flex flex-col gap-2" :class="isPortrait ? 'w-full' : 'w-1/2'">
                  <div v-if="isLoadingDeliveryImages[delivery.materialDeliveryId]" class="h-[720px] flex items-center justify-center border border-border rounded-lg bg-muted/20">
                    <p class="text-sm text-muted-foreground">이미지 로딩 중...</p>
                  </div>
                  <template v-else-if="(deliveryImageUrls[delivery.materialDeliveryId] ?? []).length > 0">
                    <div
                      :ref="(el) => { deliveryImageContainerRefs[delivery.materialDeliveryId] = el as HTMLElement }"
                      class="h-[720px] border-4 rounded-lg overflow-hidden bg-muted/20 relative"
                      :class="currentPhotoType(delivery.materialDeliveryId) ? photoTypeBorder[currentPhotoType(delivery.materialDeliveryId)!] : 'border-border'"
                      @wheel="onDeliveryImageWheel(delivery.materialDeliveryId, $event)"
                      @pointerdown="onDeliveryImagePointerDown(delivery.materialDeliveryId, $event)"
                      @pointermove="onDeliveryImagePointerMove(delivery.materialDeliveryId, $event)"
                      @pointerup="onDeliveryImagePointerUp(delivery.materialDeliveryId)"
                    >
                      <img
                        :ref="(el) => { deliveryImageRefs[delivery.materialDeliveryId] = el as HTMLImageElement }"
                        :src="deliveryImageUrls[delivery.materialDeliveryId]?.[deliveryImageIndex[delivery.materialDeliveryId] ?? 0]"
                        alt="반입자재 이미지"
                        class="w-full h-full object-contain select-none"
                        draggable="false"
                        :style="{
                          transform: `translate(${deliveryImageTranslate[delivery.materialDeliveryId]?.x ?? 0}px, ${deliveryImageTranslate[delivery.materialDeliveryId]?.y ?? 0}px) scale(${deliveryImageScale[delivery.materialDeliveryId] ?? 1}) rotate(${deliveryImageRotation[imageEditKey(delivery.materialDeliveryId)] ?? 0}deg)`,
                          transformOrigin: 'center center',
                          transition: deliveryImageDragging[delivery.materialDeliveryId] ? 'none' : 'transform 0.15s ease',
                        }"
                      />
                      <div
                        v-if="deliveryImageCropMode[imageEditKey(delivery.materialDeliveryId)]"
                        class="absolute inset-0 cursor-crosshair z-10"
                        @pointerdown="onCropPointerDown(delivery.materialDeliveryId, $event)"
                        @pointermove="onCropPointerMove(delivery.materialDeliveryId, $event)"
                        @pointerup="onCropPointerUp(delivery.materialDeliveryId)"
                      >
                        <div
                          v-if="deliveryImageCropRect[imageEditKey(delivery.materialDeliveryId)]"
                          class="absolute border-2 border-dashed border-blue-500 bg-blue-500/10 pointer-events-none"
                          :style="getCropStyle(delivery.materialDeliveryId)"
                        />
                      </div>
                      <div class="absolute top-2 right-2 flex items-center gap-1.5 bg-background/80 rounded-md border border-border px-2 py-1 z-20">
                        <Button variant="ghost" size="sm" class="h-8 w-8 p-0" title="회전" @click="rotateImage(delivery.materialDeliveryId, 'ccw')">
                          <RotateCcw class="h-5 w-5" />
                        </Button>
                        <Button
                          :variant="deliveryImageCropMode[imageEditKey(delivery.materialDeliveryId)] ? 'default' : 'ghost'"
                          size="sm"
                          class="h-8 w-8 p-0"
                          title="자르기"
                          @click="toggleCropMode(delivery.materialDeliveryId)"
                        >
                          <Crop class="h-5 w-5" />
                        </Button>
                      </div>
                      <div class="absolute bottom-2 right-2 flex items-center gap-1 bg-background/80 rounded-md border border-border px-1.5 py-0.5">
                        <Button variant="ghost" size="sm" class="h-6 w-6 p-0" @click="deliveryImageScale[delivery.materialDeliveryId] = Math.max(0.5, (deliveryImageScale[delivery.materialDeliveryId] ?? 1) - 0.25)">−</Button>
                        <span class="text-xs text-muted-foreground min-w-[3ch] text-center">{{ Math.round((deliveryImageScale[delivery.materialDeliveryId] ?? 1) * 100) }}%</span>
                        <Button variant="ghost" size="sm" class="h-6 w-6 p-0" @click="deliveryImageScale[delivery.materialDeliveryId] = Math.min(5, (deliveryImageScale[delivery.materialDeliveryId] ?? 1) + 0.25)">+</Button>
                        <Button v-if="(deliveryImageScale[delivery.materialDeliveryId] ?? 1) !== 1" variant="ghost" size="sm" class="h-6 px-1 text-xs" @click="resetDeliveryImageTransform(delivery.materialDeliveryId)">초기화</Button>
                      </div>
                    </div>
                    <!-- 현재 이미지 설명 -->
                    <div
                      v-if="deliveryEditState[delivery.materialDeliveryId] && deliveryDetailMap[delivery.materialDeliveryId] && (deliveryImageIndex[delivery.materialDeliveryId] ?? 0) < deliveryDetailMap[delivery.materialDeliveryId]!.photoFiles.length"
                      class="shrink-0"
                    >
                      <Input
                        v-model="deliveryEditState[delivery.materialDeliveryId]!.photoDescriptions[(deliveryImageIndex[delivery.materialDeliveryId] ?? 0)]!.description"
                        class="h-8 text-sm"
                        placeholder="사진 설명"
                      />
                    </div>
                    <!-- 페이지 넘기기 -->
                    <div v-if="(deliveryImageUrls[delivery.materialDeliveryId] ?? []).length > 0" class="flex items-center justify-center gap-3 shrink-0">
                      <Button v-if="(deliveryImageUrls[delivery.materialDeliveryId] ?? []).length > 1" variant="outline" size="sm" @click="prevDeliveryImage(delivery.materialDeliveryId)">
                        ← 이전
                      </Button>
                      <span
                        v-if="currentPhotoType(delivery.materialDeliveryId)"
                        class="text-sm font-medium"
                        :class="photoTypeText[currentPhotoType(delivery.materialDeliveryId)!]"
                      >
                        {{ photoTypeLabels[currentPhotoType(delivery.materialDeliveryId)!] }}
                      </span>
                      <span v-else class="text-sm font-medium text-muted-foreground">신규</span>
                      <span class="text-sm text-muted-foreground">
                        {{ (deliveryImageIndex[delivery.materialDeliveryId] ?? 0) + 1 }} / {{ (deliveryImageUrls[delivery.materialDeliveryId] ?? []).length }}
                      </span>
                      <Button v-if="(deliveryImageUrls[delivery.materialDeliveryId] ?? []).length > 1" variant="outline" size="sm" @click="nextDeliveryImage(delivery.materialDeliveryId)">
                        다음 →
                      </Button>
                    </div>
                    <div v-if="deliveryEditState[delivery.materialDeliveryId]" class="flex items-center justify-center gap-2">
                      <Button variant="outline" size="sm" @click="triggerPhotoInput(delivery.materialDeliveryId)">
                        사진 추가
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
                        :ref="(el) => { photoInputRefs[delivery.materialDeliveryId] = el as HTMLInputElement }"
                        type="file"
                        multiple
                        accept="image/*"
                        class="hidden"
                        @change="onNewPhotosChange(delivery.materialDeliveryId, $event)"
                      />
                    </div>
                    <div v-if="newDeliveryPhotos[delivery.materialDeliveryId]?.length" class="text-xs text-muted-foreground text-center">
                      사진 {{ newDeliveryPhotos[delivery.materialDeliveryId]!.length }}건 추가됨 (수정하기 시 저장)
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

                  <!-- 사용부위 -->
                  <div class="space-y-1.5">
                    <Label>사용부위</Label>
                    <Input
                      v-model="deliveryEditState[delivery.materialDeliveryId]!.application"
                      placeholder="사용부위 (예: 지하1층 기둥)"
                    />
                  </div>

                  <!-- 행 추가 버튼 -->
                  <Button
                    variant="outline"
                    size="sm"
                    :disabled="delivery.docId != null"
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

                  <div class="flex justify-end">
                    <Button
                      :disabled="isUpdatingDelivery[delivery.materialDeliveryId] || delivery.docId != null"
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

    <!-- 반입자재 생성 다이얼로그 -->
    <MaterialDeliveryCreateDialog
      v-model:open="createDeliveryDialogOpen"
      @submitted="onCreateDeliverySubmitted"
    />

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

  </PageContainer>
</template>
