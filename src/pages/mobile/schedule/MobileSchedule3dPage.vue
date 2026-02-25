<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { useEngine } from '@/composables/useEngine'
import { object3dApi } from '@/api/object3d'
import { taskApi } from '@/api/task'
import { projectApi } from '@/api/project'
import { useProjectStore } from '@/stores/project'
import type { Object3d, Task } from '@/types/object3d'
import MobileViewer3dArea from './components/MobileViewer3dArea.vue'
import MiniMap2d from './components/MiniMap2d.vue'
import MobileTaskDetailPanel from './components/MobileTaskDetailPanel.vue'
import type {
  MiniMapBounds,
  MiniMapCameraPose,
  MiniMapFloorData,
  MiniMapMovePayload,
  MiniMapPoint,
  MiniMapPolygon,
} from './types'

let prevHtmlOverflow = ''
let prevBodyOverflow = ''
let removeControlsListener: (() => void) | null = null
let removeLookControlListeners: (() => void) | null = null
const projectStore = useProjectStore()

const canvasContainer = ref<HTMLDivElement | null>(null)
const isInitializing = ref(false)
const initError = ref<string | null>(null)
const modelCount = ref(0)
const selectedObject3dId = ref<number | null>(null)
const selectedFloorKey = ref<string | null>(null)
const selectedTaskId = ref<number | null>(null)
const object3dMetaById = ref<Map<number, Object3d>>(new Map())
const objectMeshById = ref<Map<number, THREE.Object3D>>(new Map())
const minimapFloors = ref<MiniMapFloorData[]>([])
const selectedTasks = ref<Task[]>([])
const isLoadingTasks = ref(false)
const taskLoadError = ref<string | null>(null)
const navigationPosition = ref<MiniMapPoint | null>(null)
const navigationEyeY = ref<number | null>(null)
const viewDistance = ref(12)
const cameraPose = ref<MiniMapCameraPose | null>(null)
const minimapObjectCount = computed(() =>
  minimapFloors.value.reduce((sum, floor) => sum + floor.polygons.length, 0),
)
const selectedObject3d = computed(() => {
  if (selectedObject3dId.value == null) return null
  return object3dMetaById.value.get(selectedObject3dId.value) ?? null
})

const { isLoading, loadProgress, loadError, init, loadApiModel, getEngine } = useEngine(
  canvasContainer,
  {
    enableShadows: false,
    backgroundColor: 0xe7f6ff,
  },
)

function getErrorMessage(error: unknown): string {
  const err = error as { response?: { data?: { message?: string } }; message?: string }
  return err.response?.data?.message || err.message || '알 수 없는 오류가 발생했습니다.'
}

async function ensureProjectSelected() {
  if (projectStore.selectedProjectId) return

  const projects = await projectApi.getProjects()
  const firstProject = projects[0]
  if (!firstProject) {
    throw new Error('조회 가능한 프로젝트가 없습니다.')
  }
  projectStore.setProject(firstProject.id)
}

function enableMobileControls() {
  const engine = getEngine()
  const controls = engine?.getControls()
  if (!controls) return

  controls.enableRotate = false
  controls.enablePan = false
  controls.enableZoom = false
  controls.rotateSpeed = 0.8
  controls.panSpeed = 0.9
  controls.zoomSpeed = 0.9
  controls.touches.ONE = THREE.TOUCH.PAN
  controls.touches.TWO = THREE.TOUCH.PAN
  controls.update()
}

function getFloorKey(meta: Pick<Object3d, 'floorId'>): string {
  return meta.floorId != null ? `floor:${meta.floorId}` : 'floor:unknown'
}

function getFloorLabel(meta: Pick<Object3d, 'floorName'>): string {
  return meta.floorName?.trim() || '층 미지정'
}

const HARDCODED_FLOOR_BASE_Y: Record<number, number> = {
  1: 158,
  2: 1689,
  3: 3221,
  4: 4753,
}

const EYE_HEIGHT_OFFSET = 600

function parseFloorNumber(floorLabel: string): number | null {
  const normalized = floorLabel.trim().toLowerCase()
  if (!normalized) return null
  if (normalized.startsWith('b') || floorLabel.includes('지하')) return null

  const match = normalized.match(/(\d+)/)
  if (!match) return null
  const value = Number.parseInt(match[1] ?? '', 10)
  return Number.isFinite(value) ? value : null
}

function resolveHardcodedFloorBaseY(floorKey: string, floorLabel: string): number | null {
  const keyMatch = floorKey.match(/^floor:(\d+)$/)
  if (keyMatch?.[1]) {
    const floorId = Number.parseInt(keyMatch[1], 10)
    if (Object.prototype.hasOwnProperty.call(HARDCODED_FLOOR_BASE_Y, floorId)) {
      const hardcoded = HARDCODED_FLOOR_BASE_Y[floorId]
      if (hardcoded !== undefined) return hardcoded
    }
  }

  const floorNumber = parseFloorNumber(floorLabel)
  if (floorNumber && Object.prototype.hasOwnProperty.call(HARDCODED_FLOOR_BASE_Y, floorNumber)) {
    const hardcoded = HARDCODED_FLOOR_BASE_Y[floorNumber]
    if (hardcoded !== undefined) return hardcoded
  }

  return null
}

function computeBounds(points: MiniMapPoint[]): MiniMapBounds {
  if (points.length === 0) {
    return { minX: 0, maxX: 1, minY: 0, maxY: 1 }
  }

  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const point of points) {
    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
    minY = Math.min(minY, point.y)
    maxY = Math.max(maxY, point.y)
  }

  if (minX === maxX) {
    minX -= 0.5
    maxX += 0.5
  }
  if (minY === maxY) {
    minY -= 0.5
    maxY += 0.5
  }

  const paddingX = (maxX - minX) * 0.08
  const paddingY = (maxY - minY) * 0.08

  return {
    minX: minX - paddingX,
    maxX: maxX + paddingX,
    minY: minY - paddingY,
    maxY: maxY + paddingY,
  }
}

function computeCentroid(points: MiniMapPoint[]): MiniMapPoint {
  if (points.length === 0) return { x: 0, y: 0 }
  if (points.length < 3) {
    const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), {
      x: 0,
      y: 0,
    })
    return { x: sum.x / points.length, y: sum.y / points.length }
  }

  let area = 0
  let cx = 0
  let cy = 0

  for (let i = 0; i < points.length; i += 1) {
    const current = points[i]
    const next = points[(i + 1) % points.length]
    if (!current || !next) continue
    const cross = current.x * next.y - next.x * current.y
    area += cross
    cx += (current.x + next.x) * cross
    cy += (current.y + next.y) * cross
  }

  if (Math.abs(area) < 1e-8) {
    const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), {
      x: 0,
      y: 0,
    })
    return { x: sum.x / points.length, y: sum.y / points.length }
  }

  const factor = 1 / (3 * area)
  return { x: cx * factor, y: cy * factor }
}

function cross(o: MiniMapPoint, a: MiniMapPoint, b: MiniMapPoint): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
}

function convexHull(points: MiniMapPoint[]): MiniMapPoint[] {
  if (points.length <= 1) return [...points]

  const unique = new Map<string, MiniMapPoint>()
  for (const point of points) {
    const key = `${point.x.toFixed(4)}:${point.y.toFixed(4)}`
    if (!unique.has(key)) {
      unique.set(key, point)
    }
  }

  const sorted = Array.from(unique.values()).sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x))
  if (sorted.length <= 2) return sorted

  const lower: MiniMapPoint[] = []
  for (const point of sorted) {
    while (lower.length >= 2) {
      const prev2 = lower[lower.length - 2]
      const prev1 = lower[lower.length - 1]
      if (!prev2 || !prev1 || cross(prev2, prev1, point) > 0) break
      lower.pop()
    }
    lower.push(point)
  }

  const upper: MiniMapPoint[] = []
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index]
    if (!point) continue
    while (upper.length >= 2) {
      const prev2 = upper[upper.length - 2]
      const prev1 = upper[upper.length - 1]
      if (!prev2 || !prev1 || cross(prev2, prev1, point) > 0) break
      upper.pop()
    }
    upper.push(point)
  }

  lower.pop()
  upper.pop()
  return [...lower, ...upper]
}

function getBoundsFromPoints(points: MiniMapPoint[]): MiniMapBounds {
  if (points.length === 0) {
    return { minX: -0.5, maxX: 0.5, minY: -0.5, maxY: 0.5 }
  }

  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const point of points) {
    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
    minY = Math.min(minY, point.y)
    maxY = Math.max(maxY, point.y)
  }

  if (minX === maxX) {
    minX -= 0.5
    maxX += 0.5
  }
  if (minY === maxY) {
    minY -= 0.5
    maxY += 0.5
  }

  return { minX, maxX, minY, maxY }
}

function toRectPolygon(points: MiniMapPoint[]): MiniMapPoint[] {
  const bounds = getBoundsFromPoints(points)
  return [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ]
}

function extractMeshSamplePoints(mesh: THREE.Mesh): MiniMapPoint[] {
  const geometry = mesh.geometry
  const position = geometry.getAttribute('position')

  if (!position || position.count === 0) {
    const box = new THREE.Box3().setFromObject(mesh)
    return [
      { x: box.min.x, y: box.min.z },
      { x: box.max.x, y: box.min.z },
      { x: box.max.x, y: box.max.z },
      { x: box.min.x, y: box.max.z },
    ]
  }

  const sampleStep = Math.max(1, Math.floor(position.count / 700))
  const localPoint = new THREE.Vector3()
  const worldPoint = new THREE.Vector3()
  const points: MiniMapPoint[] = []

  for (let i = 0; i < position.count; i += sampleStep) {
    localPoint.set(position.getX(i), position.getY(i), position.getZ(i))
    worldPoint.copy(localPoint)
    mesh.localToWorld(worldPoint)
    points.push({ x: worldPoint.x, y: worldPoint.z })
  }

  return points
}

function getFloorBaseY(candidates: number[]): number {
  if (candidates.length === 0) return 0

  const sorted = [...candidates].sort((a, b) => a - b)
  const first = sorted[0]
  if (first == null) return 0
  const percentileIndex = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * 0.2))
  const value = sorted[percentileIndex] ?? first
  return Number.isFinite(value) ? value : first
}

function syncSelectedObject(dbId: number | null) {
  const prevSelectedId = selectedObject3dId.value
  selectedObject3dId.value = dbId
  if (prevSelectedId !== dbId) {
    selectedTaskId.value = null
  }
  if (dbId == null) return

  const meta = object3dMetaById.value.get(dbId)
  if (!meta) return

  selectedFloorKey.value = getFloorKey(meta)
}

let taskLoadRequestSeq = 0

async function loadTasksForSelectedObject(object3dId: number | null) {
  taskLoadRequestSeq += 1
  const requestSeq = taskLoadRequestSeq

  if (object3dId == null) {
    selectedTasks.value = []
    isLoadingTasks.value = false
    taskLoadError.value = null
    return
  }

  isLoadingTasks.value = true
  taskLoadError.value = null
  try {
    const tasks = await taskApi.getTaskList(object3dId)
    if (requestSeq !== taskLoadRequestSeq) return
    selectedTasks.value = tasks
  } catch (error) {
    if (requestSeq !== taskLoadRequestSeq) return
    selectedTasks.value = []
    taskLoadError.value = getErrorMessage(error)
  } finally {
    if (requestSeq === taskLoadRequestSeq) {
      isLoadingTasks.value = false
    }
  }
}

function captureNavigationAnchorFromCamera() {
  const engine = getEngine()
  if (!engine) return

  const camera = engine.getCamera()
  const controls = engine.getControls()
  navigationPosition.value = {
    x: camera.position.x,
    y: camera.position.z,
  }
  navigationEyeY.value = camera.position.y
  if (controls) {
    viewDistance.value = Math.max(controls.target.distanceTo(camera.position), 3)
  }
}

function updateCameraPose() {
  const engine = getEngine()
  if (!engine) {
    cameraPose.value = null
    return
  }

  const camera = engine.getCamera()
  const forward = new THREE.Vector3()
  camera.getWorldDirection(forward)
  const horizontal = new THREE.Vector2(forward.x, forward.z)
  if (horizontal.lengthSq() < 1e-8) {
    horizontal.set(0, -1)
  } else {
    horizontal.normalize()
  }

  cameraPose.value = {
    position: navigationPosition.value ?? { x: camera.position.x, y: camera.position.z },
    direction: {
      x: horizontal.x,
      y: horizontal.y,
    },
  }
}

function bindCameraPoseSync() {
  removeControlsListener?.()
  removeControlsListener = null

  const engine = getEngine()
  const controls = engine?.getControls()
  if (!controls) {
    updateCameraPose()
    return
  }

  const onChange = () => updateCameraPose()
  controls.addEventListener('change', onChange)
  removeControlsListener = () => {
    controls.removeEventListener('change', onChange)
  }

  updateCameraPose()
}

function readYawPitchFromCamera(): { yaw: number; pitch: number } | null {
  const engine = getEngine()
  if (!engine) return null

  const direction = new THREE.Vector3()
  engine.getCamera().getWorldDirection(direction)
  if (direction.lengthSq() < 1e-8) return null
  direction.normalize()

  return {
    yaw: Math.atan2(direction.x, direction.z),
    pitch: Math.asin(THREE.MathUtils.clamp(direction.y, -0.9999, 0.9999)),
  }
}

function directionFromYawPitch(yaw: number, pitch: number): THREE.Vector3 {
  const cp = Math.cos(pitch)
  return new THREE.Vector3(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp).normalize()
}

function applyLookDirection(direction: THREE.Vector3) {
  const engine = getEngine()
  const nav = navigationPosition.value
  if (!engine || !nav) return

  const controls = engine.getControls()
  const eyeY = navigationEyeY.value ?? engine.getCamera().position.y
  const nextPosition = new THREE.Vector3(nav.x, eyeY, nav.y)
  const nextTarget = nextPosition.clone().addScaledVector(direction, viewDistance.value)

  engine.getCameraController().setPosition(nextPosition.x, nextPosition.y, nextPosition.z)
  engine.getCameraController().lookAt(nextTarget)

  if (controls) {
    controls.target.copy(nextTarget)
    controls.update()
  }

  updateCameraPose()
}

function bindStreetViewLookControl() {
  removeLookControlListeners?.()
  removeLookControlListeners = null

  const engine = getEngine()
  const dom = engine?.getRenderer().domElement
  if (!engine || !dom) return

  const state = {
    active: false,
    pointerId: -1,
    moved: false,
    startX: 0,
    startY: 0,
    startYaw: 0,
    startPitch: 0,
  }

  const lookSpeed = 0.005
  const maxPitch = THREE.MathUtils.degToRad(85)
  const rotateThresholdPx = 3

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    const angle = readYawPitchFromCamera()
    if (!angle) return

    if (!navigationPosition.value) {
      captureNavigationAnchorFromCamera()
    }

    state.active = true
    state.pointerId = event.pointerId
    state.moved = false
    state.startX = event.clientX
    state.startY = event.clientY
    state.startYaw = angle.yaw
    state.startPitch = angle.pitch
  }

  const onPointerMove = (event: PointerEvent) => {
    if (!state.active || event.pointerId !== state.pointerId) return

    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY
    if (!state.moved && Math.hypot(dx, dy) < rotateThresholdPx) return
    state.moved = true

    const nextYaw = state.startYaw + dx * lookSpeed
    const nextPitch = THREE.MathUtils.clamp(state.startPitch + dy * lookSpeed, -maxPitch, maxPitch)

    applyLookDirection(directionFromYawPitch(nextYaw, nextPitch))
  }

  const onPointerUp = (event: PointerEvent) => {
    if (event.pointerId !== state.pointerId) return
    state.active = false
    state.pointerId = -1
  }

  dom.addEventListener('pointerdown', onPointerDown)
  dom.addEventListener('pointermove', onPointerMove)
  dom.addEventListener('pointerup', onPointerUp)
  dom.addEventListener('pointercancel', onPointerUp)
  dom.addEventListener('pointerleave', onPointerUp)

  removeLookControlListeners = () => {
    dom.removeEventListener('pointerdown', onPointerDown)
    dom.removeEventListener('pointermove', onPointerMove)
    dom.removeEventListener('pointerup', onPointerUp)
    dom.removeEventListener('pointercancel', onPointerUp)
    dom.removeEventListener('pointerleave', onPointerUp)
  }
}

function buildMiniMapData() {
  const engine = getEngine()
  const model = engine?.getModel()
  if (!model) {
    minimapFloors.value = []
    objectMeshById.value = new Map()
    return
  }

  model.updateMatrixWorld(true)

  const nextObjectMeshById = new Map<number, THREE.Object3D>()
  const objectAccumulator = new Map<
    number,
    {
      points: MiniMapPoint[]
      yCandidates: number[]
      floorKey: string
      floorLabel: string
      label: string
    }
  >()

  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    const dbId = child.userData?.dbId
    if (typeof dbId !== 'number') return

    if (!nextObjectMeshById.has(dbId)) {
      nextObjectMeshById.set(dbId, child)
    }

    const meta = object3dMetaById.value.get(dbId)
    if (!meta) return

    const sampledPoints = extractMeshSamplePoints(child)
    if (sampledPoints.length === 0) return
    const meshBox = new THREE.Box3().setFromObject(child)
    const meshBaseY = meshBox.min.y

    const floorKey = getFloorKey(meta)
    const floorLabel = getFloorLabel(meta)
    const label = meta.componentCode || `#${dbId}`
    const current = objectAccumulator.get(dbId)

    if (!current) {
      objectAccumulator.set(dbId, {
        points: sampledPoints,
        yCandidates: [meshBaseY],
        floorKey,
        floorLabel,
        label,
      })
      return
    }

    current.points.push(...sampledPoints)
    current.yCandidates.push(meshBaseY)
  })

  const floorsMap = new Map<string, { label: string; polygons: MiniMapPolygon[]; yCandidates: number[] }>()
  const allPoints: MiniMapPoint[] = []

  for (const [object3dId, value] of objectAccumulator) {
    const hull = convexHull(value.points)
    const points = hull.length >= 3 ? hull : toRectPolygon(value.points)
    const polygonBaseY = getFloorBaseY(value.yCandidates)

    const polygon: MiniMapPolygon = {
      object3dId,
      points,
      centroid: computeCentroid(points),
      label: value.label,
    }

    allPoints.push(...points)

    const floor = floorsMap.get(value.floorKey)
    if (!floor) {
      floorsMap.set(value.floorKey, {
        label: value.floorLabel,
        polygons: [polygon],
        yCandidates: [polygonBaseY],
      })
      continue
    }
    floor.polygons.push(polygon)
    floor.yCandidates.push(polygonBaseY)
  }

  const globalBounds = computeBounds(allPoints)

  const floorData = Array.from(floorsMap.entries())
    .map(([key, value]) => {
      const hardcodedBaseY = resolveHardcodedFloorBaseY(key, value.label)
      return {
        key,
        label: value.label,
        polygons: value.polygons,
        bounds:
          value.polygons.length > 0
            ? computeBounds(value.polygons.flatMap((polygon) => polygon.points))
            : globalBounds,
        baseY: hardcodedBaseY ?? getFloorBaseY(value.yCandidates),
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'ko', { numeric: true }))

  minimapFloors.value = floorData
  objectMeshById.value = nextObjectMeshById

  const firstFloor = floorData[0]
  if (!selectedFloorKey.value && firstFloor) {
    selectedFloorKey.value = firstFloor.key
  }
}

function handleEngineSelect(selected: THREE.Object3D[]) {
  const lastSelected = selected[selected.length - 1]
  if (!lastSelected) {
    syncSelectedObject(null)
    return
  }

  const dbId = lastSelected.userData?.dbId
  syncSelectedObject(typeof dbId === 'number' ? dbId : null)
}

function handleEngineDeselect(selected: THREE.Object3D[]) {
  if (selected.length === 0) {
    syncSelectedObject(null)
    return
  }
  handleEngineSelect(selected)
}

function moveCameraToMapPoint(point: MiniMapPoint, floorKey?: string) {
  const engine = getEngine()
  if (!engine) return

  const camera = engine.getCamera()
  const model = engine.getModel()
  const controls = engine.getControls()
  if (!controls) return

  const floor = floorKey ? minimapFloors.value.find((item) => item.key === floorKey) : null

  const forward = new THREE.Vector3()
  camera.getWorldDirection(forward)
  if (forward.lengthSq() < 1e-6) {
    forward.set(0, 0, -1)
  } else {
    forward.normalize()
  }

  const fallbackBaseY = model ? new THREE.Box3().setFromObject(model).min.y : camera.position.y - EYE_HEIGHT_OFFSET
  const eyeY = (floor ? floor.baseY : fallbackBaseY) + EYE_HEIGHT_OFFSET
  const currentDistance = controls.target.distanceTo(camera.position)
  viewDistance.value = Math.max(currentDistance, 3)

  const nextPosition = new THREE.Vector3(point.x, eyeY, point.y)
  const nextTarget = nextPosition.clone().addScaledVector(forward, viewDistance.value)

  navigationPosition.value = { x: point.x, y: point.y }
  navigationEyeY.value = eyeY
  engine.getCameraController().setPosition(nextPosition.x, nextPosition.y, nextPosition.z)
  engine.getCameraController().lookAt(nextTarget)
  controls.target.copy(nextTarget)
  controls.update()
  updateCameraPose()
}

function handleMiniMapSelect(object3dId: number) {
  const engine = getEngine()
  const targetObject = objectMeshById.value.get(object3dId)
  if (!engine || !targetObject) return

  syncSelectedObject(object3dId)
  engine.selectObject(targetObject, false)
}

function handleMiniMapMove(payload: MiniMapMovePayload) {
  selectedFloorKey.value = payload.floorKey
  moveCameraToMapPoint(payload.point, payload.floorKey)
}

function handleMiniMapFloorChange(floorKey: string) {
  selectedFloorKey.value = floorKey
  const engine = getEngine()
  if (!engine) return

  const point = navigationPosition.value ?? {
    x: engine.getCamera().position.x,
    y: engine.getCamera().position.z,
  }
  moveCameraToMapPoint(point, floorKey)
}

function handleCloseTaskPanel() {
  const engine = getEngine()
  if (engine) {
    engine.clearSelection()
  }
  syncSelectedObject(null)
  selectedTasks.value = []
  isLoadingTasks.value = false
  taskLoadError.value = null
}

function handleTaskSelect(taskId: number) {
  selectedTaskId.value = selectedTaskId.value === taskId ? null : taskId
}

onMounted(() => {
  prevHtmlOverflow = document.documentElement.style.overflow
  prevBodyOverflow = document.body.style.overflow
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
})

onMounted(async () => {
  isInitializing.value = true
  initError.value = null

  try {
    await ensureProjectSelected()
    init()
    enableMobileControls()

    const engine = getEngine()
    if (engine) {
      engine.onObjectSelect(handleEngineSelect)
      engine.onObjectDeselect(handleEngineDeselect)
    }
    bindCameraPoseSync()
    bindStreetViewLookControl()

    const object3dList = await object3dApi.getObject3dList()
    object3dMetaById.value = new Map(object3dList.map((item) => [item.id, item]))
    modelCount.value = object3dList.length
    loadApiModel(object3dList)
    captureNavigationAnchorFromCamera()
    buildMiniMapData()
    updateCameraPose()
  } catch (error) {
    initError.value = getErrorMessage(error)
  } finally {
    isInitializing.value = false
  }
})

watch(selectedObject3dId, (nextId) => {
  loadTasksForSelectedObject(nextId)
})

onUnmounted(() => {
  removeControlsListener?.()
  removeControlsListener = null
  removeLookControlListeners?.()
  removeLookControlListeners = null
  document.documentElement.style.overflow = prevHtmlOverflow
  document.body.style.overflow = prevBodyOverflow
})
</script>

<template>
  <div class="bg-background text-foreground flex flex-col overflow-hidden" style="height: 100dvh">
    <header class="shrink-0 px-4 py-3 flex items-center justify-between">
      <h1 class="text-base font-semibold">모바일 3D 공정표 (Gate 5)</h1>
      <p class="text-xs text-muted-foreground">
        3D {{ modelCount }}개 · 미니맵 {{ minimapObjectCount }}개
      </p>
    </header>

    <main class="flex-1 min-h-0 overflow-hidden">
      <div class="h-full min-h-0 flex flex-col">
        <section
          class="flex-[7] min-h-0 bg-sky-100 dark:bg-sky-950/40 flex items-center justify-center overflow-hidden"
        >
          <MobileViewer3dArea
            :is-initializing="isInitializing"
            :is-loading="isLoading"
            :load-progress="loadProgress"
            :error-message="initError || loadError"
          >
            <template #canvas>
              <div ref="canvasContainer" class="h-full w-full" />
            </template>
          </MobileViewer3dArea>
        </section>

        <section
          class="flex-[3] min-h-0 bg-amber-100 dark:bg-amber-950/40 overflow-hidden"
        >
          <MiniMap2d
            v-if="!selectedObject3d"
            :floors="minimapFloors"
            :selected-object-id="selectedObject3dId"
            :selected-floor-key="selectedFloorKey"
            :camera-pose="cameraPose"
            @move-to="handleMiniMapMove"
            @floor-change="handleMiniMapFloorChange"
          />
          <MobileTaskDetailPanel
            v-else
            :object3d="selectedObject3d"
            :tasks="selectedTasks"
            :is-loading-tasks="isLoadingTasks"
            :task-load-error="taskLoadError"
            :selected-task-id="selectedTaskId"
            @close="handleCloseTaskPanel"
            @select-task="handleTaskSelect"
          />
        </section>
      </div>
    </main>
  </div>
</template>
