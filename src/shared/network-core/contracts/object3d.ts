export interface LayerColor {
  r: number
  g: number
  b: number
  a: number
}

// GET /api/object3d/getObject3dList 응답 항목
export interface Object3d {
  id: number
  layerColor: LayerColor
  geometry: {
    type: string
    data: {
      uv: string
      index: string
      normal: string
      position: string
      indexType: number
      indexCount: number
      vertexCount: number
    }
  }
  zoneId: number | null
  zoneName: string | null
  floorId: number | null
  floorName: string | null
  isStructure: boolean | null
  componentTypeId: number | null
  componentTypeName: string | null
  componentCodeId: number | null
  componentCode: string | null
  axisLabel: string | null
}

// GET /api/task/getTaskList?object3dId=N 응답 항목
export interface Task {
  id: number
  object3dId: number
  subWorkTypeId: number
  subWorkTypeName: string
  workTypeId: number
  workTypeName: string
  divisionId: number
  divisionName: string
  planedQuantity: number
}
