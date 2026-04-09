<script setup lang="ts">
import { ref, toRef, onMounted, onUnmounted } from 'vue'
import { useFloorPlanStore } from '@/features/floor-plan/view-model/useFloorPlanStore'
import { useCanvasRenderer } from '@/features/floor-plan/view-model/useCanvasRenderer'
import { useCanvasInteraction } from '@/features/floor-plan/view-model/useCanvasInteraction'
import { storeToRefs } from 'pinia'

const props = defineProps<{ editing: boolean }>()
const editingRef = toRef(props, 'editing')

const store = useFloorPlanStore()
const {
  currentImage, currentDrawing, transform,
  sortedXAxes, sortedYAxes,
  selectedBoxIds, filteredObjectIds,
  activeMode, currentObjects,
} = storeToRefs(store)

const canvasRef = ref<HTMLCanvasElement | null>(null)

function hitTestBox(mm: { x: number; y: number }): number | null {
  const objs = currentObjects.value
  for (let i = objs.length - 1; i >= 0; i--) {
    const o = objs[i]
    if (o && mm.x >= o.lt.x && mm.x <= o.rb.x && mm.y >= o.lt.y && mm.y <= o.rb.y) {
      return o.id
    }
  }
  return null
}

const {
  previewBox, selectionRect, imageAnchor,
  onMouseDown, onMouseMove, onMouseUp, onWheel, onMouseLeave, onContextMenu,
  onKeyDown, onKeyUp,
} = useCanvasInteraction({
  canvasRef, transform, activeMode,
  editing: editingRef,
  drawing: currentDrawing,
  objects: currentObjects,
  onAddBox: (lt, rb) => store.addObject(lt, rb),
  onSelectBox: (id, ctrl) => {
    if (!id) store.clearSelection()
    else if (ctrl) store.toggleSelectBox(id)
    else store.selectBox(id)
  },
  onSelectBoxesInRect: (lt, rb) => store.selectBoxesInRect(lt, rb),
  onMoveImage: (dx, dy) => store.moveImage(dx, dy),
  onSetImagePlacement: (x, y, w, h) => store.setImagePlacement(x, y, w, h),
  onDeleteBox: (id) => store.removeObject(id),
  hitTestBox,
})

const { dispose } = useCanvasRenderer({
  canvasRef,
  image: currentImage,
  editing: editingRef,
  drawing: currentDrawing,
  transform,
  activeMode,
  xAxes: sortedXAxes,
  yAxes: sortedYAxes,
  objects: currentObjects,
  selectedBoxIds,
  filteredObjectIds,
  previewBox,
  selectionRect,
  imageAnchor,
})

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (canvasRef.value) {
    resizeObserver = new ResizeObserver(() => { transform.value = { ...transform.value } })
    resizeObserver.observe(canvasRef.value)
  }
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
})

onUnmounted(() => {
  dispose()
  resizeObserver?.disconnect()
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
})

function getCursor(): string {
  switch (activeMode.value) {
    case 'add-box': return 'crosshair'
    case 'select': return 'default'
    case 'adjust-image': return 'move'
    default: return 'default'
  }
}
</script>

<template>
  <canvas
    ref="canvasRef"
    class="w-full h-full block"
    :style="{ cursor: getCursor() }"
    @mousedown="onMouseDown"
    @mousemove="onMouseMove"
    @mouseup="onMouseUp"
    @wheel="onWheel"
    @mouseleave="onMouseLeave"
    @contextmenu="onContextMenu"
  />
</template>
