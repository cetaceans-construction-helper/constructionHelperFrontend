import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * 3D 카메라 컨트롤러
 * - 우클릭 드래그: 회전
 * - Space+드래그: 패닝
 * - 휠: 줌
 */
export class RotationController {
  private target: THREE.Object3D | null = null
  private controls: OrbitControls | null = null
  private domElement: HTMLElement | null = null
  private isSpaceDown = false
  private isPortrait = false
  private portraitMql: MediaQueryList
  private boundKeyDown: (e: KeyboardEvent) => void
  private boundKeyUp: (e: KeyboardEvent) => void
  private boundContextMenu: (e: Event) => void
  private boundPortraitChange: (e: MediaQueryListEvent | MediaQueryList) => void

  constructor() {
    this.boundKeyDown = this.onKeyDown.bind(this)
    this.boundKeyUp = this.onKeyUp.bind(this)
    this.boundContextMenu = (e: Event) => e.preventDefault()
    this.portraitMql = window.matchMedia('(max-aspect-ratio: 1/1)')
    this.boundPortraitChange = (e) => {
      this.isPortrait = e.matches
      this.updateMode()
    }
  }

  initControls(camera: THREE.Camera, domElement: HTMLElement): void {
    this.domElement = domElement
    this.controls = new OrbitControls(camera, domElement)
    this.controls.enableDamping = false
    this.controls.enableZoom = true
    this.controls.enableRotate = true
    this.controls.enablePan = false
    this.controls.mouseButtons = {
      LEFT: null as unknown as THREE.MOUSE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    }
    // 터치: 한 손가락 패닝, 두 손가락 줌
    this.controls.touches = {
      ONE: THREE.TOUCH.PAN,
      TWO: THREE.TOUCH.DOLLY_PAN,
    }

    // 세로모드 감지
    this.isPortrait = this.portraitMql.matches
    this.portraitMql.addEventListener('change', this.boundPortraitChange as (e: MediaQueryListEvent) => void)
    this.updateMode()

    domElement.addEventListener('contextmenu', this.boundContextMenu)
    window.addEventListener('keydown', this.boundKeyDown)
    window.addEventListener('keyup', this.boundKeyUp)
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space' && !this.isSpaceDown) {
      e.preventDefault()
      this.isSpaceDown = true
      this.updateMode()
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      this.isSpaceDown = false
      this.updateMode()
    }
  }

  private updateMode(): void {
    if (!this.controls) return
    if (this.isPortrait) {
      // 세로모드: 좌드래그=패닝, 스크롤 캡처 안함 (버튼 줌만)
      this.controls.enableRotate = false
      this.controls.enablePan = true
      this.controls.enableZoom = false
      this.controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: null as unknown as THREE.MOUSE, RIGHT: null as unknown as THREE.MOUSE }
      if (this.domElement) this.domElement.style.cursor = 'default'
    } else if (this.isSpaceDown) {
      this.controls.enableRotate = false
      this.controls.enablePan = true
      this.controls.enableZoom = true
      this.controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
      if (this.domElement) this.domElement.style.cursor = 'move'
    } else {
      this.controls.enableRotate = true
      this.controls.enablePan = false
      this.controls.enableZoom = true
      this.controls.mouseButtons = { LEFT: null as unknown as THREE.MOUSE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
      if (this.domElement) this.domElement.style.cursor = 'default'
    }
  }

  getControls(): OrbitControls | null {
    return this.controls
  }

  setTarget(object: THREE.Object3D | null): void {
    this.target = object
  }

  getTarget(): THREE.Object3D | null {
    return this.target
  }

  update(): void {
    this.controls?.update()
  }

  dispose(): void {
    if (this.domElement) this.domElement.removeEventListener('contextmenu', this.boundContextMenu)
    this.portraitMql.removeEventListener('change', this.boundPortraitChange as (e: MediaQueryListEvent) => void)
    window.removeEventListener('keydown', this.boundKeyDown)
    window.removeEventListener('keyup', this.boundKeyUp)
    this.controls?.dispose()
    this.controls = null
    this.target = null
    this.domElement = null
  }
}
