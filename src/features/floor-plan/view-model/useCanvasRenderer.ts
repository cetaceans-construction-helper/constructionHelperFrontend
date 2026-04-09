import { watch, type Ref } from 'vue'
import type { AxisLine, Drawing, Object2D, ToolMode, ViewTransform } from '../model/types'
import {
  AXIS_COLOR_X, AXIS_COLOR_Y, AXIS_DASH_PATTERN, AXIS_LINE_WIDTH,
  BOX_DIMMED_FILL_COLOR, BOX_DIMMED_STROKE_COLOR,
  BOX_FILL_COLOR, BOX_SELECTED_FILL_COLOR, BOX_SELECTED_STROKE_COLOR, BOX_SELECTED_STROKE_WIDTH,
  BOX_STROKE_COLOR, BOX_STROKE_WIDTH, HANDLE_SIZE,
  SELECTION_RECT_FILL, SELECTION_RECT_STROKE,
} from '../model/constants'

interface RendererOptions {
  canvasRef: Ref<HTMLCanvasElement | null>
  image: Ref<HTMLImageElement | null>
  drawing: Ref<Drawing | null>
  transform: Ref<ViewTransform>
  activeMode: Ref<ToolMode>
  editing: Ref<boolean>
  xAxes: Ref<AxisLine[]>
  yAxes: Ref<AxisLine[]>
  objects: Ref<Object2D[]>
  selectedBoxIds: Ref<Set<number>>
  filteredObjectIds: Ref<Set<number>>
  previewBox: Ref<{ ltX: number; ltY: number; rbX: number; rbY: number } | null>
  selectionRect: Ref<{ ltX: number; ltY: number; rbX: number; rbY: number } | null>
  imageAnchor: Ref<{ x: number; y: number } | null>
}

export function useCanvasRenderer(options: RendererOptions) {
  const {
    canvasRef, image, drawing, transform, activeMode, editing,
    xAxes, yAxes, objects, selectedBoxIds, filteredObjectIds,
    previewBox, selectionRect, imageAnchor,
  } = options

  let rafId = 0
  let dirty = true

  function requestRender() {
    dirty = true
    if (!rafId) rafId = requestAnimationFrame(render)
  }

  function render() {
    rafId = 0
    if (!dirty) return
    dirty = false

    const canvas = canvasRef.value
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const w = rect.width
    const h = rect.height

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    const t = transform.value
    const d = drawing.value

    ctx.save()
    // Y축 반전: 아래→위로 값 증가
    ctx.translate(t.offsetX, t.offsetY)
    ctx.scale(t.scale, -t.scale)

    // 1. 이미지 (배치 좌표에 그리기)
    const img = image.value
    if (img && d) {
      // Y반전 상태이므로 이미지도 뒤집어서 그려야 함
      ctx.save()
      ctx.translate(d.posX, d.posY + d.imageHeight)
      ctx.scale(1, -1)
      ctx.drawImage(img, 0, 0, d.imageWidth, d.imageHeight)
      ctx.restore()

      // 이미지 조정 모드: 이미지 테두리 + 핸들
      if (activeMode.value === 'adjust-image') {
        ctx.save()
        ctx.strokeStyle = '#f59e0b'
        ctx.lineWidth = 2 / t.scale
        ctx.setLineDash([6 / t.scale, 4 / t.scale])
        ctx.strokeRect(d.posX, d.posY, d.imageWidth, d.imageHeight)
        // 8핸들: 4꼭지점 + 4변 중점
        const hs = HANDLE_SIZE / t.scale
        ctx.fillStyle = '#f59e0b'
        ctx.setLineDash([])
        const x0 = d.posX, x1 = d.posX + d.imageWidth
        const y0 = d.posY, y1 = d.posY + d.imageHeight
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2
        const handles = [
          [x0, y0], [x1, y0], [x0, y1], [x1, y1],
          [mx, y1], [mx, y0], [x0, my], [x1, my],
        ]
        for (const h of handles) {
          ctx.fillRect(h[0]! - hs / 2, h[1]! - hs / 2, hs, hs)
        }
        ctx.restore()

        // 기준점(앵커) 표시
        const anc = imageAnchor.value
        if (anc) {
          ctx.save()
          const r = 6 / t.scale
          ctx.fillStyle = '#ef4444'
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 2 / t.scale
          ctx.beginPath()
          ctx.arc(anc.x, anc.y, r, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
          // 십자선
          const cr = 12 / t.scale
          ctx.strokeStyle = '#ef4444'
          ctx.lineWidth = 1 / t.scale
          ctx.setLineDash([])
          ctx.beginPath()
          ctx.moveTo(anc.x - cr, anc.y); ctx.lineTo(anc.x + cr, anc.y)
          ctx.moveTo(anc.x, anc.y - cr); ctx.lineTo(anc.x, anc.y + cr)
          ctx.stroke()
          ctx.restore()
        }
      }
    }

    // 2. 축선
    const xa = xAxes.value
    const ya = yAxes.value
    const xMin = xa.length > 0 ? Math.min(...xa.map((a) => a.position)) : 0
    const xMax = xa.length > 0 ? Math.max(...xa.map((a) => a.position)) : 0
    const yMin = ya.length > 0 ? Math.min(...ya.map((a) => a.position)) : 0
    const yMax = ya.length > 0 ? Math.max(...ya.map((a) => a.position)) : 0
    const xSpan = xMax - xMin || 10000
    const ySpan = yMax - yMin || 10000
    const xOverhang = xSpan * 0.25
    const yOverhang = ySpan * 0.25

    drawAxes(ctx, xa, 'x', { start: yMin - yOverhang, end: yMax + yOverhang }, t)
    drawAxes(ctx, ya, 'y', { start: xMin - xOverhang, end: xMax + xOverhang }, t)

    // 3. 박스
    const filtered = filteredObjectIds.value
    const selected = selectedBoxIds.value
    const isEditing = editing.value
    for (const obj of objects.value) {
      drawBox(ctx, obj, filtered.has(obj.id), selected.has(obj.id), t, isEditing)
    }

    // 4. 프리뷰 박스
    const pb = previewBox.value
    if (pb) {
      ctx.save()
      ctx.setLineDash([4 / t.scale, 4 / t.scale])
      ctx.lineWidth = 2 / t.scale
      ctx.strokeStyle = BOX_STROKE_COLOR
      ctx.fillStyle = BOX_FILL_COLOR
      const x = Math.min(pb.ltX, pb.rbX)
      const y = Math.min(pb.ltY, pb.rbY)
      const bw = Math.abs(pb.rbX - pb.ltX)
      const bh = Math.abs(pb.rbY - pb.ltY)
      ctx.fillRect(x, y, bw, bh)
      ctx.strokeRect(x, y, bw, bh)
      ctx.restore()
    }

    // 5. 선택 영역
    const sr = selectionRect.value
    if (sr) {
      ctx.save()
      ctx.setLineDash([4 / t.scale, 4 / t.scale])
      ctx.lineWidth = 1 / t.scale
      ctx.strokeStyle = SELECTION_RECT_STROKE
      ctx.fillStyle = SELECTION_RECT_FILL
      const x = Math.min(sr.ltX, sr.rbX)
      const y = Math.min(sr.ltY, sr.rbY)
      const sw = Math.abs(sr.rbX - sr.ltX)
      const sh = Math.abs(sr.rbY - sr.ltY)
      ctx.fillRect(x, y, sw, sh)
      ctx.strokeRect(x, y, sw, sh)
      ctx.restore()
    }

    ctx.restore()
  }

  // Y반전 상태에서 텍스트를 정방향으로 그리는 헬퍼
  function drawTextFlipped(ctx: CanvasRenderingContext2D, text: string, mmX: number, mmY: number, bg?: string) {
    const textColor = ctx.fillStyle
    ctx.save()
    ctx.translate(mmX, mmY)
    ctx.scale(1, -1)
    if (bg) {
      const m = ctx.measureText(text)
      const px = 2 / transform.value.scale
      const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent
      ctx.fillStyle = bg
      ctx.fillRect(-px, -m.actualBoundingBoxAscent - px, m.width + px * 2, h + px * 2)
    }
    ctx.fillStyle = textColor
    ctx.fillText(text, 0, 0)
    ctx.restore()
  }

  function drawAxes(ctx: CanvasRenderingContext2D, axes: AxisLine[], type: 'x' | 'y', crossRange: { start: number; end: number }, t: ViewTransform) {
    const fontSize = 14 / t.scale
    const pad = 8 / t.scale

    for (const axis of axes) {
      ctx.save()
      ctx.setLineDash(AXIS_DASH_PATTERN.map((v) => v / t.scale))
      ctx.lineWidth = AXIS_LINE_WIDTH / t.scale
      ctx.strokeStyle = type === 'x' ? AXIS_COLOR_X : AXIS_COLOR_Y

      if (type === 'x') {
        const px = axis.position
        ctx.beginPath(); ctx.moveTo(px, crossRange.start); ctx.lineTo(px, crossRange.end); ctx.stroke()
        ctx.setLineDash([])
        ctx.font = `bold ${fontSize}px sans-serif`
        ctx.fillStyle = AXIS_COLOR_X
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        drawTextFlipped(ctx, axis.label, px, crossRange.end + pad)
      } else {
        const py = axis.position
        ctx.beginPath(); ctx.moveTo(crossRange.start, py); ctx.lineTo(crossRange.end, py); ctx.stroke()
        ctx.setLineDash([])
        ctx.font = `bold ${fontSize}px sans-serif`
        ctx.fillStyle = AXIS_COLOR_Y
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        drawTextFlipped(ctx, axis.label, crossRange.start - pad, py)
      }
      ctx.restore()
    }
  }

  function drawBox(
    ctx: CanvasRenderingContext2D,
    obj: Object2D,
    isFiltered: boolean, isSelected: boolean,
    t: ViewTransform, isEditing: boolean,
  ) {
    const x = obj.lt.x
    const y = obj.lt.y
    const bw = obj.rb.x - obj.lt.x
    const bh = obj.rb.y - obj.lt.y

    ctx.save()

    if (isSelected) {
      ctx.fillStyle = BOX_SELECTED_FILL_COLOR
      ctx.strokeStyle = BOX_SELECTED_STROKE_COLOR
      ctx.lineWidth = BOX_SELECTED_STROKE_WIDTH / t.scale
      ctx.setLineDash([])
    } else if (isFiltered) {
      ctx.fillStyle = BOX_FILL_COLOR
      ctx.strokeStyle = BOX_STROKE_COLOR
      ctx.lineWidth = BOX_STROKE_WIDTH / t.scale
      ctx.setLineDash([])
    } else {
      ctx.fillStyle = BOX_DIMMED_FILL_COLOR
      ctx.strokeStyle = BOX_DIMMED_STROKE_COLOR
      ctx.lineWidth = 1 / t.scale
      ctx.setLineDash([4 / t.scale, 4 / t.scale])
    }

    ctx.fillRect(x, y, bw, bh)
    ctx.strokeRect(x, y, bw, bh)

    const fontSize = 12 / t.scale
    const pad = 4 / t.scale

    // 부재코드 (박스 위쪽)
    if ((isFiltered || isSelected) && obj.componentCode) {
      ctx.font = `${fontSize}px sans-serif`
      ctx.fillStyle = '#374151'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      drawTextFlipped(ctx, obj.componentCode, x + pad, y + bh + pad, '#ffffff')
    }

    // 선택 핸들
    if (isSelected) {
      const hs = HANDLE_SIZE / t.scale
      ctx.fillStyle = BOX_SELECTED_STROKE_COLOR
      ctx.fillRect(x - hs / 2, y - hs / 2, hs, hs)
      ctx.fillRect(x + bw - hs / 2, y - hs / 2, hs, hs)
      ctx.fillRect(x - hs / 2, y + bh - hs / 2, hs, hs)
      ctx.fillRect(x + bw - hs / 2, y + bh - hs / 2, hs, hs)
    }

    // 편집 모드: X 삭제 버튼 (우상단)
    if (isEditing && (isFiltered || isSelected)) {
      const btnSize = 16 / t.scale
      const btnX = x + bw - btnSize
      const btnY = y + bh - btnSize
      ctx.fillStyle = '#ef4444'
      ctx.fillRect(btnX, btnY, btnSize, btnSize)
      // X 글자
      ctx.save()
      ctx.translate(btnX + btnSize / 2, btnY + btnSize / 2)
      ctx.scale(1, -1)
      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${btnSize * 0.7}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('×', 0, 0)
      ctx.restore()
    }

    ctx.restore()
  }

  const stopWatch = watch(
    [canvasRef, image, drawing, transform, activeMode, editing, xAxes, yAxes, objects, selectedBoxIds, filteredObjectIds, previewBox, selectionRect, imageAnchor],
    requestRender,
    { deep: true },
  )

  function dispose() {
    stopWatch()
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0 }
  }

  return { requestRender, dispose }
}
