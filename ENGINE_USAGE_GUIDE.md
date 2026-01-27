# Engine 사용 가이드

Three.js 씬 관리 및 모델 회전 기능을 제공하는 Engine 클래스 사용법입니다.

## 📁 생성된 파일

```
src/
├── utils/three/
│   └── Engine.ts              # 메인 Engine 클래스
└── composables/
    └── useEngine.ts           # Vue용 Composable
```

## 🚀 주요 기능

### Engine 클래스

- ✅ Three.js 씬, 카메라, 렌더러 자동 설정
- ✅ OrbitControls 통합
- ✅ 조명 시스템 (Ambient + Directional)
- ✅ Rhino 3D 모델 로딩
- ✅ **모델 자동 회전** (X, Y, Z 축 개별 제어)
- ✅ 회전 속도 조절
- ✅ 회전 일시정지/재생
- ✅ 회전 초기화
- ✅ 반응형 리사이즈
- ✅ 메모리 자동 정리

### 회전 기능

- **자동 회전**: X, Y, Z 축을 독립적으로 회전
- **속도 조절**: 실시간 회전 속도 변경
- **일시정지/재생**: 회전 토글
- **초기화**: 모델을 원래 회전 상태로 복원

## 📖 사용 방법

### 기본 사용 (Vue Composable)

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useEngine } from '@/composables/useEngine'

const canvasContainer = ref<HTMLDivElement | null>(null)
const { init, loadModel, startAutoRotate } = useEngine(canvasContainer)

onMounted(async () => {
  init()
  await loadModel('/test.3dm')

  // 자동 회전 시작 (Y축으로 회전)
  startAutoRotate()
})
</script>

<template>
  <div ref="canvasContainer" class="w-full h-full" />
</template>
```

### 고급 사용 (회전 제어)

```typescript
import { ref } from 'vue'
import * as THREE from 'three'
import { useEngine } from '@/composables/useEngine'

const canvasContainer = ref<HTMLDivElement | null>(null)
const {
  init,
  loadModel,
  startAutoRotate,
  stopAutoRotate,
  toggleAutoRotate,
  setRotationSpeed,
  resetRotation,
  isAutoRotating
} = useEngine(canvasContainer)

// 엔진 초기화
init()

// 모델 로드
await loadModel('/test.3dm')

// 1. Y축으로 자동 회전 시작
startAutoRotate()

// 2. 커스텀 속도로 회전 (X, Y, Z 축)
const speed = new THREE.Vector3(0.01, 0.02, 0.005)
startAutoRotate(speed)

// 3. 회전 속도만 변경
setRotationSpeed(new THREE.Vector3(0, 0.03, 0))

// 4. 회전 일시정지
stopAutoRotate()

// 5. 회전 토글 (재생/일시정지)
toggleAutoRotate()

// 6. 회전 초기화 (원래 위치로)
resetRotation()

// 7. 회전 상태 확인
console.log(isAutoRotating.value) // true or false
```

### Engine 클래스 직접 사용

Composable을 사용하지 않고 직접 Engine 클래스를 사용할 수도 있습니다:

```typescript
import { Engine } from '@/utils/three/Engine'
import * as THREE from 'three'

// 1. Engine 인스턴스 생성
const container = document.getElementById('canvas-container')!
const engine = new Engine(container, {
  enableShadows: true,
  backgroundColor: 0xf0f0f0,
  ambientLightIntensity: 0.6,
  directionalLightIntensity: 0.8
})

// 2. 모델 로드
await engine.loadRhinoModel('/test.3dm', (progress) => {
  console.log(`로딩: ${progress}%`)
})

// 3. 회전 시작
engine.startAutoRotate(new THREE.Vector3(0, 0.01, 0))

// 4. 회전 중지
engine.stopAutoRotate()

// 5. 회전 속도 변경
engine.setRotationSpeed(new THREE.Vector3(0.02, 0.01, 0))

// 6. 회전 초기화
engine.resetRotation()

// 7. 정리 (메모리 해제)
engine.dispose()
```

## 🎮 Engine API 레퍼런스

### 모델 로딩

```typescript
// Rhino 모델 로드
await engine.loadRhinoModel(url: string, onProgress?: (progress: number) => void): Promise<THREE.Object3D>
```

### 회전 제어

```typescript
// 자동 회전 시작
engine.startAutoRotate(speed?: THREE.Vector3): void

// 자동 회전 중지
engine.stopAutoRotate(): void

// 회전 토글 (on/off)
engine.toggleAutoRotate(): boolean

// 회전 속도 설정
engine.setRotationSpeed(speed: THREE.Vector3): void

// 회전 옵션 설정
engine.setRotation(options: ModelRotationOptions): void

// 회전 초기화
engine.resetRotation(): void
```

### 씬 관리

```typescript
// 씬에 객체 추가
engine.addToScene(object: THREE.Object3D): void

// 씬에서 객체 제거
engine.removeFromScene(object: THREE.Object3D): void

// 현재 카메라 가져오기
const camera = engine.getCamera(): THREE.PerspectiveCamera

// 현재 씬 가져오기
const scene = engine.getScene(): THREE.Scene

// 렌더러 가져오기
const renderer = engine.getRenderer(): THREE.WebGLRenderer

// 컨트롤 가져오기
const controls = engine.getControls(): OrbitControls

// 로드된 모델 가져오기
const model = engine.getModel(): THREE.Object3D | null

// 정리 (메모리 해제)
engine.dispose(): void
```

## 🎨 회전 옵션

### ModelRotationOptions

```typescript
interface ModelRotationOptions {
  speed?: THREE.Vector3    // x, y, z 축 회전 속도 (라디안/프레임)
  autoRotate?: boolean     // 자동 회전 활성화 여부
}
```

### 회전 속도 예제

```typescript
// 느린 회전
const slowSpeed = new THREE.Vector3(0, 0.005, 0)

// 보통 속도
const normalSpeed = new THREE.Vector3(0, 0.01, 0)

// 빠른 회전
const fastSpeed = new THREE.Vector3(0, 0.03, 0)

// 다중 축 회전
const multiAxisSpeed = new THREE.Vector3(0.01, 0.02, 0.005)

// 역방향 회전
const reverseSpeed = new THREE.Vector3(0, -0.01, 0)
```

## 🎯 실전 예제: 회전 컨트롤 UI

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import * as THREE from 'three'
import { useEngine } from '@/composables/useEngine'
import { Button } from '@/components/ui/button'

const canvasContainer = ref<HTMLDivElement | null>(null)
const {
  isLoading,
  isAutoRotating,
  init,
  loadModel,
  toggleAutoRotate,
  setRotationSpeed,
  resetRotation
} = useEngine(canvasContainer)

const rotationSpeed = ref({ x: 0, y: 0.01, z: 0 })

onMounted(async () => {
  init()
  await loadModel('/test.3dm')
})

const updateSpeed = (axis: 'x' | 'y' | 'z', value: number) => {
  rotationSpeed.value[axis] = value
  setRotationSpeed(
    new THREE.Vector3(
      rotationSpeed.value.x,
      rotationSpeed.value.y,
      rotationSpeed.value.z
    )
  )
}
</script>

<template>
  <div class="relative w-full h-full">
    <!-- 3D 캔버스 -->
    <div ref="canvasContainer" class="w-full h-full" />

    <!-- 컨트롤 패널 -->
    <div v-if="!isLoading" class="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg">
      <!-- 회전 토글 -->
      <Button
        :variant="isAutoRotating ? 'default' : 'outline'"
        @click="toggleAutoRotate"
      >
        {{ isAutoRotating ? '회전 중지' : '자동 회전' }}
      </Button>

      <!-- 회전 초기화 -->
      <Button variant="outline" @click="resetRotation">
        회전 초기화
      </Button>

      <!-- 속도 조절 슬라이더 (회전 중일 때만 표시) -->
      <div v-if="isAutoRotating" class="mt-4 space-y-2">
        <div>
          <label>X축: {{ rotationSpeed.x.toFixed(3) }}</label>
          <input
            type="range"
            min="-0.05"
            max="0.05"
            step="0.001"
            :value="rotationSpeed.x"
            @input="(e) => updateSpeed('x', parseFloat(e.target.value))"
          />
        </div>
        <div>
          <label>Y축: {{ rotationSpeed.y.toFixed(3) }}</label>
          <input
            type="range"
            min="-0.05"
            max="0.05"
            step="0.001"
            :value="rotationSpeed.y"
            @input="(e) => updateSpeed('y', parseFloat(e.target.value))"
          />
        </div>
        <div>
          <label>Z축: {{ rotationSpeed.z.toFixed(3) }}</label>
          <input
            type="range"
            min="-0.05"
            max="0.05"
            step="0.001"
            :value="rotationSpeed.z"
            @input="(e) => updateSpeed('z', parseFloat(e.target.value))"
          />
        </div>
      </div>
    </div>
  </div>
</template>
```

## 🔧 Engine 옵션

### EngineOptions

```typescript
interface EngineOptions {
  enableShadows?: boolean              // 그림자 활성화 (기본: true)
  backgroundColor?: number             // 배경색 (기본: 0xf0f0f0)
  ambientLightIntensity?: number       // 주변광 강도 (기본: 0.6)
  directionalLightIntensity?: number   // 방향광 강도 (기본: 0.8)
}
```

### 사용 예제

```typescript
const engine = new Engine(container, {
  enableShadows: true,
  backgroundColor: 0x1a1a1a,           // 어두운 배경
  ambientLightIntensity: 0.4,          // 약한 주변광
  directionalLightIntensity: 1.0       // 강한 방향광
})
```

## 💡 팁과 베스트 프랙티스

### 1. 성능 최적화

```typescript
// 부드러운 회전을 위한 적절한 속도
const optimalSpeed = new THREE.Vector3(0, 0.01, 0) // 60fps 기준

// 너무 빠른 회전은 피하기
const tooFast = new THREE.Vector3(0, 0.1, 0) // ❌ 너무 빠름
```

### 2. 메모리 관리

```typescript
// Vue 컴포넌트에서 자동 정리 (useEngine 사용 시)
// onUnmounted에서 자동으로 cleanup 호출됨

// 직접 Engine 클래스를 사용할 경우
onUnmounted(() => {
  engine.dispose() // 반드시 호출!
})
```

### 3. 로딩 상태 처리

```typescript
const { isLoading, loadProgress, loadError } = useEngine(canvasContainer)

// 로딩 중 UI 표시
if (isLoading.value) {
  console.log(`로딩 중: ${loadProgress.value.toFixed(1)}%`)
}

// 에러 처리
if (loadError.value) {
  console.error('모델 로드 실패:', loadError.value)
}
```

### 4. 회전과 OrbitControls 조화

```typescript
// 사용자가 OrbitControls로 모델을 조작 중일 때도
// 자동 회전이 동시에 작동합니다.
// 필요하다면 사용자 조작 시 자동 회전을 중지할 수 있습니다:

const controls = engine.getControls()
controls.addEventListener('start', () => {
  engine.stopAutoRotate() // 사용자 조작 시작 시 회전 중지
})

controls.addEventListener('end', () => {
  engine.startAutoRotate() // 사용자 조작 종료 시 회전 재개
})
```

## 🎬 애니메이션 루프

Engine은 내부적으로 `requestAnimationFrame`을 사용하여 자동으로 애니메이션 루프를 관리합니다:

```typescript
// Engine 내부 (참고용)
private startAnimation(): void {
  const animate = () => {
    this.animationId = requestAnimationFrame(animate)

    // 1. 모델 회전 업데이트
    this.updateRotation()

    // 2. OrbitControls 업데이트
    this.controls.update()

    // 3. 렌더링
    this.renderer.render(this.scene, this.camera)
  }
  animate()
}
```

## 🐛 문제 해결

### 모델이 회전하지 않아요

```typescript
// 1. 자동 회전이 활성화되었는지 확인
console.log(isAutoRotating.value) // true 여야 함

// 2. 회전 속도가 0이 아닌지 확인
const speed = new THREE.Vector3(0, 0.01, 0) // 최소한 하나의 축은 0이 아니어야 함
setRotationSpeed(speed)

// 3. 모델이 로드되었는지 확인
const model = engine.getModel()
console.log(model) // null이 아니어야 함
```

### 회전이 너무 빨라요/느려요

```typescript
// 속도 조절
setRotationSpeed(new THREE.Vector3(0, 0.005, 0)) // 느리게
setRotationSpeed(new THREE.Vector3(0, 0.02, 0))  // 빠르게
```

### 메모리 누수가 발생해요

```typescript
// Vue 컴포넌트에서 useEngine을 사용하면 자동으로 정리됩니다
// 직접 Engine을 사용할 경우 반드시 dispose() 호출:

onUnmounted(() => {
  engine.dispose()
})
```

## 📚 추가 자료

- [Three.js 공식 문서](https://threejs.org/docs/)
- [OrbitControls 문서](https://threejs.org/docs/#examples/en/controls/OrbitControls)
- [Rhino3dm 문서](https://github.com/mcneel/rhino3dm)
