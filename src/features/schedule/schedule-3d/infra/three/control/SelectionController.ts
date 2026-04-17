import * as THREE from 'three'
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'

export interface SelectionOptions {
  multiSelect: boolean
  highlightColor: number
  highlightOpacity: number
}

type SelectionCallback = (selected: THREE.Object3D[]) => void

/**
 * 3D 객체 선택 컨트롤러
 * - 클릭: 단일 선택
 * - 드래그: 영역 내 visible 객체 전체 선택
 * - Shift/Space 누른 상태에서는 선택 비활성화 (회전/패닝)
 */
export class SelectionController {
  private camera: THREE.Camera | null = null
  private cameraOverride: (() => THREE.Camera) | null = null
  private scene: THREE.Scene | null = null
  private domElement: HTMLElement | null = null
  private renderer: THREE.WebGLRenderer | null = null

  private raycaster: THREE.Raycaster
  private mouse: THREE.Vector2

  private selectableObjects: THREE.Object3D[] = []
  private selectedObjects: THREE.Object3D[] = []
  private highlightLines: Map<string, LineSegments2[]> = new Map()
  private originalColors: Map<string, THREE.Color> = new Map()

  private options: SelectionOptions = {
    multiSelect: true,
    highlightColor: 0xfefd48,
    highlightOpacity: 1.0,
  }

  private onSelectCallback: SelectionCallback | null = null
  private onDeselectCallback: SelectionCallback | null = null

  // 드래그 영역 선택
  private isDragging = false
  private dragStart: { x: number; y: number } | null = null
  private selectionBox: HTMLDivElement | null = null
  private isSpaceOrShiftDown = false
  private isPortrait = false
  private portraitMql: MediaQueryList | null = null

  private boundMouseDown: (e: MouseEvent) => void
  private boundMouseMove: (e: MouseEvent) => void
  private boundMouseUp: (e: MouseEvent) => void
  private boundKeyDown: (e: KeyboardEvent) => void
  private boundKeyUp: (e: KeyboardEvent) => void

  constructor() {
    this.raycaster = new THREE.Raycaster()
    this.mouse = new THREE.Vector2()
    this.boundMouseDown = this.onMouseDown.bind(this)
    this.boundMouseMove = this.onMouseMove.bind(this)
    this.boundMouseUp = this.onMouseUp.bind(this)
    this.boundKeyDown = (e) => {
      if (e.code === 'Space') this.isSpaceOrShiftDown = true
    }
    this.boundKeyUp = (e) => {
      if (e.code === 'Space') this.isSpaceOrShiftDown = false
    }
  }

  init(camera: THREE.Camera, scene: THREE.Scene, domElement: HTMLElement, renderer?: THREE.WebGLRenderer): void {
    this.camera = camera
    this.scene = scene
    this.domElement = domElement
    this.renderer = renderer ?? null

    // 세로모드 감지 — 세로모드에서는 드래그 선택 비활성화 (패닝으로 사용)
    this.portraitMql = window.matchMedia('(max-aspect-ratio: 1/1)')
    this.isPortrait = this.portraitMql.matches
    this.portraitMql.addEventListener('change', (e) => { this.isPortrait = e.matches })

    domElement.addEventListener('mousedown', this.boundMouseDown)
    window.addEventListener('mousemove', this.boundMouseMove)
    window.addEventListener('mouseup', this.boundMouseUp)
    window.addEventListener('keydown', this.boundKeyDown)
    window.addEventListener('keyup', this.boundKeyUp)
  }

  setCameraOverride(fn: (() => THREE.Camera) | null): void {
    this.cameraOverride = fn
  }

  private getActiveCamera(): THREE.Camera | null {
    return this.cameraOverride ? this.cameraOverride() : this.camera
  }

  setOptions(options: Partial<SelectionOptions>): void {
    this.options = { ...this.options, ...options }
  }

  setSelectableObjects(objects: THREE.Object3D[]): void {
    this.selectableObjects = objects
  }

  addSelectableObject(object: THREE.Object3D): void {
    if (!this.selectableObjects.includes(object)) {
      this.selectableObjects.push(object)
    }
  }

  setSelectableFromModel(model: THREE.Object3D): void {
    const meshes: THREE.Mesh[] = []
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) meshes.push(child)
    })
    this.selectableObjects = meshes
  }

  onSelect(callback: SelectionCallback): void {
    this.onSelectCallback = callback
  }

  onDeselect(callback: SelectionCallback): void {
    this.onDeselectCallback = callback
  }

  getSelectedObjects(): THREE.Object3D[] {
    return [...this.selectedObjects]
  }

  isSelected(object: THREE.Object3D): boolean {
    return this.selectedObjects.includes(object)
  }

  select(object: THREE.Object3D, addToSelection = false): void {
    if (!addToSelection) this.clearSelection()
    if (!this.selectedObjects.includes(object)) {
      this.selectedObjects.push(object)
      this.applyHighlight(object)
      this.onSelectCallback?.(this.selectedObjects)
    }
  }

  deselect(object: THREE.Object3D): void {
    const index = this.selectedObjects.indexOf(object)
    if (index !== -1) {
      this.selectedObjects.splice(index, 1)
      this.removeHighlight(object)
      this.onDeselectCallback?.(this.selectedObjects)
    }
  }

  clearSelection(): void {
    for (const object of this.selectedObjects) {
      this.removeHighlight(object)
    }
    this.selectedObjects = []
    this.onDeselectCallback?.([])
  }

  // =====================
  // 마우스 이벤트
  // =====================

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return // 좌클릭만
    if (this.isSpaceOrShiftDown) return // 패닝 모드

    this.dragStart = { x: e.clientX, y: e.clientY }
    this.isDragging = false
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.dragStart) return
    if (this.isSpaceOrShiftDown) { this.dragStart = null; this.removeSelectionBox(); return }

    const dx = e.clientX - this.dragStart.x
    const dy = e.clientY - this.dragStart.y

    if (!this.isDragging && dx * dx + dy * dy > 25) {
      this.isDragging = true
    }

    // 세로모드: 드래그 영역 선택 비활성화 (패닝으로 사용)
    if (this.isDragging && !this.isPortrait) {
      this.updateSelectionBox(this.dragStart.x, this.dragStart.y, e.clientX, e.clientY)
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (!this.dragStart) return
    const start = this.dragStart
    this.dragStart = null
    this.removeSelectionBox()

    if (this.isSpaceOrShiftDown) return

    if (this.isDragging && !this.isPortrait) {
      // 드래그 영역 선택 (가로모드만)
      this.selectByRect(start.x, start.y, e.clientX, e.clientY)
    } else if (!this.isDragging) {
      // 클릭 선택 (5px 미만 이동)
      this.handleClick(e)
    }
    this.isDragging = false
  }

  private handleClick(event: MouseEvent): void {
    const activeCamera = this.getActiveCamera()
    if (!activeCamera || !this.domElement) return

    const rect = this.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, activeCamera)
    const intersects = this.raycaster.intersectObjects(this.selectableObjects, true)
      .filter(hit => hit.object instanceof THREE.Mesh)

    const firstIntersect = intersects[0]
    if (firstIntersect) {
      const intersected = this.findSelectableParent(firstIntersect.object)
      if (intersected) {
        if (event.shiftKey) {
          if (this.isSelected(intersected)) {
            this.deselect(intersected)
          } else {
            this.select(intersected, true)
          }
        } else {
          this.select(intersected, false)
        }
      }
    } else if (!event.shiftKey) {
      this.clearSelection()
    }
  }

  // =====================
  // 영역 선택
  // =====================

  private selectByRect(x1: number, y1: number, x2: number, y2: number): void {
    const activeCamera = this.getActiveCamera()
    if (!activeCamera || !this.domElement) return

    const rect = this.domElement.getBoundingClientRect()
    // 화면 좌표 → NDC
    const ndcLeft = Math.min(x1, x2)
    const ndcRight = Math.max(x1, x2)
    const ndcTop = Math.min(y1, y2)
    const ndcBottom = Math.max(y1, y2)

    const toNdcX = (px: number) => ((px - rect.left) / rect.width) * 2 - 1
    const toNdcY = (py: number) => -(((py - rect.top) / rect.height) * 2 - 1)

    const minX = toNdcX(ndcLeft)
    const maxX = toNdcX(ndcRight)
    const minY = toNdcY(ndcBottom) // Y 반전
    const maxY = toNdcY(ndcTop)

    this.clearSelection()

    const selected: THREE.Object3D[] = []
    for (const obj of this.selectableObjects) {
      if (!obj.visible) continue

      // 객체 중심을 화면 좌표로 변환
      const mesh = obj as THREE.Mesh
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox()
      const center = new THREE.Vector3()
      mesh.geometry.boundingBox!.getCenter(center)
      center.applyMatrix4(mesh.matrixWorld)

      const projected = center.clone().project(activeCamera)

      if (projected.x >= minX && projected.x <= maxX &&
          projected.y >= minY && projected.y <= maxY &&
          projected.z >= -1 && projected.z <= 1) {
        selected.push(obj)
      }
    }

    for (const obj of selected) {
      if (!this.selectedObjects.includes(obj)) {
        this.selectedObjects.push(obj)
        this.applyHighlight(obj)
      }
    }
    if (selected.length > 0) {
      this.onSelectCallback?.(this.selectedObjects)
    } else {
      this.onDeselectCallback?.([])
    }
  }

  // =====================
  // 선택 박스 UI
  // =====================

  private updateSelectionBox(x1: number, y1: number, x2: number, y2: number): void {
    if (!this.selectionBox) {
      this.selectionBox = document.createElement('div')
      this.selectionBox.style.cssText = 'position:fixed;border:1px dashed #3b82f6;background:rgba(59,130,246,0.1);pointer-events:none;z-index:9999;'
      document.body.appendChild(this.selectionBox)
    }
    const left = Math.min(x1, x2)
    const top = Math.min(y1, y2)
    const width = Math.abs(x2 - x1)
    const height = Math.abs(y2 - y1)
    this.selectionBox.style.left = `${left}px`
    this.selectionBox.style.top = `${top}px`
    this.selectionBox.style.width = `${width}px`
    this.selectionBox.style.height = `${height}px`
  }

  private removeSelectionBox(): void {
    if (this.selectionBox) {
      this.selectionBox.remove()
      this.selectionBox = null
    }
  }

  // =====================
  // 유틸
  // =====================

  private findSelectableParent(object: THREE.Object3D): THREE.Object3D | null {
    let current: THREE.Object3D | null = object
    while (current) {
      if (this.selectableObjects.includes(current)) return current
      current = current.parent
    }
    if (object instanceof THREE.Mesh) return object
    return null
  }

  // =====================
  // 하이라이트
  // =====================

  private applyHighlight(object: THREE.Object3D): void {
    const meshes: THREE.Mesh[] = []
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) meshes.push(child)
    })

    const lines: LineSegments2[] = []
    const res = this.renderer
      ? new THREE.Vector2(this.renderer.domElement.clientWidth, this.renderer.domElement.clientHeight)
      : new THREE.Vector2(1920, 1080)

    for (const mesh of meshes) {
      for (const sub of mesh.children) {
        if (sub instanceof THREE.LineSegments) sub.visible = false
      }

      // 면 색상을 연한 붉은색으로 교체
      const mat = mesh.material as THREE.MeshStandardMaterial
      if (mat.color) {
        this.originalColors.set(mesh.uuid, mat.color.clone())
        mat.color.set(0x3366cc)
        mat.needsUpdate = true
      }

      const edges = new THREE.EdgesGeometry(mesh.geometry, 30)
      const posAttr = edges.getAttribute('position')
      const positions = posAttr.array as Float32Array

      const fatGeo = new LineSegmentsGeometry()
      fatGeo.setPositions(positions)

      const fatMat = new LineMaterial({
        color: 0xff4444,
        linewidth: 3,
        resolution: res,
        depthTest: false,
      })

      const fatLine = new LineSegments2(fatGeo, fatMat)
      fatLine.name = '__highlight_edge__'
      fatLine.raycast = () => {}
      mesh.add(fatLine)
      lines.push(fatLine)
    }

    this.highlightLines.set(object.uuid, lines)
  }

  private removeHighlight(object: THREE.Object3D): void {
    const lines = this.highlightLines.get(object.uuid)
    if (lines) {
      for (const line of lines) {
        line.geometry.dispose()
        ;(line.material as LineMaterial).dispose()
        line.parent?.remove(line)
      }
      this.highlightLines.delete(object.uuid)
    }

    const meshes: THREE.Mesh[] = []
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) meshes.push(child)
    })
    for (const mesh of meshes) {
      for (const sub of mesh.children) {
        if (sub instanceof THREE.LineSegments) sub.visible = true
      }

      // 면 색상 복원
      const orig = this.originalColors.get(mesh.uuid)
      if (orig) {
        const mat = mesh.material as THREE.MeshStandardMaterial
        mat.color.copy(orig)
        mat.needsUpdate = true
        this.originalColors.delete(mesh.uuid)
      }
    }
  }

  // =====================
  // 정리
  // =====================

  dispose(): void {
    if (this.domElement) {
      this.domElement.removeEventListener('mousedown', this.boundMouseDown)
    }
    window.removeEventListener('mousemove', this.boundMouseMove)
    window.removeEventListener('mouseup', this.boundMouseUp)
    window.removeEventListener('keydown', this.boundKeyDown)
    window.removeEventListener('keyup', this.boundKeyUp)

    this.removeSelectionBox()
    this.clearSelection()
    this.highlightLines.clear()
    this.originalColors.clear()

    this.camera = null
    this.scene = null
    this.domElement = null
    this.renderer = null
    this.selectableObjects = []
    this.selectedObjects = []
    this.onSelectCallback = null
    this.onDeselectCallback = null
  }
}
