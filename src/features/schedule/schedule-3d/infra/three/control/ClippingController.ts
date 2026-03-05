import * as THREE from 'three'

export type ClippingAxis = 'x' | 'y' | 'z'

/**
 * 3D 모델 클리핑 컨트롤러
 * 평면으로 모델을 잘라서 단면을 볼 수 있게 함
 */
export class ClippingController {
  private plane: THREE.Plane | null = null
  private planeHelper: THREE.Mesh | null = null
  private boundingBox: THREE.Box3 | null = null
  private currentAxis: ClippingAxis | null = null
  private isEnabled = false
  private isDragging = false

  private scene: THREE.Scene | null = null
  private camera: THREE.Camera | null = null
  private domElement: HTMLElement | null = null
  private renderer: THREE.WebGLRenderer | null = null
  private targetModel: THREE.Object3D | null = null

  private raycaster = new THREE.Raycaster()
  private mouse = new THREE.Vector2()
  private dragStartPoint = new THREE.Vector3()
  private planePosition = 0

  // 이벤트 핸들러 참조
  private mouseDownHandler: ((e: MouseEvent) => void) | null = null
  private mouseMoveHandler: ((e: MouseEvent) => void) | null = null
  private mouseUpHandler: ((e: MouseEvent) => void) | null = null

  // 콜백
  private onChangeCallback: ((position: number, axis: ClippingAxis) => void) | null = null

  /**
   * 컨트롤러 초기화
   */
  init(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    domElement: HTMLElement
  ): void {
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    this.domElement = domElement

    // 렌더러에서 클리핑 활성화
    this.renderer.localClippingEnabled = true

    // 이벤트 핸들러 설정
    this.mouseDownHandler = this.onMouseDown.bind(this)
    this.mouseMoveHandler = this.onMouseMove.bind(this)
    this.mouseUpHandler = this.onMouseUp.bind(this)

    domElement.addEventListener('mousedown', this.mouseDownHandler)
    domElement.addEventListener('mousemove', this.mouseMoveHandler)
    domElement.addEventListener('mouseup', this.mouseUpHandler)
  }

  /**
   * 클리핑할 모델 설정
   */
  setTargetModel(model: THREE.Object3D): void {
    this.targetModel = model
    this.updateBoundingBox()
  }

  /**
   * 바운딩박스 업데이트
   */
  private updateBoundingBox(): void {
    if (!this.targetModel) return

    this.boundingBox = new THREE.Box3().setFromObject(this.targetModel)
  }

  /**
   * 특정 축에 수직인 클리핑 평면 생성
   */
  createPlane(axis: ClippingAxis): void {
    if (!this.boundingBox || !this.scene) return

    // 기존 평면 제거
    this.removePlane()

    this.currentAxis = axis

    // 축에 따른 법선 벡터 설정
    let normal: THREE.Vector3
    let initialPosition: number

    const center = new THREE.Vector3()
    this.boundingBox.getCenter(center)

    switch (axis) {
      case 'x':
        normal = new THREE.Vector3(1, 0, 0)
        initialPosition = center.x
        break
      case 'y':
        normal = new THREE.Vector3(0, 1, 0)
        initialPosition = center.y
        break
      case 'z':
        normal = new THREE.Vector3(0, 0, 1)
        initialPosition = center.z
        break
    }

    // THREE.Plane 생성 (법선 방향 + 원점으로부터의 거리)
    this.plane = new THREE.Plane(normal, -initialPosition)
    this.planePosition = initialPosition

    // 시각적 평면 헬퍼 생성
    this.createPlaneHelper(axis, initialPosition)

    // 모델의 모든 material에 clipping plane 적용
    this.applyClippingToModel()

    this.isEnabled = true
  }

  /**
   * 시각적 평면 헬퍼 생성
   */
  private createPlaneHelper(axis: ClippingAxis, position: number): void {
    if (!this.boundingBox || !this.scene) return

    const size = new THREE.Vector3()
    this.boundingBox.getSize(size)

    // 평면 크기 (바운딩박스보다 약간 크게)
    let width: number, height: number
    const padding = 1.2

    switch (axis) {
      case 'x':
        width = size.z * padding
        height = size.y * padding
        break
      case 'y':
        width = size.x * padding
        height = size.z * padding
        break
      case 'z':
        width = size.x * padding
        height = size.y * padding
        break
    }

    const geometry = new THREE.PlaneGeometry(width, height)
    const material = new THREE.MeshBasicMaterial({
      color: 0x00aaff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false
    })

    this.planeHelper = new THREE.Mesh(geometry, material)

    // 평면 위치 및 회전 설정
    const center = new THREE.Vector3()
    this.boundingBox.getCenter(center)

    switch (axis) {
      case 'x':
        this.planeHelper.rotation.y = Math.PI / 2
        this.planeHelper.position.set(position, center.y, center.z)
        break
      case 'y':
        this.planeHelper.rotation.x = -Math.PI / 2
        this.planeHelper.position.set(center.x, position, center.z)
        break
      case 'z':
        this.planeHelper.position.set(center.x, center.y, position)
        break
    }

    this.scene.add(this.planeHelper)
  }

  /**
   * 모델에 클리핑 평면 적용
   */
  private applyClippingToModel(): void {
    if (!this.targetModel || !this.plane) return

    this.targetModel.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        materials.forEach((mat) => {
          mat.clippingPlanes = [this.plane!]
          mat.clipShadows = true
          mat.needsUpdate = true
        })
      }
    })
  }

  /**
   * 모델에서 클리핑 평면 제거
   */
  private removeClippingFromModel(): void {
    if (!this.targetModel) return

    this.targetModel.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        materials.forEach((mat) => {
          mat.clippingPlanes = []
          mat.needsUpdate = true
        })
      }
    })
  }

  /**
   * 평면 위치 설정
   */
  setPlanePosition(value: number): void {
    if (!this.plane || !this.planeHelper || !this.boundingBox || !this.currentAxis) return

    // 바운딩박스 범위 내로 제한
    const min = this.boundingBox.min
    const max = this.boundingBox.max

    let clampedValue: number
    switch (this.currentAxis) {
      case 'x':
        clampedValue = THREE.MathUtils.clamp(value, min.x, max.x)
        this.planeHelper.position.x = clampedValue
        break
      case 'y':
        clampedValue = THREE.MathUtils.clamp(value, min.y, max.y)
        this.planeHelper.position.y = clampedValue
        break
      case 'z':
        clampedValue = THREE.MathUtils.clamp(value, min.z, max.z)
        this.planeHelper.position.z = clampedValue
        break
    }

    this.planePosition = clampedValue
    this.plane.constant = -clampedValue

    // 콜백 호출
    if (this.onChangeCallback) {
      this.onChangeCallback(clampedValue, this.currentAxis)
    }
  }

  /**
   * 마우스 좌표를 정규화된 디바이스 좌표로 변환
   */
  private updateMousePosition(event: MouseEvent): void {
    if (!this.domElement) return

    const rect = this.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  /**
   * 마우스 다운 이벤트
   */
  private onMouseDown(event: MouseEvent): void {
    if (!this.isEnabled || !this.planeHelper || !this.camera) return

    this.updateMousePosition(event)
    this.raycaster.setFromCamera(this.mouse, this.camera)

    const intersects = this.raycaster.intersectObject(this.planeHelper)
    const firstIntersect = intersects[0]
    if (firstIntersect) {
      this.isDragging = true
      this.dragStartPoint.copy(firstIntersect.point)

      // 드래그 중 색상 변경
      const material = this.planeHelper.material as THREE.MeshBasicMaterial
      material.color.setHex(0xff6600)
      material.opacity = 0.5

      event.preventDefault()
      event.stopPropagation()
    }
  }

  /**
   * 마우스 이동 이벤트
   */
  private onMouseMove(event: MouseEvent): void {
    if (!this.isDragging || !this.camera || !this.currentAxis || !this.boundingBox) return

    this.updateMousePosition(event)
    this.raycaster.setFromCamera(this.mouse, this.camera)

    // 축 방향으로만 이동하도록 평면과 ray의 교차점 계산
    const center = new THREE.Vector3()
    this.boundingBox.getCenter(center)

    // 드래그 평면 생성 (카메라 방향에 수직)
    const cameraDirection = new THREE.Vector3()
    this.camera.getWorldDirection(cameraDirection)

    // 축에 수직인 평면과의 교차점 계산
    let dragPlane: THREE.Plane
    switch (this.currentAxis) {
      case 'x':
        dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -center.z)
        break
      case 'y':
        dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -center.z)
        break
      case 'z':
        dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -center.y)
        break
    }

    const intersectPoint = new THREE.Vector3()
    this.raycaster.ray.intersectPlane(dragPlane, intersectPoint)

    if (intersectPoint) {
      // 축 방향 성분만 추출
      let newPosition: number
      switch (this.currentAxis) {
        case 'x':
          newPosition = intersectPoint.x
          break
        case 'y':
          newPosition = intersectPoint.y
          break
        case 'z':
          newPosition = intersectPoint.z
          break
      }

      this.setPlanePosition(newPosition)
    }

    event.preventDefault()
  }

  /**
   * 마우스 업 이벤트
   */
  private onMouseUp(): void {
    if (!this.isDragging) return

    this.isDragging = false

    // 색상 복원
    if (this.planeHelper) {
      const material = this.planeHelper.material as THREE.MeshBasicMaterial
      material.color.setHex(0x00aaff)
      material.opacity = 0.3
    }
  }

  /**
   * 클리핑 활성화
   */
  enable(): void {
    this.isEnabled = true
    if (this.planeHelper) {
      this.planeHelper.visible = true
    }
    this.applyClippingToModel()
  }

  /**
   * 클리핑 비활성화
   */
  disable(): void {
    this.isEnabled = false
    if (this.planeHelper) {
      this.planeHelper.visible = false
    }
    this.removeClippingFromModel()
  }

  /**
   * 평면 제거
   */
  removePlane(): void {
    this.removeClippingFromModel()

    if (this.planeHelper && this.scene) {
      this.scene.remove(this.planeHelper)
      this.planeHelper.geometry.dispose()
      ;(this.planeHelper.material as THREE.Material).dispose()
      this.planeHelper = null
    }

    this.plane = null
    this.currentAxis = null
    this.isEnabled = false
  }

  /**
   * 현재 상태 가져오기
   */
  getState(): {
    isEnabled: boolean
    axis: ClippingAxis | null
    position: number
  } {
    return {
      isEnabled: this.isEnabled,
      axis: this.currentAxis,
      position: this.planePosition
    }
  }

  /**
   * 바운딩박스 가져오기
   */
  getBoundingBox(): THREE.Box3 | null {
    return this.boundingBox
  }

  /**
   * 클리핑 평면 가져오기
   */
  getPlane(): THREE.Plane | null {
    return this.plane
  }

  /**
   * 변경 콜백 설정
   */
  onChange(callback: (position: number, axis: ClippingAxis) => void): void {
    this.onChangeCallback = callback
  }

  /**
   * 정리
   */
  dispose(): void {
    this.removePlane()

    if (this.domElement) {
      if (this.mouseDownHandler) {
        this.domElement.removeEventListener('mousedown', this.mouseDownHandler)
      }
      if (this.mouseMoveHandler) {
        this.domElement.removeEventListener('mousemove', this.mouseMoveHandler)
      }
      if (this.mouseUpHandler) {
        this.domElement.removeEventListener('mouseup', this.mouseUpHandler)
      }
    }

    this.mouseDownHandler = null
    this.mouseMoveHandler = null
    this.mouseUpHandler = null
    this.scene = null
    this.camera = null
    this.domElement = null
    this.renderer = null
    this.targetModel = null
    this.onChangeCallback = null
  }
}
