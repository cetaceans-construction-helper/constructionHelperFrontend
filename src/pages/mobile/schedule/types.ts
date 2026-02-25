export interface MiniMapPoint {
  x: number
  y: number
}

export interface MiniMapPolygon {
  object3dId: number
  label: string
  points: MiniMapPoint[]
  centroid: MiniMapPoint
}

export interface MiniMapCameraPose {
  position: MiniMapPoint
  direction: MiniMapPoint
}

export interface MiniMapBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface MiniMapFloorData {
  key: string
  label: string
  polygons: MiniMapPolygon[]
  bounds: MiniMapBounds
  baseY: number
}

export interface MiniMapMovePayload {
  point: MiniMapPoint
  floorKey: string
}
