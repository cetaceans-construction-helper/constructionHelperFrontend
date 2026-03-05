import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * 3D 객체 회전 컨트롤러
 * OrbitControls 관리 기능 제공
 */
export class RotationController {
  private target: THREE.Object3D | null = null
  private controls: OrbitControls | null = null
  private domElement: HTMLElement | null = null
  private wheelHandler: ((e: WheelEvent) => void) | null = null

  /**
   * OrbitControls 초기화 (Engine에서 이동)
   */
  initControls(camera: THREE.Camera, domElement: HTMLElement): void {
    this.domElement = domElement
    this.controls = new OrbitControls(camera, domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.enableZoom = false // 기본 줌 비활성화 (커스텀 휠 핸들러 사용)
    this.controls.enablePan = false // 드래그 이동 비활성화
    this.controls.enableRotate = false // 마우스 드래그 회전 비활성화

    // 휠 줌 핸들러
    this.wheelHandler = (e: WheelEvent) => {
      if (this.controls) {
        e.preventDefault()
        const zoomSpeed = 0.001
        const delta = e.deltaY * zoomSpeed
        const camera = this.controls.object as THREE.PerspectiveCamera
        camera.position.multiplyScalar(1 + delta)
        this.controls.update()
      }
    }
    domElement.addEventListener('wheel', this.wheelHandler, { passive: false })
  }

  /**
   * OrbitControls 가져오기
   */
  getControls(): OrbitControls | null {
    return this.controls
  }

  /**
   * 회전 대상 객체 설정
   */
  setTarget(object: THREE.Object3D | null): void {
    this.target = object
  }

  /**
   * 현재 회전 대상 가져오기
   */
  getTarget(): THREE.Object3D | null {
    return this.target
  }

  /**
   * 애니메이션 루프에서 호출 - OrbitControls 업데이트
   */
  update(): void {
    this.controls?.update()
  }

  /**
   * 정리
   */
  dispose(): void {
    if (this.wheelHandler && this.domElement) {
      this.domElement.removeEventListener('wheel', this.wheelHandler)
      this.wheelHandler = null
    }
    this.controls?.dispose()
    this.controls = null
    this.target = null
    this.domElement = null
  }
}
