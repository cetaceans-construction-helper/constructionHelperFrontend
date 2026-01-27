import { ref, onUnmounted, type Ref } from 'vue'
import { Engine, type EngineOptions } from '@/utils/three/Engine'
// import type { ClippingAxis } from '@/utils/three/control/ClippingController'

export function useEngine(containerRef: Ref<HTMLElement | null>, options?: EngineOptions) {
  const engine = ref<Engine | null>(null)
  const isLoading = ref(false)
  const loadProgress = ref(0)
  const loadError = ref<string | null>(null)

  // 클리핑 상태 (비활성화)
  // const clippingEnabled = ref(false)
  // const clippingAxis = ref<ClippingAxis | null>(null)
  // const clippingPosition = ref(0)

  /**
   * 엔진 초기화
   */
  const init = () => {
    if (!containerRef.value) {
      console.error('Container element not found')
      return
    }

    engine.value = new Engine(containerRef.value, options)
  }

  /**
   * JSON 모델 로드 (DB에서 추출한 데이터)
   */
  const loadJsonModel = async (url: string) => {
    if (!engine.value) {
      console.error('Engine not initialized')
      return
    }

    isLoading.value = true
    loadError.value = null
    loadProgress.value = 0

    try {
      await engine.value.loadJsonModel(url)

      // 엔진의 로딩 상태 동기화
      isLoading.value = engine.value.isLoading
      loadProgress.value = engine.value.loadProgress
      loadError.value = engine.value.loadError
    } catch (error) {
      loadError.value = error instanceof Error ? error.message : '알 수 없는 오류'
      isLoading.value = false
    }
  }

  /**
   * 왼쪽으로 30도 회전 (y축 기준)
   */
  const rotateLeft = () => {
    if (!engine.value) return
    engine.value.rotateZ(30)
  }

  /**
   * 오른쪽으로 30도 회전 (y축 기준)
   */
  const rotateRight = () => {
    if (!engine.value) return
    engine.value.rotateZ(-30)
  }

  // /**
  //  * 클리핑 평면 생성
  //  */
  // const createClippingPlane = (axis: ClippingAxis) => {
  //   if (!engine.value) return
  //   engine.value.createClippingPlane(axis)

  //   // 상태 동기화
  //   const state = engine.value.getClippingState()
  //   clippingEnabled.value = state.isEnabled
  //   clippingAxis.value = state.axis
  //   clippingPosition.value = state.position

  //   // 변경 콜백 등록
  //   engine.value.onClippingChange((position, newAxis) => {
  //     clippingPosition.value = position
  //     clippingAxis.value = newAxis
  //   })
  // }

  // /**
  //  * 클리핑 평면 제거
  //  */
  // const removeClippingPlane = () => {
  //   if (!engine.value) return
  //   engine.value.removeClippingPlane()

  //   clippingEnabled.value = false
  //   clippingAxis.value = null
  //   clippingPosition.value = 0
  // }

  // /**
  //  * 클리핑 토글 (같은 축이면 제거, 다른 축이면 변경)
  //  */
  // const toggleClipping = (axis: ClippingAxis) => {
  //   if (clippingAxis.value === axis) {
  //     removeClippingPlane()
  //   } else {
  //     createClippingPlane(axis)
  //   }
  // }

  /**
   * 엔진 인스턴스 가져오기
   */
  const getEngine = () => engine.value

  /**
   * 정리 (컴포넌트 언마운트 시 자동 호출)
   */
  const cleanup = () => {
    if (engine.value) {
      engine.value.dispose()
      engine.value = null
    }
  }

  // 컴포넌트 언마운트 시 자동 정리
  onUnmounted(() => {
    cleanup()
  })

  return {
    engine,
    isLoading,
    loadProgress,
    loadError,
    // 클리핑 상태 (비활성화)
    // clippingEnabled,
    // clippingAxis,
    // clippingPosition,
    // 메서드
    init,
    loadJsonModel,
    rotateLeft,
    rotateRight,
    // createClippingPlane,
    // removeClippingPlane,
    // toggleClipping,
    getEngine,
    cleanup
  }
}
