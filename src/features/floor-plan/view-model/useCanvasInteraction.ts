import { ref, type Ref } from 'vue'
import type { Drawing, Object2D, ToolMode, ViewTransform } from '../model/types'
import { MIN_SCALE, MAX_SCALE, ZOOM_SPEED, HANDLE_SIZE } from '../model/constants'

// 이미지 핸들: 4꼭지점 + 4변 중점
type ImageHandle = 'tl' | 'tr' | 'bl' | 'br' | 'top' | 'bottom' | 'left' | 'right' | null

interface InteractionOptions {
  canvasRef: Ref<HTMLCanvasElement | null>
  transform: Ref<ViewTransform>
  activeMode: Ref<ToolMode>
  editing: Ref<boolean>
  drawing: Ref<Drawing | null>
  objects: Ref<Object2D[]>
  onAddBox: (lt: { x: number; y: number }, rb: { x: number; y: number }) => void
  onSelectBox: (id: number | null, ctrlKey: boolean) => void
  onSelectBoxesInRect: (lt: { x: number; y: number }, rb: { x: number; y: number }) => void
  onMoveImage: (dx: number, dy: number) => void
  onSetImagePlacement: (x: number, y: number, w: number, h: number) => void
  onDeleteBox: (id: number) => void
  hitTestBox: (mm: { x: number; y: number }) => number | null
}

export function useCanvasInteraction(options: InteractionOptions) {
  const {
    canvasRef, transform, activeMode, editing, drawing, objects,
    onAddBox, onSelectBox, onSelectBoxesInRect,
    onMoveImage, onSetImagePlacement, onDeleteBox, hitTestBox,
  } = options

  const previewBox = ref<{ ltX: number; ltY: number; rbX: number; rbY: number } | null>(null)
  const selectionRect = ref<{ ltX: number; ltY: number; rbX: number; rbY: number } | null>(null)
  const imageAnchor = ref<{ x: number; y: number } | null>(null)

  let spaceDown = false
  let panning = false
  let panStart = { x: 0, y: 0 }
  let panStartTransform = { offsetX: 0, offsetY: 0 }

  let boxDrawStart: { x: number; y: number } | null = null
  let selectDragStart: { x: number; y: number } | null = null

  // 이미지 조정
  let imageDragging = false
  let imageDragStart: { x: number; y: number } | null = null
  let imageOriginal: { x: number; y: number; w: number; h: number } | null = null
  let activeHandle: ImageHandle = null

  function screenToMm(screenX: number, screenY: number): { x: number; y: number } {
    const canvas = canvasRef.value
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const t = transform.value
    return {
      x: (screenX - rect.left - t.offsetX) / t.scale,
      y: -(screenY - rect.top - t.offsetY) / t.scale,
    }
  }

  // 이미지 핸들 히트테스트 (꼭지점 + 변 중점)
  function hitTestImageHandle(mm: { x: number; y: number }): ImageHandle {
    const d = drawing.value
    if (!d) return null
    const hs = HANDLE_SIZE / transform.value.scale

    const x0 = d.posX, x1 = d.posX + d.imageWidth
    const y0 = d.posY, y1 = d.posY + d.imageHeight
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2

    const hits: [number, number, ImageHandle][] = [
      [x0, y0, 'bl'], [x1, y0, 'br'], [x0, y1, 'tl'], [x1, y1, 'tr'],
      [mx, y1, 'top'], [mx, y0, 'bottom'], [x0, my, 'left'], [x1, my, 'right'],
    ]
    for (const [hx, hy, handle] of hits) {
      if (Math.abs(mm.x - hx) < hs * 1.5 && Math.abs(mm.y - hy) < hs * 1.5) return handle
    }
    return null
  }

  function hitTestDeleteButton(mm: { x: number; y: number }): number | null {
    if (!editing.value) return null
    const btnSize = 16 / transform.value.scale
    for (let i = objects.value.length - 1; i >= 0; i--) {
      const obj = objects.value[i]!
      const btnX = obj.rb.x - btnSize
      const btnY = obj.rb.y - btnSize
      if (mm.x >= btnX && mm.x <= btnX + btnSize && mm.y >= btnY && mm.y <= btnY + btnSize) {
        return obj.id
      }
    }
    return null
  }

  function hitTestImage(mm: { x: number; y: number }): boolean {
    const d = drawing.value
    if (!d) return false
    return mm.x >= d.posX && mm.x <= d.posX + d.imageWidth &&
           mm.y >= d.posY && mm.y <= d.posY + d.imageHeight
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.code === 'Space' && !spaceDown) {
      spaceDown = true
      e.preventDefault()
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.code === 'Space') spaceDown = false
  }

  function onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return // 좌클릭만 처리

    if (spaceDown) {
      panning = true
      panStart = { x: e.clientX, y: e.clientY }
      panStartTransform = { offsetX: transform.value.offsetX, offsetY: transform.value.offsetY }
      return
    }

    const mode = activeMode.value

    if (mode === 'adjust-image') {
      const mm = screenToMm(e.clientX, e.clientY)

      if (imageAnchor.value && drawing.value) {
        // 앵커가 설정되어 있으면 항상 앵커 스케일 모드 (핸들 무시)
        activeHandle = null
        imageDragging = true
        imageDragStart = mm
        const d = drawing.value
        imageOriginal = { x: d.posX, y: d.posY, w: d.imageWidth, h: d.imageHeight }
      } else {
        const handle = hitTestImageHandle(mm)
        if (handle) {
          // 모서리/변 핸들 드래그
          activeHandle = handle
          imageDragging = true
          imageDragStart = mm
          const d = drawing.value!
          imageOriginal = { x: d.posX, y: d.posY, w: d.imageWidth, h: d.imageHeight }
        } else if (hitTestImage(mm)) {
          // 이미지 이동 드래그
          activeHandle = null
          imageDragging = true
          imageDragStart = mm
          const d = drawing.value!
          imageOriginal = { x: d.posX, y: d.posY, w: d.imageWidth, h: d.imageHeight }
        }
      }
      return
    }

    if (mode === 'add-box') {
      const mm = screenToMm(e.clientX, e.clientY)
      const deleteId = hitTestDeleteButton(mm)
      if (deleteId != null) {
        onDeleteBox(deleteId)
        return
      }
      boxDrawStart = mm
      return
    }

    if (mode === 'select') {
      const mm = screenToMm(e.clientX, e.clientY)
      const deleteId = hitTestDeleteButton(mm)
      if (deleteId != null) {
        onDeleteBox(deleteId)
        return
      }
      const hitId = hitTestBox(mm)
      if (hitId) {
        onSelectBox(hitId, e.ctrlKey || e.metaKey || e.shiftKey)
      } else {
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey) onSelectBox(null, false)
        selectDragStart = mm
      }
      return
    }
  }

  function onMouseMove(e: MouseEvent) {
    if (panning) {
      transform.value = {
        ...transform.value,
        offsetX: panStartTransform.offsetX + (e.clientX - panStart.x),
        offsetY: panStartTransform.offsetY + (e.clientY - panStart.y),
      }
      return
    }

    const mode = activeMode.value

    if (mode === 'adjust-image' && imageDragging && imageDragStart && imageOriginal) {
      const mm = screenToMm(e.clientX, e.clientY)

      if (activeHandle) {
        // 모서리/변 핸들 리사이즈
        const o = imageOriginal
        let nx = o.x, ny = o.y, nw = o.w, nh = o.h
        const dx = mm.x - imageDragStart.x
        const dy = mm.y - imageDragStart.y

        // 꼭지점: 비율 유지 (dx/dy 중 큰 쪽 기준)
        if (activeHandle === 'tr' || activeHandle === 'tl' || activeHandle === 'br' || activeHandle === 'bl') {
          const ratio = o.h / o.w
          const useX = Math.abs(dx) >= Math.abs(dy)
          const dw = useX ? dx : dy / ratio
          const dh = dw * ratio

          if (activeHandle === 'tr') { nw = o.w + dw; nh = o.h + dh }
          else if (activeHandle === 'tl') { nx = o.x - dw; nw = o.w + dw; nh = o.h + dh }
          else if (activeHandle === 'br') { nw = o.w + dw; ny = o.y - dh; nh = o.h + dh }
          else if (activeHandle === 'bl') { nx = o.x - dw; nw = o.w + dw; ny = o.y - dh; nh = o.h + dh }
        }
        // 변: 한 방향만
        else if (activeHandle === 'top') { nh = o.h + dy }
        else if (activeHandle === 'bottom') { ny = o.y + dy; nh = o.h - dy }
        else if (activeHandle === 'right') { nw = o.w + dx }
        else if (activeHandle === 'left') { nx = o.x + dx; nw = o.w - dx }

        if (nw > 100 && nh > 100) {
          onSetImagePlacement(nx, ny, nw, nh)
        }
      } else if (imageAnchor.value) {
        // 앵커 기준 1방향 스케일 (이동량 큰 축만)
        const anchor = imageAnchor.value
        const o = imageOriginal
        const moveDx = Math.abs(mm.x - imageDragStart.x)
        const moveDy = Math.abs(mm.y - imageDragStart.y)
        const useX = moveDx >= moveDy

        const anchorRatioX = (anchor.x - o.x) / o.w
        const anchorRatioY = (anchor.y - o.y) / o.h

        let nw = o.w, nh = o.h

        if (useX) {
          const startDx = Math.abs(imageDragStart.x - anchor.x) || 1
          const curDx = Math.abs(mm.x - anchor.x) || 1
          nw = Math.max(100, o.w * (curDx / startDx))
        } else {
          const startDy = Math.abs(imageDragStart.y - anchor.y) || 1
          const curDy = Math.abs(mm.y - anchor.y) || 1
          nh = Math.max(100, o.h * (curDy / startDy))
        }

        const nx = anchor.x - anchorRatioX * nw
        const ny = anchor.y - anchorRatioY * nh

        onSetImagePlacement(nx, ny, nw, nh)
      } else {
        // 이미지 이동
        const dx = mm.x - imageDragStart.x
        const dy = mm.y - imageDragStart.y
        onMoveImage(dx, dy)
        imageDragStart = mm
      }
      return
    }

    if (mode === 'add-box' && boxDrawStart) {
      const cur = screenToMm(e.clientX, e.clientY)
      previewBox.value = { ltX: boxDrawStart.x, ltY: boxDrawStart.y, rbX: cur.x, rbY: cur.y }
      return
    }

    if (mode === 'select' && selectDragStart) {
      const cur = screenToMm(e.clientX, e.clientY)
      selectionRect.value = { ltX: selectDragStart.x, ltY: selectDragStart.y, rbX: cur.x, rbY: cur.y }
      return
    }
  }

  function onMouseUp() {
    if (panning) { panning = false; return }

    if (activeMode.value === 'adjust-image') {
      imageDragging = false
      imageDragStart = null
      imageOriginal = null
      activeHandle = null
      return
    }

    if (activeMode.value === 'add-box' && boxDrawStart) {
      const end = screenToMm(0, 0) // not used, recalc below
      // recalc from previewBox
      const pb = previewBox.value
      if (pb && Math.abs(pb.rbX - pb.ltX) > 100 && Math.abs(pb.rbY - pb.ltY) > 100) {
        onAddBox({ x: pb.ltX, y: pb.ltY }, { x: pb.rbX, y: pb.rbY })
      }
      boxDrawStart = null
      previewBox.value = null
      return
    }

    if (activeMode.value === 'select' && selectDragStart) {
      const sr = selectionRect.value
      if (sr && (Math.abs(sr.rbX - sr.ltX) > 50 || Math.abs(sr.rbY - sr.ltY) > 50)) {
        onSelectBoxesInRect({ x: sr.ltX, y: sr.ltY }, { x: sr.rbX, y: sr.rbY })
      }
      selectDragStart = null
      selectionRect.value = null
      return
    }
  }

  function onContextMenu(e: MouseEvent) {
    if (activeMode.value === 'adjust-image') {
      e.preventDefault()
      const mm = screenToMm(e.clientX, e.clientY)
      if (imageAnchor.value) {
        imageAnchor.value = null
      } else {
        imageAnchor.value = { x: mm.x, y: mm.y }
      }
    }
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    const canvas = canvasRef.value
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const t = transform.value
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, t.scale * (1 - e.deltaY * ZOOM_SPEED)))
    const ratio = newScale / t.scale

    transform.value = {
      offsetX: mouseX - (mouseX - t.offsetX) * ratio,
      offsetY: mouseY - (mouseY - t.offsetY) * ratio,
      scale: newScale,
    }
  }

  function onMouseLeave() {
    panning = false
    imageDragging = false
    imageDragStart = null
    imageOriginal = null
    activeHandle = null
  }

  function clearImageAnchor() {
    imageAnchor.value = null
  }

  return {
    previewBox, selectionRect, imageAnchor,
    onMouseDown, onMouseMove, onMouseUp, onWheel, onMouseLeave, onContextMenu,
    onKeyDown, onKeyUp, clearImageAnchor,
  }
}
