import * as THREE from 'three'
import type { Object3d } from '@/types/object3d'

/**
 * Base64 문자열을 ArrayBuffer로 디코딩
 */
function decodeBase64ToBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

function decodeBase64ToFloat32Array(base64: string): Float32Array {
  return new Float32Array(decodeBase64ToBuffer(base64))
}

function decodeBase64ToUint16Array(base64: string): Uint16Array {
  return new Uint16Array(decodeBase64ToBuffer(base64))
}

function decodeBase64ToUint32Array(base64: string): Uint32Array {
  return new Uint32Array(decodeBase64ToBuffer(base64))
}

/**
 * API 모델 데이터에서 BufferGeometry 생성
 */
function createGeometryFromApiData(model: Object3d): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  const data = model.geometry?.data

  if (!data) {
    console.warn('No geometry data for model:', model.id)
    return geometry
  }

  // Position (Float32Array, vertexCount * 3)
  if (data.position) {
    const positions = decodeBase64ToFloat32Array(data.position)
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  }

  // Normal (Float32Array, vertexCount * 3)
  if (data.normal) {
    const normals = decodeBase64ToFloat32Array(data.normal)
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  }

  // UV (Float32Array, vertexCount * 2)
  if (data.uv) {
    const uvs = decodeBase64ToFloat32Array(data.uv)
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  }

  // Index (Uint16Array or Uint32Array based on indexType)
  if (data.index) {
    const indices =
      data.indexType === 32
        ? decodeBase64ToUint32Array(data.index)
        : decodeBase64ToUint16Array(data.index)
    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
  }

  geometry.computeBoundingBox()
  return geometry
}

/**
 * API 모델 데이터에서 Three.js Mesh 생성
 */
export function createMeshFromApiData(model: Object3d): THREE.Mesh {
  const geometry = createGeometryFromApiData(model)

  // layerColor 객체에서 RGB 추출 (없으면 기본 회색)
  const r = model.layerColor?.r ?? 180
  const g = model.layerColor?.g ?? 180
  const b = model.layerColor?.b ?? 180
  const color = new THREE.Color(r / 255, g / 255, b / 255)

  const material = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.1,
    roughness: 0.8,
    side: THREE.DoubleSide,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true

  mesh.userData = {
    dbId: model.id,
  }

  mesh.name = `model3dm_${model.id}`
  return mesh
}

/**
 * API 모델 배열에서 Three.js Group 생성
 */
export function createModelFromApiData(models: Object3d[]): THREE.Group {
  const group = new THREE.Group()
  group.name = 'ApiModel'

  // models가 배열이 아닌 경우 배열로 변환
  const modelArray = Array.isArray(models) ? models : [models]

  for (const model of modelArray) {
    if (!model || !model.geometry) {
      console.warn('Invalid model data:', model)
      continue
    }
    const mesh = createMeshFromApiData(model)
    group.add(mesh)
  }

  return group
}
