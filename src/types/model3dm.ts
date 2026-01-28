// GET /api/model3dm/getModel3dmList 응답 항목
export interface Model3dm {
  id: number
  layerColor: { r: number; g: number; b: number }
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
}

// GET /api/component/getComponentList 응답 항목
export interface ComponentInfo {
  id: number
  taskGroup: string
  zone: string | null
  floor: string | null
  section: string | null
  usage: string | null
  materialName: string | null
  materialUrl: string | null
}

// GET /api/task/getTaskList?componentId=N 응답 항목
export interface Task {
  id: number
  componentId: number
  subWorkTypeId: number
  subWorkTypeName: string
  workTypeId: number
  workTypeName: string
  divisionId: number
  divisionName: string
  planedQuantity: number
}
