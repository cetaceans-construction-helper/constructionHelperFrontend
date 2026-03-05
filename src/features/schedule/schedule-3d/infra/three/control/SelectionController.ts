import * as THREE from 'three'

export interface SelectionOptions {
  /** 다중 선택 활성화 (Shift+클릭) */
  multiSelect: boolean
  /** 선택 시 하이라이트 색상 */
  highlightColor: number
  /** 선택 시 하이라이트 투명도 */
  highlightOpacity: number
}

export interface SelectionEvent {
  /** 선택된 객체 */
  object: THREE.Object3D
  /** 원본 마우스 이벤트 */
  originalEvent: MouseEvent
}

type SelectionCallback = (selected: THREE.Object3D[]) => void

/**
 * 3D 객체 선택 컨트롤러
 * 클릭으로 객체 선택, Shift+클릭으로 다중 선택
 */
export class SelectionController {
  private camera: THREE.Camera | null = null
  private scene: THREE.Scene | null = null
  private domElement: HTMLElement | null = null

  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2

  private selectableObjects: THREE.Object3D[] = []
  private selectedObjects: THREE.Object3D[] = []
  private originalMaterials: Map<string, THREE.Material | THREE.Material[]> = new Map()

  private options: SelectionOptions = {
    multiSelect: true,
    highlightColor: 0xfefd48,
    highlightOpacity: 1.0
  }

  private onSelectCallback: SelectionCallback | null = null
  private onDeselectCallback: SelectionCallback | null = null

  private boundOnClick: (event: MouseEvent) => void

  constructor() {
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.boundOnClick = this.onClick.bind(this)
  }

  /**
   * 초기화
   */
  init(camera: THREE.Camera, scene: THREE.Scene, domElement: HTMLElement): void {
    this.camera = camera
    this.scene = scene
    this.domElement = domElement

    this.domElement.addEventListener('click', this.boundOnClick)
  }

  /**
   * 선택 옵션 설정
   */
  setOptions(options: Partial<SelectionOptions>): void {
    this.options = {
      ...this.options,
      ...options
    }
  }

  /**
   * 선택 가능한 객체 설정
   */
  setSelectableObjects(objects: THREE.Object3D[]): void {
    this.selectableObjects = objects
  }

  /**
   * 선택 가능한 객체 추가
   */
  addSelectableObject(object: THREE.Object3D): void {
    if (!this.selectableObjects.includes(object)) {
      this.selectableObjects.push(object)
    }
  }

  /**
   * 모델의 모든 Mesh를 선택 가능하게 설정
   */
  setSelectableFromModel(model: THREE.Object3D): void {
    const meshes: THREE.Mesh[] = []
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child)
      }
    })
    this.selectableObjects = meshes
  }

  /**
   * 선택 콜백 설정
   */
  onSelect(callback: SelectionCallback): void {
    this.onSelectCallback = callback
  }

  /**
   * 선택 해제 콜백 설정
   */
  onDeselect(callback: SelectionCallback): void {
    this.onDeselectCallback = callback
  }

  /**
   * 현재 선택된 객체들 반환
   */
  getSelectedObjects(): THREE.Object3D[] {
    return [...this.selectedObjects]
  }

  /**
   * 객체가 선택되었는지 확인
   */
  isSelected(object: THREE.Object3D): boolean {
    return this.selectedObjects.includes(object)
  }

  /**
   * 프로그래밍 방식으로 객체 선택
   */
  select(object: THREE.Object3D, addToSelection = false): void {
    if (!addToSelection) {
      this.clearSelection()
    }

    if (!this.selectedObjects.includes(object)) {
      this.selectedObjects.push(object)
      this.applyHighlight(object)
      this.onSelectCallback?.(this.selectedObjects)
    }
  }

  /**
   * 프로그래밍 방식으로 객체 선택 해제
   */
  deselect(object: THREE.Object3D): void {
    const index = this.selectedObjects.indexOf(object)
    if (index !== -1) {
      this.selectedObjects.splice(index, 1)
      this.removeHighlight(object)
      this.onDeselectCallback?.(this.selectedObjects)
    }
  }

  /**
   * 모든 선택 해제
   */
  clearSelection(): void {
    for (const object of this.selectedObjects) {
      this.removeHighlight(object)
    }
    this.selectedObjects = []
    this.onDeselectCallback?.([])
  }

  /**
   * 마우스 클릭 핸들러
   */
  private onClick(event: MouseEvent): void {
    if (!this.camera || !this.domElement) return

    // 마우스 좌표를 정규화된 디바이스 좌표로 변환
    const rect = this.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    // Raycaster 업데이트
    this.raycaster.setFromCamera(this.mouse, this.camera)

    // 교차 검사
    const intersects = this.raycaster.intersectObjects(this.selectableObjects, true)
    const firstIntersect = intersects[0]

    if (firstIntersect) {
      const intersected = this.findSelectableParent(firstIntersect.object)

      if (intersected) {
        const isShiftPressed = event.shiftKey && this.options.multiSelect

        if (isShiftPressed) {
          // Shift+클릭: 토글 선택
          if (this.isSelected(intersected)) {
            this.deselect(intersected)
          } else {
            this.select(intersected, true)
          }
        } else {
          // 일반 클릭: 단일 선택
          this.select(intersected, false)
        }
      }
    } else {
      // 빈 공간 클릭: 선택 해제
      if (!event.shiftKey) {
        this.clearSelection()
      }
    }
  }

  /**
   * 선택 가능한 부모 객체 찾기
   */
  private findSelectableParent(object: THREE.Object3D): THREE.Object3D | null {
    let current: THREE.Object3D | null = object

    while (current) {
      if (this.selectableObjects.includes(current)) {
        return current
      }
      current = current.parent
    }

    // 직접 포함되지 않은 경우, 클릭된 객체 자체 반환
    if (object instanceof THREE.Mesh) {
      return object
    }

    return null
  }

  /**
   * 하이라이트 적용
   */
  private applyHighlight(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // 원본 재질 저장
        if (!this.originalMaterials.has(child.uuid)) {
          this.originalMaterials.set(child.uuid, child.material)
        }

        // 하이라이트 재질 생성
        const originalMaterial = this.originalMaterials.get(child.uuid)
        if (originalMaterial) {
          const highlightMaterial = this.createHighlightMaterial(originalMaterial)
          child.material = highlightMaterial
        }
      }
    })
  }

  /**
   * 하이라이트 제거
   */
  private removeHighlight(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const originalMaterial = this.originalMaterials.get(child.uuid)
        if (originalMaterial) {
          child.material = originalMaterial
          this.originalMaterials.delete(child.uuid)
        }
      }
    })
  }

  /**
   * 하이라이트 재질 생성
   */
  private createHighlightMaterial(
    original: THREE.Material | THREE.Material[]
  ): THREE.Material | THREE.Material[] {
    if (Array.isArray(original)) {
      return original.map((mat) => this.createSingleHighlightMaterial(mat))
    }
    return this.createSingleHighlightMaterial(original)
  }

  /**
   * 단일 하이라이트 재질 생성
   */
  private createSingleHighlightMaterial(original: THREE.Material): THREE.Material {
    const cloned = original.clone()

    // 색상을 직접 변경
    if (cloned instanceof THREE.MeshStandardMaterial ||
        cloned instanceof THREE.MeshPhongMaterial ||
        cloned instanceof THREE.MeshBasicMaterial ||
        cloned instanceof THREE.MeshLambertMaterial) {
      cloned.color = new THREE.Color(this.options.highlightColor)
      // emissive 초기화
      if ('emissive' in cloned) {
        cloned.emissive = new THREE.Color(0x000000)
      }
    }

    return cloned
  }

  /**
   * 원본 material 조회 (opacity 동기화용)
   */
  getOriginalMaterial(uuid: string): THREE.Material | THREE.Material[] | undefined {
    return this.originalMaterials.get(uuid)
  }

  /**
   * 정리
   */
  dispose(): void {
    if (this.domElement) {
      this.domElement.removeEventListener('click', this.boundOnClick)
    }

    // 모든 하이라이트 제거
    this.clearSelection()
    this.originalMaterials.clear()

    this.camera = null
    this.scene = null
    this.domElement = null
    this.selectableObjects = []
    this.selectedObjects = []
    this.onSelectCallback = null
    this.onDeselectCallback = null
  }
}
