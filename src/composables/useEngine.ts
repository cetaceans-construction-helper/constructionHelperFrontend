import { ref, shallowRef, onUnmounted, type Ref } from 'vue'
import { Engine, type EngineOptions } from '@/utils/three/Engine'
import type { Model3dm } from '@/types/model3dm'

export function useEngine(containerRef: Ref<HTMLElement | null>, options?: EngineOptions) {
  const engine = shallowRef<Engine | null>(null)
  const isLoading = ref(false)
  const loadProgress = ref(0)
  const loadError = ref<string | null>(null)

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
   * API 모델 데이터 로드 (백엔드 응답)
   */
  const loadApiModel = (models: Model3dm[]) => {
    if (!engine.value) {
      console.error('Engine not initialized')
      return
    }

    isLoading.value = true
    loadError.value = null
    loadProgress.value = 0

    try {
      engine.value.loadApiModel(models)

      isLoading.value = engine.value.isLoading
      loadProgress.value = engine.value.loadProgress
      loadError.value = engine.value.loadError
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      loadError.value = err.response?.data?.message || err.message || '알 수 없는 오류'
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
    init,
    loadApiModel,
    rotateLeft,
    rotateRight,
    getEngine,
    cleanup,
  }
}
