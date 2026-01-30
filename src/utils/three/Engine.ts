import * as THREE from 'three'
import { createModelFromApiData } from './loader/apiModelLoader'
import type { Object3d } from '@/types/object3d'
import { CameraController } from './control/CameraController'
import { RotationController } from './control/RotationController'
import { SelectionController, type SelectionOptions } from './control/SelectionController'
// import { ClippingController, type ClippingAxis } from './control/ClippingController'

export interface EngineOptions {
  enableShadows?: boolean
  backgroundColor?: number
  ambientLightIntensity?: number
  directionalLightIntensity?: number
}

export class Engine {
  private scene: THREE.Scene
  private renderer: THREE.WebGLRenderer
  private animationId: number | null = null
  private resizeHandler: (() => void) | null = null

  private rhinoModel: THREE.Object3D | null = null
  private originalColors: Map<string, THREE.Color> = new Map()
  private cameraController: CameraController
  private rotationController: RotationController
  private selectionController: SelectionController
  // private clippingController: ClippingController

  public isLoading = false
  public loadProgress = 0
  public loadError: string | null = null

  constructor(
    private container: HTMLElement,
    options: EngineOptions = {}
  ) {
    const {
      enableShadows = true,
      backgroundColor = 0xf0f0f0,
      ambientLightIntensity = 0.6,
      directionalLightIntensity = 0.8
    } = options

    const width = container.clientWidth
    const height = container.clientHeight

    // Scene 초기화
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(backgroundColor)

    // CameraController 초기화
    this.cameraController = new CameraController(width, height)
    this.cameraController.setContainer(container)

    // Renderer 초기화
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.shadowMap.enabled = enableShadows
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.container.appendChild(this.renderer.domElement)

    // 조명 설정
    const ambientLight = new THREE.AmbientLight(0xffffff, ambientLightIntensity)
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, directionalLightIntensity)
    directionalLight.position.set(10, 10, 10)
    directionalLight.castShadow = enableShadows
    if (enableShadows) {
      directionalLight.shadow.mapSize.width = 2048
      directionalLight.shadow.mapSize.height = 2048
      directionalLight.shadow.camera.near = 0.5
      directionalLight.shadow.camera.far = 500
    }
    this.scene.add(directionalLight)

    // RotationController 초기화 (OrbitControls 포함)
    this.rotationController = new RotationController()
    this.rotationController.initControls(this.cameraController.getCamera(), this.renderer.domElement)

    // SelectionController 초기화
    this.selectionController = new SelectionController()
    this.selectionController.init(this.cameraController.getCamera(), this.scene, this.renderer.domElement)

    // ClippingController 초기화 (비활성화)
    // this.clippingController = new ClippingController()
    // this.clippingController.init(this.scene, this.cameraController.getCamera(), this.renderer, this.renderer.domElement)

    // 리사이즈 핸들러
    this.resizeHandler = this.handleResize.bind(this)
    window.addEventListener('resize', this.resizeHandler)

    // 애니메이션 시작
    this.startAnimation()
  }

  /**
   * API 모델 데이터 로드 (백엔드 응답 데이터)
   */
  loadApiModel(models: Object3d[]): THREE.Object3D {
    this.isLoading = true
    this.loadError = null
    this.loadProgress = 0

    try {
      this.rhinoModel = createModelFromApiData(models)

      // z-up → y-up 좌표계 변환 (Rhino → Three.js)
      this.rhinoModel.rotation.x = -Math.PI / 2

      // 씬에 추가
      this.scene.add(this.rhinoModel)

      // 카메라 자동 조정 (CameraController에 위임)
      this.cameraController.fitToModel(this.rhinoModel, this.getControls() ?? undefined)

      // RotationController에 타겟 설정
      this.rotationController.setTarget(this.rhinoModel)

      // SelectionController에 선택 가능한 객체 설정
      this.selectionController.setSelectableFromModel(this.rhinoModel)

      this.loadProgress = 100
      return this.rhinoModel
    } catch (error) {
      console.error('API 모델 로드 실패:', error)
      this.loadError = error instanceof Error ? error.message : '알 수 없는 오류'
      throw error
    } finally {
      this.isLoading = false
    }
  }

  /**
   * y축 기준 카메라 회전 (각도 단위) - target 중심으로 회전
   */
  rotateZ(degrees: number): void {
    const controls = this.getControls()
    if (controls) {
      this.cameraController.rotateAroundTarget(degrees, controls.target)
      controls.update()
    }
  }

  // =====================
  // 씬 관리
  // =====================

  /**
   * 씬에 객체 추가
   */
  addToScene(object: THREE.Object3D): void {
    this.scene.add(object)
  }

  /**
   * 씬에서 객체 제거
   */
  removeFromScene(object: THREE.Object3D): void {
    this.scene.remove(object)
  }

  // =====================
  // Getter 메서드
  // =====================

  /**
   * 카메라 가져오기 (CameraController 경유)
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.cameraController.getCamera()
  }

  /**
   * CameraController 가져오기
   */
  getCameraController(): CameraController {
    return this.cameraController
  }

  /**
   * 씬 가져오기
   */
  getScene(): THREE.Scene {
    return this.scene
  }

  /**
   * 렌더러 가져오기
   */
  getRenderer(): THREE.WebGLRenderer {
    return this.renderer
  }

  /**
   * 컨트롤 가져오기 (RotationController 경유)
   */
  getControls() {
    return this.rotationController.getControls()
  }

  /**
   * 현재 로드된 모델 가져오기
   */
  getModel(): THREE.Object3D | null {
    return this.rhinoModel
  }

  /**
   * RotationController 가져오기
   */
  getRotationController(): RotationController {
    return this.rotationController
  }

  /**
   * SelectionController 가져오기
   */
  getSelectionController(): SelectionController {
    return this.selectionController
  }

  // /**
  //  * ClippingController 가져오기
  //  */
  // getClippingController(): ClippingController {
  //   return this.clippingController
  // }

  // // =====================
  // // 클리핑 제어 (ClippingController에 위임)
  // // =====================

  // /**
  //  * 클리핑 평면 생성
  //  */
  // createClippingPlane(axis: ClippingAxis): void {
  //   this.clippingController.createPlane(axis)
  // }

  // /**
  //  * 클리핑 평면 위치 설정
  //  */
  // setClippingPosition(value: number): void {
  //   this.clippingController.setPlanePosition(value)
  // }

  // /**
  //  * 클리핑 활성화
  //  */
  // enableClipping(): void {
  //   this.clippingController.enable()
  // }

  // /**
  //  * 클리핑 비활성화
  //  */
  // disableClipping(): void {
  //   this.clippingController.disable()
  // }

  // /**
  //  * 클리핑 평면 제거
  //  */
  // removeClippingPlane(): void {
  //   this.clippingController.removePlane()
  // }

  // /**
  //  * 클리핑 상태 가져오기
  //  */
  // getClippingState(): { isEnabled: boolean; axis: ClippingAxis | null; position: number } {
  //   return this.clippingController.getState()
  // }

  // /**
  //  * 클리핑 변경 콜백 설정
  //  */
  // onClippingChange(callback: (position: number, axis: ClippingAxis) => void): void {
  //   this.clippingController.onChange(callback)
  // }

  // =====================
  // 선택 제어 (SelectionController에 위임)
  // =====================

  /**
   * 선택 옵션 설정
   */
  setSelectionOptions(options: Partial<SelectionOptions>): void {
    this.selectionController.setOptions(options)
  }

  /**
   * 객체 선택
   */
  selectObject(object: THREE.Object3D, addToSelection = false): void {
    this.selectionController.select(object, addToSelection)
  }

  /**
   * 객체 선택 해제
   */
  deselectObject(object: THREE.Object3D): void {
    this.selectionController.deselect(object)
  }

  /**
   * 모든 선택 해제
   */
  clearSelection(): void {
    this.selectionController.clearSelection()
  }

  /**
   * 선택된 객체들 가져오기
   */
  getSelectedObjects(): THREE.Object3D[] {
    return this.selectionController.getSelectedObjects()
  }

  /**
   * 객체가 선택되었는지 확인
   */
  isObjectSelected(object: THREE.Object3D): boolean {
    return this.selectionController.isSelected(object)
  }

  /**
   * 선택 콜백 설정
   */
  onObjectSelect(callback: (selected: THREE.Object3D[]) => void): void {
    this.selectionController.onSelect(callback)
  }

  /**
   * 선택 해제 콜백 설정
   */
  onObjectDeselect(callback: (selected: THREE.Object3D[]) => void): void {
    this.selectionController.onDeselect(callback)
  }

  // =====================
  // 모델 가시성/강조 제어
  // =====================

  /**
   * 오브젝트 가시성 설정
   * visibleIds가 null이면 모든 오브젝트 표시
   */
  setObjectVisibility(visibleIds: Set<number> | null): void {
    if (!this.rhinoModel) return
    this.rhinoModel.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.dbId != null) {
        child.visible = visibleIds === null || visibleIds.has(child.userData.dbId)
      }
    })
  }

  /**
   * 오브젝트 강조 설정 (비강조 오브젝트는 회색 처리)
   * emphasizedIds가 null이면 모든 오브젝트 원래 색상
   * emphasizedIds가 Set이면 해당 ID만 원래 색상, 나머지 회색
   */
  setObjectEmphasis(emphasizedIds: Set<number> | null): void {
    if (!this.rhinoModel) return
    const GRAY = new THREE.Color(0x888888)

    this.rhinoModel.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.dbId != null) {
        const isEmphasized = emphasizedIds === null || emphasizedIds.has(child.userData.dbId)

        // 원래 색상 저장 (최초 1회)
        if (!this.originalColors.has(child.uuid)) {
          const storedOrig = this.selectionController.getOriginalMaterial(child.uuid)
          const trueMat = (storedOrig && !Array.isArray(storedOrig))
            ? storedOrig as THREE.MeshStandardMaterial
            : child.material as THREE.MeshStandardMaterial
          this.originalColors.set(child.uuid, trueMat.color.clone())
        }

        const targetColor = isEmphasized
          ? this.originalColors.get(child.uuid)!
          : GRAY

        // 3D 선택 중이면 원본 material만 변경 (하이라이트 clone은 유지)
        const storedOrig = this.selectionController.getOriginalMaterial(child.uuid)
        if (storedOrig && !Array.isArray(storedOrig)) {
          const orig = storedOrig as THREE.MeshStandardMaterial
          orig.color.copy(targetColor)
          orig.needsUpdate = true
        } else {
          const currentMat = child.material as THREE.MeshStandardMaterial
          currentMat.color.copy(targetColor)
          currentMat.needsUpdate = true
        }
      }
    })
  }

  // =====================
  // 내부 메서드
  // =====================

  /**
   * 애니메이션 루프 시작
   */
  private startAnimation(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate)

      // 회전 및 OrbitControls 업데이트 (RotationController에 위임)
      this.rotationController.update()

      // 렌더링
      this.renderer.render(this.scene, this.cameraController.getCamera())
    }

    animate()
  }

  /**
   * 애니메이션 루프 중지
   */
  private stopAnimation(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  /**
   * 리사이즈 핸들러
   */
  private handleResize(): void {
    const width = this.container.clientWidth
    const height = this.container.clientHeight

    // 카메라 리사이즈 (CameraController에 위임)
    this.cameraController.handleResize()

    this.renderer.setSize(width, height)
  }

  /**
   * 엔진 정리 (메모리 해제)
   */
  dispose(): void {
    this.stopAnimation()

    // CameraController 정리
    this.cameraController.dispose()

    // RotationController 정리
    this.rotationController.dispose()

    // SelectionController 정리
    this.selectionController.dispose()

    // 원본 색상 맵 정리
    this.originalColors.clear()

    // ClippingController 정리 (비활성화)
    // this.clippingController.dispose()

    // 모델 정리
    if (this.rhinoModel) {
      this.rhinoModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose())
          } else {
            child.material.dispose()
          }
        }
      })
      this.scene.remove(this.rhinoModel)
      this.rhinoModel = null
    }

    // OrbitControls 정리는 RotationController.dispose()에서 처리됨

    // 렌더러 정리
    this.renderer.dispose()

    // 리사이즈 핸들러 제거
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler)
      this.resizeHandler = null
    }

    // DOM에서 캔버스 제거
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement)
    }
  }
}
