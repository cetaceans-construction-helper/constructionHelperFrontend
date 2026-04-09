// 축 매핑 임계값: 25% / 50% / 25% 존 분할
export const DEFAULT_AXIS_THRESHOLD = 0.25

// 기본 월드 크기 (mm)
export const DEFAULT_WORLD_WIDTH = 50000  // 50m
export const DEFAULT_WORLD_HEIGHT = 30000 // 30m

// 캔버스 렌더링 색상
export const AXIS_COLOR_X = '#ef4444'
export const AXIS_COLOR_Y = '#3b82f6'
export const AXIS_LINE_WIDTH = 1.5
export const AXIS_DASH_PATTERN = [8, 4]

// 박스 색상: 기준색에서 테두리(어두운)/내부(밝은) 자동 도출
const BOX_BASE_COLOR = { r: 59, g: 130, b: 246 }         // blue
const BOX_SELECTED_BASE = { r: 245, g: 158, b: 11 }      // amber
const BOX_DIMMED_BASE = { r: 156, g: 163, b: 175 }       // gray

function dark(c: { r: number; g: number; b: number }) {
  return `rgb(${c.r}, ${c.g}, ${c.b})`
}
function light(c: { r: number; g: number; b: number }) {
  const mix = (v: number) => Math.round(v + (255 - v) * 0.7)
  return `rgb(${mix(c.r)}, ${mix(c.g)}, ${mix(c.b)})`
}

export const BOX_STROKE_COLOR = dark(BOX_BASE_COLOR)
export const BOX_FILL_COLOR = light(BOX_BASE_COLOR)
export const BOX_STROKE_WIDTH = 2
export const BOX_SELECTED_STROKE_COLOR = dark(BOX_SELECTED_BASE)
export const BOX_SELECTED_FILL_COLOR = light(BOX_SELECTED_BASE)
export const BOX_SELECTED_STROKE_WIDTH = 3
export const BOX_DIMMED_STROKE_COLOR = dark(BOX_DIMMED_BASE)
export const BOX_DIMMED_FILL_COLOR = light(BOX_DIMMED_BASE)

export const SELECTION_RECT_FILL = 'rgba(59, 130, 246, 0.1)'
export const SELECTION_RECT_STROKE = '#3b82f6'

// 줌 제한 (px/mm)
export const MIN_SCALE = 0.001   // 1000mm → 1px
export const MAX_SCALE = 1.0     // 1mm → 1px
export const ZOOM_SPEED = 0.001

export const HANDLE_SIZE = 8

// 도면 크기 조정 마진
export const FIT_AXES_MARGIN = 1.1
