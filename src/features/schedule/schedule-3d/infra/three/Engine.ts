import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createModelFromApiData } from './loader/apiModelLoader'
import type { Object3d } from '@/features/schedule/schedule-3d/model/object3d-types'
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
  private axisGroup: THREE.Group | null = null
  private axisData: { xAxes: { name: string; position: number }[]; yAxes: { name: string; position: number }[] } | null = null
  private isTopView = false
  private orthoCamera: THREE.OrthographicCamera | null = null
  private orthoControls: OrbitControls | null = null
  private orthoWheelHandler: ((e: WheelEvent) => void) | null = null
  private orthoKeyDown: ((e: KeyboardEvent) => void) | null = null
  private orthoKeyUp: ((e: KeyboardEvent) => void) | null = null
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
    this.selectionController.init(this.cameraController.getCamera(), this.scene, this.renderer.domElement, this.renderer)

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
   * 축선 데이터 저장 (퍼스펙티브에서는 렌더링하지 않음, 탑뷰 전환 시 렌더링)
   */
  addAxisLines(xAxes: { name: string; position: number }[], yAxes: { name: string; position: number }[]): void {
    this.axisData = { xAxes, yAxes }
    // 탑뷰 중이면 즉시 렌더링
    if (this.isTopView) this.renderAxisLines()
  }

  private renderAxisLines(): void {
    this.removeAxisLines()
    if (!this.axisData || !this.rhinoModel) return

    const { xAxes, yAxes } = this.axisData
    const axisY = 1000000 // 충분히 높은 위치 (탑뷰 오쏘 카메라에서 모델 위로 렌더링)

    const xPositions = xAxes.map(a => a.position)
    const yPositions = yAxes.map(a => a.position)
    const xMin = xPositions.length > 0 ? Math.min(...xPositions) : 0
    const xMax = xPositions.length > 0 ? Math.max(...xPositions) : 0
    const yMin = yPositions.length > 0 ? Math.min(...yPositions) : 0
    const yMax = yPositions.length > 0 ? Math.max(...yPositions) : 0
    const xSpan = xMax - xMin || 10000
    const ySpan = yMax - yMin || 10000
    const xOverhang = xSpan * 0.25
    const yOverhang = ySpan * 0.25

    this.axisGroup = new THREE.Group()
    this.axisGroup.name = 'AxisLines'

    for (const axis of xAxes) {
      const x = axis.position
      const zStart = -(yMin - yOverhang)
      const zEnd = -(yMax + yOverhang)
      this.createDashedLine(
        new THREE.Vector3(x, axisY, zStart),
        new THREE.Vector3(x, axisY, zEnd),
        0xef4444
      )
      this.createTextSprite(`X${axis.name}`, new THREE.Vector3(x, axisY, zEnd - ySpan * 0.05), 0xef4444)
    }

    for (const axis of yAxes) {
      const z = -axis.position
      const xStart = xMin - xOverhang
      const xEnd = xMax + xOverhang
      this.createDashedLine(
        new THREE.Vector3(xStart, axisY, z),
        new THREE.Vector3(xEnd, axisY, z),
        0x3b82f6
      )
      this.createTextSprite(`Y${axis.name}`, new THREE.Vector3(xStart - xSpan * 0.05, axisY, z), 0x3b82f6)
    }

    this.scene.add(this.axisGroup)
  }

  private createDashedLine(start: THREE.Vector3, end: THREE.Vector3, color: number): void {
    if (!this.axisGroup) return
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end])
    const material = new THREE.LineDashedMaterial({
      color,
      dashSize: 500,
      gapSize: 250,
      linewidth: 1,
    })
    const line = new THREE.Line(geometry, material)
    line.computeLineDistances()
    this.axisGroup.add(line)
  }

  private createTextSprite(text: string, position: THREE.Vector3, color: number): void {
    if (!this.axisGroup) return
    const canvas = document.createElement('canvas')
    const size = 256
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, size, size)
    ctx.font = 'bold 120px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`
    ctx.fillText(text, size / 2, size / 2)

    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false })
    const sprite = new THREE.Sprite(material)
    sprite.position.copy(position)

    // 스프라이트 크기: 모델 스케일에 맞춤
    const box = new THREE.Box3().setFromObject(this.rhinoModel!)
    const modelSize = box.getSize(new THREE.Vector3())
    const spriteScale = Math.max(modelSize.x, modelSize.z) * 0.04
    sprite.scale.set(spriteScale, spriteScale, 1)

    this.axisGroup.add(sprite)
  }

  removeAxisLines(): void {
    if (this.axisGroup) {
      this.axisGroup.traverse((child) => {
        if (child instanceof THREE.Line) {
          child.geometry.dispose()
          ;(child.material as THREE.Material).dispose()
        }
        if (child instanceof THREE.Sprite) {
          child.material.map?.dispose()
          child.material.dispose()
        }
      })
      this.scene.remove(this.axisGroup)
      this.axisGroup = null
    }
  }

  /**
   * 탑뷰: OrthographicCamera로 전환, 위에서 아래를 내려다보는 시점
   */
  setTopView(): void {
    if (!this.rhinoModel) return
    const box = new THREE.Box3().setFromObject(this.rhinoModel)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())

    const width = this.container.clientWidth
    const height = this.container.clientHeight
    const aspect = width / height

    // 모델이 화면에 맞도록 frustum 계산
    const maxDim = Math.max(size.x, size.z) * 0.75
    const frustumH = maxDim
    const frustumW = frustumH * aspect

    this.orthoCamera = new THREE.OrthographicCamera(
      -frustumW, frustumW, frustumH, -frustumH,
      0.1, 2000001,
    )
    this.orthoCamera.up.set(0, 0, -1) // Rhino Y(→Three.js -Z)가 화면 위쪽
    this.orthoCamera.position.set(center.x, 1000001, center.z)
    this.orthoCamera.lookAt(center)
    this.orthoCamera.updateProjectionMatrix()

    // 탑뷰 전용 OrbitControls
    const isPortrait = window.matchMedia('(max-aspect-ratio: 1/1)').matches
    this.orthoControls = new OrbitControls(this.orthoCamera, this.renderer.domElement)
    this.orthoControls.enableRotate = false
    this.orthoControls.enablePan = isPortrait // 세로모드: 기본 패닝 활성화
    this.orthoControls.enableZoom = false
    this.orthoControls.enableDamping = false
    this.orthoControls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: null as unknown as THREE.MOUSE }
    this.orthoControls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN }
    this.orthoControls.target.set(center.x, 0, center.z)
    this.orthoControls.update()

    // 가로모드: Space 키로 패닝 토글
    if (!isPortrait) {
      this.orthoKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' && this.orthoControls) {
          e.preventDefault()
          this.orthoControls.enablePan = true
        }
      }
      this.orthoKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space' && this.orthoControls) {
          this.orthoControls.enablePan = false
        }
      }
      window.addEventListener('keydown', this.orthoKeyDown)
      window.addEventListener('keyup', this.orthoKeyUp)
    }

    // 가로모드: 휠 줌 핸들러 (세로모드: 스크롤 캡처 안함, 버튼 줌만)
    if (!isPortrait) {
      this.orthoWheelHandler = (e: WheelEvent) => {
        e.preventDefault()
        e.stopImmediatePropagation()
        const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9
        this.zoomOrtho(zoomFactor)
      }
      this.renderer.domElement.addEventListener('wheel', this.orthoWheelHandler, { passive: false, capture: true })
    }

    // SelectionController에 ortho 카메라 사용하도록 오버라이드
    this.selectionController.setCameraOverride(() => this.getActiveCamera())

    this.isTopView = true

    // 탑뷰에서만 축선 렌더링
    this.renderAxisLines()
  }

  private zoomOrtho(factor: number): void {
    if (!this.orthoCamera) return
    this.orthoCamera.left *= factor
    this.orthoCamera.right *= factor
    this.orthoCamera.top *= factor
    this.orthoCamera.bottom *= factor
    this.orthoCamera.updateProjectionMatrix()
  }

  zoomIn(): void { this.zoomOrtho(0.8) }
  zoomOut(): void { this.zoomOrtho(1.25) }

  /**
   * 기본 뷰 복귀: PerspectiveCamera로 전환
   */
  resetView(): void {
    // 축선 제거
    this.removeAxisLines()

    // ortho 정리
    if (this.orthoControls) {
      this.orthoControls.dispose()
      this.orthoControls = null
    }
    if (this.orthoWheelHandler) {
      this.renderer.domElement.removeEventListener('wheel', this.orthoWheelHandler, { capture: true })
      this.orthoWheelHandler = null
    }
    if (this.orthoKeyDown) { window.removeEventListener('keydown', this.orthoKeyDown); this.orthoKeyDown = null }
    if (this.orthoKeyUp) { window.removeEventListener('keyup', this.orthoKeyUp); this.orthoKeyUp = null }
    this.orthoCamera = null

    // SelectionController 카메라 오버라이드 해제
    this.selectionController.setCameraOverride(null)

    if (!this.rhinoModel) return
    this.cameraController.fitToModel(this.rhinoModel, this.getControls() ?? undefined)
    this.isTopView = false
  }

  /**
   * 현재 활성 카메라
   */
  getActiveCamera(): THREE.Camera {
    return this.isTopView && this.orthoCamera ? this.orthoCamera : this.cameraController.getCamera()
  }

  getIsTopView(): boolean {
    return this.isTopView
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
          const mat = child.material as THREE.MeshStandardMaterial
          this.originalColors.set(child.uuid, mat.color.clone())
        }

        const targetColor = isEmphasized
          ? this.originalColors.get(child.uuid)!
          : GRAY

        const currentMat = child.material as THREE.MeshStandardMaterial
        currentMat.color.copy(targetColor)
        currentMat.needsUpdate = true
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

      if (this.isTopView && this.orthoControls) {
        this.orthoControls.update()
      } else {
        this.rotationController.update()
      }

      this.renderer.render(this.scene, this.getActiveCamera())
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

    // ortho 카메라 리사이즈
    if (this.orthoCamera) {
      const aspect = width / height
      const frustumH = (this.orthoCamera.top - this.orthoCamera.bottom) / 2
      this.orthoCamera.left = -frustumH * aspect
      this.orthoCamera.right = frustumH * aspect
      this.orthoCamera.updateProjectionMatrix()
    }

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

    // 탑뷰 정리
    if (this.orthoControls) { this.orthoControls.dispose(); this.orthoControls = null }
    if (this.orthoWheelHandler) {
      this.renderer.domElement.removeEventListener('wheel', this.orthoWheelHandler, { capture: true })
      this.orthoWheelHandler = null
    }
    if (this.orthoKeyDown) { window.removeEventListener('keydown', this.orthoKeyDown); this.orthoKeyDown = null }
    if (this.orthoKeyUp) { window.removeEventListener('keyup', this.orthoKeyUp); this.orthoKeyUp = null }
    this.orthoCamera = null

    // 축선 정리
    this.removeAxisLines()

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
