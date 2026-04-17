// 모든 좌표는 mm 정수 (만~백만 단위, 3D 병행 사용)
export interface Point {
  x: number // mm
  y: number // mm
}

// 축 — 프로젝트 전체 공통
export interface AxisLine {
  id: number
  type: 'x' | 'y'
  label: string
  position: number // mm
}

// 도면 — (zone, floor) 조합. 이미지 배치 정보.
export interface Drawing {
  id: number
  zoneId: number | null
  floorId: number
  imageUrl: string | null
  // 이미지 배치
  posX: number           // mm — 이미지 좌측 위치
  posY: number           // mm — 이미지 하단 위치
  scaleX: number         // 원본 대비 X 비율
  scaleY: number         // 원본 대비 Y 비율
  // 프론트 전용 (이미지 로딩 후 계산)
  imageWidth: number     // mm = naturalWidth * scaleX
  imageHeight: number    // mm = naturalHeight * scaleY
}

// 2D 객체 — drawing에 종속, ccode 참조
export interface Object2D {
  id: number
  drawingId: number
  lt: Point // mm
  rb: Point // mm
  componentCodeId: number | null
  componentCode: string | null
  componentTypeName: string | null
  isStructure: boolean | null
  gridLabel: string | null // 백엔드 계산값 (예: "A~C / 1~2")
}

export type ToolMode = 'add-box' | 'select' | 'adjust-image'

export interface ViewTransform {
  offsetX: number
  offsetY: number
  scale: number // px/mm
}

export interface CcodeFilter {
  isStructure: boolean | null
  componentTypeId: number | null
  componentCodeId: number | null
}
