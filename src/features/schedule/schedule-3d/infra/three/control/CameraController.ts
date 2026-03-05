import * as THREE from 'three'

export interface CameraOptions {
  fov?: number
  near?: number
  far?: number
  position?: THREE.Vector3
}

const DEFAULT_OPTIONS: Required<CameraOptions> = {
  fov: 75,
  near: 0.1,
  far: 1000,
  position: new THREE.Vector3(100, 100, 100)
}

/**
 * 카메라 컨트롤러
 * 카메라 생성, 위치 설정, 리사이즈 처리 등 카메라 관련 기능 제공
 */
export class CameraController {
  private camera: THREE.PerspectiveCamera
  private container: HTMLElement | null = null

  constructor(width: number, height: number, options: CameraOptions = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options }

    this.camera = new THREE.PerspectiveCamera(opts.fov, width / height, opts.near, opts.far)
    this.camera.position.copy(opts.position)
  }

  /**
   * 컨테이너 설정 (리사이즈용)
   */
  setContainer(container: HTMLElement): void {
    this.container = container
  }

  /**
   * 카메라 가져오기
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera
  }

  /**
   * 카메라 위치 설정
   */
  setPosition(x: number, y: number, z: number): void {
    this.camera.position.set(x, y, z)
  }

  /**
   * 카메라가 바라볼 대상 설정
   */
  lookAt(target: THREE.Vector3): void {
    this.camera.lookAt(target)
  }

  /**
   * 모델에 맞춰 카메라 자동 조정
   */
  fitToModel(object: THREE.Object3D, controls?: { target: THREE.Vector3; update: () => void }): void {
    const box = new THREE.Box3().setFromObject(object)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())

    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = this.camera.fov * (Math.PI / 180)
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))

    cameraZ *= 1.5 // 여유 공간

    // 대각선 방향에서 바라보도록 설정 (z-up 모델 대응)
    this.camera.position.set(
      center.x + cameraZ * 0.5,
      center.y + cameraZ * 0.5,
      center.z + cameraZ * 0.8
    )
    this.camera.lookAt(center)

    if (controls) {
      controls.target.copy(center)
      controls.update()
    }

    // 카메라 near/far 조정
    this.camera.near = cameraZ / 100
    this.camera.far = cameraZ * 100
    this.camera.updateProjectionMatrix()
  }

  /**
   * 리사이즈 처리
   */
  handleResize(): void {
    if (!this.container) return

    const width = this.container.clientWidth
    const height = this.container.clientHeight

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  /**
   * FOV 설정
   */
  setFov(fov: number): void {
    this.camera.fov = fov
    this.camera.updateProjectionMatrix()
  }

  /**
   * target을 중심으로 y축 기준 회전 (각도 단위)
   */
  rotateAroundTarget(degrees: number, target: THREE.Vector3): void {
    const radians = THREE.MathUtils.degToRad(degrees)
    const offset = this.camera.position.clone().sub(target)

    // y축 기준 회전
    const cos = Math.cos(radians)
    const sin = Math.sin(radians)
    const x = offset.x * cos + offset.z * sin
    const z = -offset.x * sin + offset.z * cos

    this.camera.position.set(target.x + x, target.y + offset.y, target.z + z)
    this.camera.lookAt(target)
  }

  /**
   * 정리
   */
  dispose(): void {
    this.container = null
  }
}
