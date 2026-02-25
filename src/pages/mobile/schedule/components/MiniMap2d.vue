<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
  MiniMapCameraPose,
  MiniMapFloorData,
  MiniMapMovePayload,
  MiniMapPoint,
  MiniMapPolygon,
} from '../types'

const MAP_SIZE = 100
const MAP_PADDING = 6
const CAMERA_MARKER_RADIUS = 1.45
const MIN_VIEWBOX_SIZE = 28
const MAX_VIEWBOX_SIZE = MAP_SIZE

const props = defineProps<{
  floors: MiniMapFloorData[]
  selectedObjectId: number | null
  selectedFloorKey: string | null
  cameraPose: MiniMapCameraPose | null
}>()

const emit = defineEmits<{
  (e: 'select-object', object3dId: number): void
  (e: 'move-to', payload: MiniMapMovePayload): void
  (e: 'floor-change', floorKey: string): void
}>()

const svgRef = ref<SVGSVGElement | null>(null)
const activeFloorKey = ref('')
const viewBox = ref({ x: 0, y: 0, size: MAP_SIZE })
const activeTouchPoints = new Map<number, MiniMapPoint>()
let pinchStart:
  | {
      distance: number
      center: MiniMapPoint
      viewBox: { x: number; y: number; size: number }
    }
  | null = null
let panStart:
  | {
      pointerId: number
      lastClientX: number
      lastClientY: number
      pendingDx: number
      pendingDy: number
      moved: boolean
    }
  | null = null
let suppressClickUntil = 0
let panFrameId: number | null = null

const currentFloor = computed(
  () => props.floors.find((floor) => floor.key === activeFloorKey.value) ?? null,
)

const viewBoxAttr = computed(
  () => `${viewBox.value.x} ${viewBox.value.y} ${viewBox.value.size} ${viewBox.value.size}`,
)

const canZoomIn = computed(() => viewBox.value.size > MIN_VIEWBOX_SIZE + 1e-4)
const canZoomOut = computed(() => viewBox.value.size < MAX_VIEWBOX_SIZE - 1e-4)

watch(
  () => props.floors,
  (floors) => {
    if (floors.length === 0) {
      activeFloorKey.value = ''
      return
    }

    const hasActive = floors.some((floor) => floor.key === activeFloorKey.value)
    const firstFloor = floors[0]
    if (!hasActive && firstFloor) {
      activeFloorKey.value = firstFloor.key
    }
    resetViewBox()
  },
  { immediate: true },
)

watch(
  () => props.selectedFloorKey,
  (selectedFloorKey) => {
    if (!selectedFloorKey) return
    const hasFloor = props.floors.some((floor) => floor.key === selectedFloorKey)
    if (hasFloor) {
      activeFloorKey.value = selectedFloorKey
    }
  },
  { immediate: true },
)

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function resetViewBox() {
  viewBox.value = { x: 0, y: 0, size: MAP_SIZE }
}

function clampViewBox(next: { x: number; y: number; size: number }) {
  const size = clamp(next.size, MIN_VIEWBOX_SIZE, MAX_VIEWBOX_SIZE)
  const maxOffset = MAP_SIZE - size
  return {
    size,
    x: clamp(next.x, 0, Math.max(0, maxOffset)),
    y: clamp(next.y, 0, Math.max(0, maxOffset)),
  }
}

function zoomMap(multiplier: number) {
  const current = viewBox.value
  const centerX = current.x + current.size / 2
  const centerY = current.y + current.size / 2
  const nextSize = current.size * multiplier
  const next = {
    x: centerX - nextSize / 2,
    y: centerY - nextSize / 2,
    size: nextSize,
  }
  viewBox.value = clampViewBox(next)
}

function handleZoomIn() {
  zoomMap(0.85)
}

function handleZoomOut() {
  zoomMap(1 / 0.85)
}

function isZoomedIn(): boolean {
  return viewBox.value.size < MAX_VIEWBOX_SIZE - 1e-4
}

function applyPendingPan() {
  if (!panStart) return
  const svg = svgRef.value
  if (!svg) return

  const rect = svg.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) {
    panStart.pendingDx = 0
    panStart.pendingDy = 0
    return
  }

  const dx = panStart.pendingDx
  const dy = panStart.pendingDy
  if (Math.abs(dx) < 1e-3 && Math.abs(dy) < 1e-3) return
  panStart.pendingDx = 0
  panStart.pendingDy = 0

  const scaleX = viewBox.value.size / rect.width
  const scaleY = viewBox.value.size / rect.height
  viewBox.value = clampViewBox({
    x: viewBox.value.x - dx * scaleX,
    y: viewBox.value.y - dy * scaleY,
    size: viewBox.value.size,
  })
}

function schedulePanUpdate() {
  if (panFrameId != null) return
  panFrameId = requestAnimationFrame(() => {
    panFrameId = null
    applyPendingPan()
  })
}

function getFloorProjection(floor: MiniMapFloorData) {
  const width = Math.max(floor.bounds.maxX - floor.bounds.minX, 1e-6)
  const height = Math.max(floor.bounds.maxY - floor.bounds.minY, 1e-6)
  const drawable = MAP_SIZE - MAP_PADDING * 2
  const worldSpan = Math.max(width, height)
  const scale = drawable / worldSpan
  const drawWidth = width * scale
  const drawHeight = height * scale
  const offsetX = MAP_PADDING + (drawable - drawWidth) / 2
  const offsetY = MAP_PADDING + (drawable - drawHeight) / 2

  return {
    width,
    height,
    scale,
    offsetX,
    offsetY,
    minX: floor.bounds.minX,
    minY: floor.bounds.minY,
  }
}

function toSvgPoint(point: MiniMapPoint): MiniMapPoint {
  const floor = currentFloor.value
  if (!floor) {
    return { x: MAP_SIZE / 2, y: MAP_SIZE / 2 }
  }

  const projection = getFloorProjection(floor)
  const projectedX = projection.offsetX + (point.x - projection.minX) * projection.scale
  const projectedY = projection.offsetY + (point.y - projection.minY) * projection.scale

  return {
    x: projectedX,
    y: projectedY,
  }
}

function toWorldPoint(svgPoint: MiniMapPoint): MiniMapPoint | null {
  const floor = currentFloor.value
  if (!floor) return null

  const projection = getFloorProjection(floor)
  const maxProjectedX = projection.offsetX + projection.width * projection.scale
  const maxProjectedY = projection.offsetY + projection.height * projection.scale

  const clampedProjectedX = clamp(svgPoint.x, projection.offsetX, maxProjectedX)
  const clampedProjectedY = clamp(svgPoint.y, projection.offsetY, maxProjectedY)

  const worldX = projection.minX + (clampedProjectedX - projection.offsetX) / projection.scale
  const worldY = projection.minY + (clampedProjectedY - projection.offsetY) / projection.scale

  return {
    x: worldX,
    y: worldY,
  }
}

function getSvgCoords(event: MouseEvent): MiniMapPoint | null {
  const svg = svgRef.value
  if (!svg) return null

  const point = svg.createSVGPoint()
  point.x = event.clientX
  point.y = event.clientY

  const ctm = svg.getScreenCTM()
  if (!ctm) return null

  const local = point.matrixTransform(ctm.inverse())
  return { x: local.x, y: local.y }
}

function calcDistance(a: MiniMapPoint, b: MiniMapPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function calcCenter(a: MiniMapPoint, b: MiniMapPoint): MiniMapPoint {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  }
}

function beginPinchSession() {
  if (activeTouchPoints.size < 2) {
    pinchStart = null
    return
  }
  const [a, b] = Array.from(activeTouchPoints.values())
  if (!a || !b) return
  pinchStart = {
    distance: Math.max(calcDistance(a, b), 0.001),
    center: calcCenter(a, b),
    viewBox: { ...viewBox.value },
  }
}

function updatePinch(event: PointerEvent) {
  if (!pinchStart || activeTouchPoints.size < 2) return

  const [a, b] = Array.from(activeTouchPoints.values())
  if (!a || !b) return

  const center = calcCenter(a, b)
  const distance = Math.max(calcDistance(a, b), 0.001)
  const ratio = pinchStart.distance / distance
  const nextSize = pinchStart.viewBox.size * ratio
  const sizeRatio = nextSize / pinchStart.viewBox.size

  const anchorX =
    pinchStart.center.x - (pinchStart.center.x - pinchStart.viewBox.x) * sizeRatio
  const anchorY =
    pinchStart.center.y - (pinchStart.center.y - pinchStart.viewBox.y) * sizeRatio

  const panDx = center.x - pinchStart.center.x
  const panDy = center.y - pinchStart.center.y

  viewBox.value = clampViewBox({
    x: anchorX - panDx,
    y: anchorY - panDy,
    size: nextSize,
  })

  if (Math.abs(distance - pinchStart.distance) > 0.8 || Math.hypot(panDx, panDy) > 0.8) {
    suppressClickUntil = Date.now() + 220
  }
  event.preventDefault()
}

function handleSvgPointerDown(event: PointerEvent) {
  if (event.pointerType !== 'touch') return
  svgRef.value?.setPointerCapture(event.pointerId)
  const svgPoint = getSvgCoords(event)
  if (!svgPoint) return
  activeTouchPoints.set(event.pointerId, svgPoint)

  if (activeTouchPoints.size >= 2) {
    if (panFrameId != null) {
      cancelAnimationFrame(panFrameId)
      panFrameId = null
    }
    panStart = null
    beginPinchSession()
    return
  }

  if (isZoomedIn()) {
    panStart = {
      pointerId: event.pointerId,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      pendingDx: 0,
      pendingDy: 0,
      moved: false,
    }
  } else {
    panStart = null
  }
}

function handleSvgPointerMove(event: PointerEvent) {
  if (event.pointerType !== 'touch') return
  if (!activeTouchPoints.has(event.pointerId)) return
  const svgPoint = getSvgCoords(event)
  if (!svgPoint) return
  activeTouchPoints.set(event.pointerId, svgPoint)

  if (pinchStart && activeTouchPoints.size >= 2) {
    updatePinch(event)
    return
  }

  if (!panStart || panStart.pointerId !== event.pointerId) return
  const dxPx = event.clientX - panStart.lastClientX
  const dyPx = event.clientY - panStart.lastClientY
  panStart.lastClientX = event.clientX
  panStart.lastClientY = event.clientY
  panStart.pendingDx += dxPx
  panStart.pendingDy += dyPx

  if (!panStart.moved && Math.hypot(dxPx, dyPx) > 0.8) {
    panStart.moved = true
  }

  schedulePanUpdate()

  if (panStart.moved) {
    suppressClickUntil = Date.now() + 220
  }
  event.preventDefault()
}

function handleSvgPointerUp(event: PointerEvent) {
  if (svgRef.value?.hasPointerCapture(event.pointerId)) {
    svgRef.value.releasePointerCapture(event.pointerId)
  }
  activeTouchPoints.delete(event.pointerId)
  if (panStart?.pointerId === event.pointerId) {
    applyPendingPan()
    panStart = null
  }
  if (panFrameId != null) {
    cancelAnimationFrame(panFrameId)
    panFrameId = null
  }

  if (activeTouchPoints.size >= 2) {
    beginPinchSession()
    return
  }

  if (activeTouchPoints.size < 2) {
    pinchStart = null
  }
}

function handleFloorSelect(floorKey: string) {
  activeFloorKey.value = floorKey
  resetViewBox()
  emit('floor-change', floorKey)
}

function getPolygonPath(points: MiniMapPoint[]): string {
  if (points.length === 0) return ''

  const first = points[0]
  if (!first) return ''
  const firstPoint = toSvgPoint(first)
  let path = `M ${firstPoint.x} ${firstPoint.y}`

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index]
    if (!point) continue
    const next = toSvgPoint(point)
    path += ` L ${next.x} ${next.y}`
  }

  return `${path} Z`
}

function getCameraTrianglePath(): string | null {
  const pose = props.cameraPose
  if (!pose) return null

  const center = toSvgPoint(pose.position)
  const aheadWorld = {
    x: pose.position.x + pose.direction.x,
    y: pose.position.y + pose.direction.y,
  }
  const ahead = toSvgPoint(aheadWorld)
  const dx = ahead.x - center.x
  const dy = ahead.y - center.y
  const dirLength = Math.hypot(dx, dy)
  if (dirLength < 1e-6) return null

  const nx = dx / dirLength
  const ny = dy / dirLength
  const px = -ny
  const py = nx

  const side = 3.2
  const height = (Math.sqrt(3) * side) / 2
  const gap = 0.65

  const baseCenter = {
    x: center.x + nx * (CAMERA_MARKER_RADIUS + gap),
    y: center.y + ny * (CAMERA_MARKER_RADIUS + gap),
  }

  const tip = {
    x: baseCenter.x + nx * height,
    y: baseCenter.y + ny * height,
  }
  const left = {
    x: baseCenter.x + px * (side / 2),
    y: baseCenter.y + py * (side / 2),
  }
  const right = {
    x: baseCenter.x - px * (side / 2),
    y: baseCenter.y - py * (side / 2),
  }

  return `M ${tip.x} ${tip.y} L ${left.x} ${left.y} L ${right.x} ${right.y} Z`
}

const cameraMarker = computed(() => {
  const pose = props.cameraPose
  if (!pose || !currentFloor.value) return null

  const marker = toSvgPoint(pose.position)
  const trianglePath = getCameraTrianglePath()
  if (!trianglePath) return null

  return {
    cx: marker.x,
    cy: marker.y,
    trianglePath,
  }
})

function isSelected(polygon: MiniMapPolygon): boolean {
  return props.selectedObjectId === polygon.object3dId
}

function handleMapClick(event: MouseEvent) {
  if (Date.now() < suppressClickUntil) return
  const floor = currentFloor.value
  if (!floor) return
  const svgPoint = getSvgCoords(event)
  if (!svgPoint) return
  const worldPoint = toWorldPoint(svgPoint)
  if (!worldPoint) return
  emit('move-to', {
    point: worldPoint,
    floorKey: floor.key,
  })
}

function handlePolygonClick(polygon: MiniMapPolygon, event: MouseEvent) {
  if (Date.now() < suppressClickUntil) return
  emit('select-object', polygon.object3dId)
  handleMapClick(event)
}
</script>

<template>
  <div class="h-full w-full min-h-0 relative bg-background/70 dark:bg-black/20 overflow-hidden">
    <svg
      v-if="currentFloor"
      ref="svgRef"
      :viewBox="viewBoxAttr"
      preserveAspectRatio="xMidYMid meet"
      class="h-full w-full cursor-crosshair touch-none"
      @click="handleMapClick"
      @pointerdown="handleSvgPointerDown"
      @pointermove="handleSvgPointerMove"
      @pointerup="handleSvgPointerUp"
      @pointercancel="handleSvgPointerUp"
      @pointerleave="handleSvgPointerUp"
    >
      <rect x="0" y="0" width="100" height="100" fill="rgba(148, 163, 184, 0.12)" />

      <g>
        <path
          v-for="polygon in currentFloor.polygons"
          :key="polygon.object3dId"
          :d="getPolygonPath(polygon.points)"
          :fill="isSelected(polygon) ? 'rgba(14, 165, 233, 0.28)' : 'rgba(30, 41, 59, 0.08)'"
          :stroke="isSelected(polygon) ? '#0284c7' : '#334155'"
          :stroke-width="isSelected(polygon) ? 0.8 : 0.45"
          class="cursor-pointer"
          @click.stop="handlePolygonClick(polygon, $event)"
        />
      </g>

      <g v-if="cameraMarker">
        <path
          :d="cameraMarker.trianglePath"
          fill="rgba(245, 158, 11, 0.9)"
          stroke="#b45309"
          stroke-width="0.45"
          pointer-events="none"
        />
        <circle
          :cx="cameraMarker.cx"
          :cy="cameraMarker.cy"
          :r="CAMERA_MARKER_RADIUS"
          fill="#f59e0b"
          stroke="#ffffff"
          stroke-width="0.5"
          pointer-events="none"
        />
      </g>
    </svg>

    <div v-else class="h-full w-full flex items-center justify-center">
      <p class="text-xs text-muted-foreground">미니맵 데이터를 불러오는 중입니다.</p>
    </div>

    <div
      v-if="floors.length > 0"
      class="pointer-events-none absolute top-2 right-2 bottom-2 w-[70px] flex flex-col"
    >
      <div class="pointer-events-auto flex-1 min-h-0 flex flex-col gap-1.5 overflow-y-auto">
        <button
          v-for="floor in floors"
          :key="floor.key"
          type="button"
          class="w-full rounded-md px-2 py-1.5 text-xs font-medium transition-colors shadow-sm"
          :class="
            floor.key === activeFloorKey
              ? 'bg-primary text-primary-foreground'
              : 'bg-background/85 text-foreground'
          "
          @click="handleFloorSelect(floor.key)"
        >
          {{ floor.label }}
        </button>
      </div>

      <div class="pointer-events-auto mt-1 grid grid-cols-2 gap-1">
        <button
          type="button"
          class="rounded-md bg-background/90 text-foreground text-base font-semibold leading-none py-1 shadow-sm disabled:opacity-45"
          :disabled="!canZoomIn"
          @click="handleZoomIn"
        >
          +
        </button>
        <button
          type="button"
          class="rounded-md bg-background/90 text-foreground text-base font-semibold leading-none py-1 shadow-sm disabled:opacity-45"
          :disabled="!canZoomOut"
          @click="handleZoomOut"
        >
          -
        </button>
      </div>
    </div>
  </div>
</template>
