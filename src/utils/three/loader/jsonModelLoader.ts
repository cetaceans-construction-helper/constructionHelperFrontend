import * as THREE from 'three'

/**
 * JSON에서 로드된 객체 데이터 인터페이스
 */
export interface JsonObjectData {
  id: string
  rhino_id: string
  name: string | null
  original_type: string
  position: { x: number; y: number; z: number }
  bounding_box: {
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
  }
  layer_name: string
  layer_full_path: string
  layer_color: { r: number; g: number; b: number; a: number }
  material_name: string | null
  material_color: { r: number; g: number; b: number; a: number } | null
  visible: boolean
  object_color: { r: number; g: number; b: number; a: number }
  groups: string[]
  geometry: {
    type: string
    data: {
      index: { array: number[] }
      attributes: {
        position: { array: number[]; itemSize: number }
        normal: { array: number[]; itemSize: number }
        uv: { array: number[]; itemSize: number }
      }
    }
  }
}

/**
 * RGBA 색상을 Three.js Color로 변환
 */
function rgbaToColor(rgba: { r: number; g: number; b: number; a: number }): THREE.Color {
  return new THREE.Color(rgba.r / 255, rgba.g / 255, rgba.b / 255)
}

/**
 * JSON 데이터에서 BufferGeometry 생성
 */
function createGeometryFromJson(data: JsonObjectData): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  const geoData = data.geometry.data

  // Position
  if (geoData.attributes.position?.array?.length > 0) {
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(geoData.attributes.position.array, 3)
    )
  }

  // Normal
  if (geoData.attributes.normal?.array?.length > 0) {
    geometry.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(geoData.attributes.normal.array, 3)
    )
  }

  // UV
  if (geoData.attributes.uv?.array?.length > 0) {
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(geoData.attributes.uv.array, 2))
  }

  // Index
  if (geoData.index?.array?.length > 0) {
    geometry.setIndex(geoData.index.array)
  }

  geometry.computeBoundingBox()

  return geometry
}

/**
 * JSON 객체 데이터에서 Three.js Mesh 생성
 */
export function createMeshFromJsonData(data: JsonObjectData): THREE.Mesh {
  // Geometry 생성
  const geometry = createGeometryFromJson(data)

  // Material 생성 (레이어 색상 사용)
  const color = rgbaToColor(data.layer_color)
  const material = new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.1,
    roughness: 0.8,
    transparent: data.layer_color.a < 255,
    opacity: data.layer_color.a / 255,
    side: THREE.DoubleSide
  })

  // Mesh 생성
  const mesh = new THREE.Mesh(geometry, material)

  // 그림자 설정
  mesh.castShadow = true
  mesh.receiveShadow = true

  // 메타데이터 저장
  mesh.userData = {
    dbId: data.id,
    rhinoId: data.rhino_id,
    name: data.name,
    layerName: data.layer_name,
    originalType: data.original_type,
    visible: data.visible,
    groups: data.groups
  }

  // 이름 설정
  mesh.name = data.name || data.layer_name || data.id

  return mesh
}

/**
 * JSON 배열에서 Three.js Group 생성
 */
export function createModelFromJsonArray(objects: JsonObjectData[]): THREE.Group {
  const group = new THREE.Group()
  group.name = 'JsonModel'

  for (const objData of objects) {
    if (objData.visible) {
      const mesh = createMeshFromJsonData(objData)
      group.add(mesh)
    }
  }

  return group
}

/**
 * JSON 파일 URL에서 모델 로드
 */
export async function loadModelFromJson(url: string): Promise<THREE.Group> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch JSON: ${response.statusText}`)
  }

  const data: JsonObjectData[] = await response.json()
  console.log(`📦 Loaded ${data.length} objects from JSON`)
  return createModelFromJsonArray(data)
}

/**
 * 로드된 모델 정보 로깅
 */
export function logJsonModelStructure(objects: JsonObjectData[]): void {
  console.group('📦 JSON Model Structure')

  const layers = new Map<string, number>()

  for (const obj of objects) {
    const count = layers.get(obj.layer_name) || 0
    layers.set(obj.layer_name, count + 1)
  }

  console.log('Total objects:', objects.length)
  console.log('Layers:', Object.fromEntries(layers))

  console.groupEnd()
}
