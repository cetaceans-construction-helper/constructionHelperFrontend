import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { AxisLine, CcodeFilter, Drawing, Object2D, ToolMode, ViewTransform } from '../model/types'
import { drawingApi, type DrawingResponse } from '../infra/drawing-api'
import { drawingAxisApi, type DrawingAxisResponse } from '../infra/drawing-axis-api'
import { object2dApi, type Object2DResponse } from '../infra/object2d-api'

// --- DTO → 프론트 타입 변환 ---

function toAxisLine(res: DrawingAxisResponse): AxisLine {
  return { id: res.id, type: res.isX ? 'x' : 'y', label: res.name, position: res.position }
}

function toObject2D(res: Object2DResponse): Object2D {
  return {
    id: res.id,
    drawingId: res.drawingId,
    lt: { x: res.ltX, y: res.ltY },
    rb: { x: res.rbX, y: res.rbY },
    componentCodeId: res.componentCodeId,
    componentCode: res.componentCode,
    componentTypeName: res.componentTypeName,
    componentDivisionName: res.componentDivisionName,
    gridLabel: res.axisLabel || null,
  }
}

function toDrawing(res: DrawingResponse, imageWidth = 50000, imageHeight = 30000): Drawing {
  return {
    id: res.id,
    zoneId: res.zoneId,
    floorId: res.floorId,
    imageUrl: res.imageUrl,
    posX: res.posX,
    posY: res.posY,
    scaleX: res.scaleX,
    scaleY: res.scaleY,
    imageWidth,
    imageHeight,
  }
}

export const useFloorPlanStore = defineStore('floorPlan', () => {
  // --- 프로젝트 공통 축 ---
  const xAxes = ref<AxisLine[]>([])
  const yAxes = ref<AxisLine[]>([])

  // --- 도면 ---
  const currentDrawing = ref<Drawing | null>(null)
  const currentImage = ref<HTMLImageElement | null>(null)
  const currentObjects = ref<Object2D[]>([])
  const drawingList = ref<DrawingResponse[]>([])

  // --- 현재 선택 (sessionStorage에서 복원) ---
  const savedZoneId = sessionStorage.getItem('floorPlan:zoneId')
  const savedFloorId = sessionStorage.getItem('floorPlan:floorId')
  const currentZoneId = ref<number | null>(savedZoneId != null ? Number(savedZoneId) : null)
  const currentFloorId = ref<number | null>(savedFloorId != null ? Number(savedFloorId) : null)

  const sortedXAxes = computed(() => [...xAxes.value].sort((a, b) => a.position - b.position))
  const sortedYAxes = computed(() => [...yAxes.value].sort((a, b) => a.position - b.position))

  // --- UI 상태 ---
  const selectedBoxIds = ref<Set<number>>(new Set())
  const activeMode = ref<ToolMode>('select')
  const transform = ref<ViewTransform>({ offsetX: 0, offsetY: 0, scale: 0.02 })
  const ccodeFilter = ref<CcodeFilter>({
    componentDivisionId: null,
    componentTypeId: null,
    componentCodeId: null,
  })

  const filteredObjectIds = computed<Set<number>>(() => {
    const f = ccodeFilter.value
    if (!f.componentCodeId) return new Set(currentObjects.value.map((o) => o.id))
    const ids = new Set<number>()
    for (const obj of currentObjects.value) {
      if (obj.componentCodeId === f.componentCodeId) ids.add(obj.id)
    }
    return ids
  })

  const selectedObjects = computed(() =>
    currentObjects.value.filter((o) => selectedBoxIds.value.has(o.id)),
  )

  // --- 초기 로딩 ---

  async function loadAxes() {
    try {
      const list = await drawingAxisApi.getDrawingAxisList()
      xAxes.value = list.filter((a) => a.isX).map(toAxisLine)
      yAxes.value = list.filter((a) => !a.isX).map(toAxisLine)
    } catch (e: any) {
      console.error('축 로딩 실패:', e)
      const msg = e.response?.data?.message || e.message
      alert(msg)
    }
  }

  async function loadDrawingList() {
    try {
      drawingList.value = await drawingApi.getDrawingList()
    } catch (e: any) {
      console.error('도면 목록 로딩 실패:', e)
      const msg = e.response?.data?.message || e.message
      alert(msg)
    }
  }

  // --- 도면 전환 ---

  let savePlacementTimer: ReturnType<typeof setTimeout> | null = null

  function debouncedSaveImagePlacement() {
    if (savePlacementTimer) clearTimeout(savePlacementTimer)
    savePlacementTimer = setTimeout(() => {
      saveImagePlacement()
    }, 500)
  }

  async function switchDrawing(zoneId: number | null, floorId: number) {
    if (savePlacementTimer) clearTimeout(savePlacementTimer)
    selectedBoxIds.value = new Set()
    currentDrawing.value = null
    currentImage.value = null
    currentObjects.value = []
    currentZoneId.value = zoneId
    currentFloorId.value = floorId

    if (zoneId != null) sessionStorage.setItem('floorPlan:zoneId', String(zoneId))
    else sessionStorage.removeItem('floorPlan:zoneId')
    sessionStorage.setItem('floorPlan:floorId', String(floorId))

    try {
      const res = await drawingApi.getDrawingByLocation(zoneId, floorId)
      await applyDrawingResponse(res)
    } catch (e: any) {
      if (e.response?.status === 404) {
        // 도면 없음 — 새로 생성
        try {
          const res = await drawingApi.createDrawing({ zoneId, floorId })
          await applyDrawingResponse(res)
        } catch (createErr: any) {
          console.error('도면 생성 실패:', createErr)
          const msg = createErr.response?.data?.message || createErr.message
          alert(msg)
        }
      } else {
        console.error('도면 로딩 실패:', e)
        const msg = e.response?.data?.message || e.message
        alert(msg)
      }
    }
  }

  async function applyDrawingResponse(res: DrawingResponse) {
    // 이미지 로딩
    let imgW = 50000
    let imgH = 30000
    if (res.imageUrl) {
      try {
        const img = await loadImage(res.imageUrl)
        currentImage.value = img
        imgW = img.naturalWidth * res.scaleX
        imgH = img.naturalHeight * res.scaleY
      } catch {
        currentImage.value = null
      }
    } else {
      currentImage.value = null
    }

    currentDrawing.value = toDrawing(res, imgW, imgH)

    // object2d 로딩
    try {
      const objs = await object2dApi.getObject2dList(res.id)
      currentObjects.value = objs.map(toObject2D)
    } catch {
      currentObjects.value = []
    }

    centerOnAxes()
  }

  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  // --- 이미지 업로드 ---

  async function uploadDrawingImage(file: File) {
    let d = currentDrawing.value

    if (!d) {
      const zoneId = currentZoneId.value
      const floorId = currentFloorId.value
      if (floorId == null) return

      try {
        const res = await drawingApi.createDrawing({ zoneId, floorId }, file)
        await applyDrawingResponse(res)
        return
      } catch (e: any) {
        console.error('도면 생성 실패:', e)
        const msg = e.response?.data?.message || e.message
        alert(msg)
        return
      }
    }

    try {
      const res = await drawingApi.updateDrawing(d.id, {}, file)
      const img = await loadImage(res.imageUrl!)
      currentImage.value = img
      currentDrawing.value = toDrawing(res, img.naturalWidth * res.scaleX, img.naturalHeight * res.scaleY)
    } catch (e: any) {
      console.error('이미지 업로드 실패:', e)
      const msg = e.response?.data?.message || e.message
      alert(msg)
    }
  }

  // --- 이미지 배치 저장 ---

  async function saveImagePlacement() {
    const d = currentDrawing.value
    const img = currentImage.value
    if (!d || !img) return

    const scaleX = d.imageWidth / img.naturalWidth
    const scaleY = d.imageHeight / img.naturalHeight

    try {
      await drawingApi.updateDrawing(d.id, {
        posX: Math.round(d.posX),
        posY: Math.round(d.posY),
        scaleX,
        scaleY,
      })
    } catch (e: any) {
      console.error('도면 배치 저장 실패:', e)
      const msg = e.response?.data?.message || e.message
      alert(msg)
    }
  }

  // --- 이미지 배치 조정 (로컬, 나중에 saveImagePlacement로 저장) ---

  function moveImage(dx: number, dy: number) {
    if (!currentDrawing.value) return
    currentDrawing.value = { ...currentDrawing.value, posX: currentDrawing.value.posX + dx, posY: currentDrawing.value.posY + dy }
    debouncedSaveImagePlacement()
  }

  function setImagePlacement(x: number, y: number, width: number, height: number) {
    if (!currentDrawing.value) return
    currentDrawing.value = {
      ...currentDrawing.value,
      posX: Math.round(x),
      posY: Math.round(y),
      imageWidth: Math.max(100, Math.round(width)),
      imageHeight: Math.max(100, Math.round(height)),
    }
    debouncedSaveImagePlacement()
  }

  // --- 축 CRUD (API) ---

  async function addAxis(type: 'x' | 'y', position: number, name?: string) {
    const prefix = type === 'x' ? 'X' : 'Y'
    const axes = type === 'x' ? xAxes : yAxes
    const axisName = name ?? `${prefix}${axes.value.length + 1}`

    try {
      const res = await drawingAxisApi.createDrawingAxis({ isX: type === 'x', name: axisName, position: Math.round(position) })
      axes.value = [...axes.value, toAxisLine(res)]
      await reloadCurrentObjects()
    } catch (e: any) {
      console.error('축 생성 실패:', e)
      const msg = e.response?.data?.message || e.message
      alert(msg)
    }
  }

  async function updateAxisValue(axisId: number, position: number) {
    try {
      const res = await drawingAxisApi.updateDrawingAxis(axisId, { position: Math.round(position) })
      replaceAxis(res)
      await reloadCurrentObjects()
    } catch (e: any) {
      console.error('축 위치 수정 실패:', e)
      const msg = e.response?.data?.message || e.message
      alert(msg)
    }
  }

  async function updateAxisValues(updates: { axisId: number; position: number }[]) {
    try {
      const results = await Promise.all(
        updates.map(({ axisId, position }) =>
          drawingAxisApi.updateDrawingAxis(axisId, { position: Math.round(position) }),
        ),
      )
      for (const res of results) {
        replaceAxis(res)
      }
      await reloadCurrentObjects()
    } catch (e: any) {
      console.error('축 위치 수정 실패:', e)
      const msg = e.response?.data?.message || e.message
      alert(msg)
    }
  }

  async function updateAxisLabel(axisId: number, label: string) {
    try {
      const res = await drawingAxisApi.updateDrawingAxis(axisId, { name: label })
      replaceAxis(res)
      await reloadCurrentObjects()
    } catch (e: any) {
      console.error('축 이름 수정 실패:', e)
      const msg = e.response?.data?.message || e.message
      alert(msg)
    }
  }

  async function removeAxis(axisId: number) {
    try {
      await drawingAxisApi.deleteDrawingAxis(axisId)
      xAxes.value = xAxes.value.filter((a) => a.id !== axisId)
      yAxes.value = yAxes.value.filter((a) => a.id !== axisId)
      await reloadCurrentObjects()
    } catch (e: any) {
      console.error('축 삭제 실패:', e)
      const msg = e.response?.data?.message || e.message
      alert(msg)
    }
  }

  function replaceAxis(res: DrawingAxisResponse) {
    const axis = toAxisLine(res)
    if (axis.type === 'x') {
      xAxes.value = xAxes.value.map((a) => (a.id === axis.id ? axis : a))
    } else {
      yAxes.value = yAxes.value.map((a) => (a.id === axis.id ? axis : a))
    }
  }

  // --- Object2D CRUD (API) ---

  async function addObject(lt: { x: number; y: number }, rb: { x: number; y: number }) {
    const d = currentDrawing.value
    if (!d) return

    try {
      const res = await object2dApi.createObject2d({
        drawingId: d.id,
        ltX: Math.round(Math.min(lt.x, rb.x)),
        ltY: Math.round(Math.min(lt.y, rb.y)),
        rbX: Math.round(Math.max(lt.x, rb.x)),
        rbY: Math.round(Math.max(lt.y, rb.y)),
      })
      currentObjects.value = [...currentObjects.value, toObject2D(res)]
    } catch (e: any) {
      console.error('부재 생성 실패:', e)
      const msg = e.response?.data?.message || e.message
      alert(msg)
    }
  }

  async function removeObject(id: number) {
    try {
      await object2dApi.deleteObject2d(id)
      currentObjects.value = currentObjects.value.filter((o) => o.id !== id)
      selectedBoxIds.value = new Set([...selectedBoxIds.value].filter((sid) => sid !== id))
    } catch (e: any) {
      console.error('부재 삭제 실패:', e)
      const msg = e.response?.data?.message || e.message
      alert(msg)
    }
  }

  async function updateObjectCcode(ids: Set<number>, ccodeId: number | null) {
    if (ids.size === 0 || ccodeId == null) return

    try {
      await object2dApi.updateObject2dList({ objectIds: [...ids], componentCodeId: ccodeId })
      await reloadCurrentObjects()
    } catch (e: any) {
      console.error('부재코드 매핑 실패:', e)
      const msg = e.response?.data?.message || e.message
      alert(msg)
    }
  }

  async function reloadCurrentObjects() {
    const d = currentDrawing.value
    if (!d) return
    try {
      const objs = await object2dApi.getObject2dList(d.id)
      currentObjects.value = objs.map(toObject2D)
    } catch {
      // silent
    }
  }

  // --- 뷰 ---

  function centerOnAxes() {
    const xa = xAxes.value
    const ya = yAxes.value
    if (xa.length === 0 && ya.length === 0) {
      transform.value = { offsetX: 400, offsetY: 300, scale: 0.02 }
      return
    }

    const minX = xa.length > 0 ? Math.min(...xa.map((a) => a.position)) : 0
    const maxX = xa.length > 0 ? Math.max(...xa.map((a) => a.position)) : 0
    const minY = ya.length > 0 ? Math.min(...ya.map((a) => a.position)) : 0
    const maxY = ya.length > 0 ? Math.max(...ya.map((a) => a.position)) : 0

    const spanX = maxX - minX || 10000
    const spanY = maxY - minY || 10000
    const centerMmX = (minX + maxX) / 2
    const centerMmY = (minY + maxY) / 2

    const canvasW = 800
    const canvasH = 600
    const fitScale = Math.min((canvasW * 0.7) / spanX, (canvasH * 0.7) / spanY)

    transform.value = {
      scale: fitScale,
      offsetX: canvasW / 2 - centerMmX * fitScale,
      offsetY: canvasH / 2 + centerMmY * fitScale,
    }
  }

  function resetTransform() { centerOnAxes() }

  // --- 선택 ---
  function selectBox(id: number) { selectedBoxIds.value = new Set([id]) }
  function toggleSelectBox(id: number) {
    const next = new Set(selectedBoxIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selectedBoxIds.value = next
  }
  function selectBoxesInRect(lt: { x: number; y: number }, rb: { x: number; y: number }) {
    const minX = Math.min(lt.x, rb.x), maxX = Math.max(lt.x, rb.x)
    const minY = Math.min(lt.y, rb.y), maxY = Math.max(lt.y, rb.y)
    const ids = new Set<number>()
    for (const obj of currentObjects.value) {
      if (obj.rb.x >= minX && obj.lt.x <= maxX && obj.rb.y >= minY && obj.lt.y <= maxY) ids.add(obj.id)
    }
    selectedBoxIds.value = ids
  }
  function clearSelection() { selectedBoxIds.value = new Set() }

  function setCcodeFilter(f: Partial<CcodeFilter>) { ccodeFilter.value = { ...ccodeFilter.value, ...f } }
  function clearCcodeFilter() { ccodeFilter.value = { componentDivisionId: null, componentTypeId: null, componentCodeId: null } }

  return {
    xAxes, yAxes, sortedXAxes, sortedYAxes,
    drawingList, currentDrawing, currentImage, currentObjects,
    currentZoneId, currentFloorId,
    selectedBoxIds, activeMode, transform, ccodeFilter,
    filteredObjectIds, selectedObjects,
    loadAxes, loadDrawingList,
    switchDrawing, uploadDrawingImage, saveImagePlacement,
    moveImage, setImagePlacement,
    addAxis, updateAxisValue, updateAxisValues, updateAxisLabel, removeAxis,
    addObject, removeObject, updateObjectCcode,
    centerOnAxes, resetTransform,
    selectBox, toggleSelectBox, selectBoxesInRect, clearSelection,
    setCcodeFilter, clearCcodeFilter,
  }
})
