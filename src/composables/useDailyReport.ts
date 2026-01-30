import { ref, watch } from 'vue'
import { workApi } from '@/api/work'
import { object3dApi } from '@/api/object3d'
import type { Engine } from '@/utils/three/Engine'

function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function useDailyReport() {
  const selectedDate = ref(formatDate(new Date()))
  const showTodayOnly = ref(false)
  const dailyWorkIds = ref<number[]>([])
  const dailyObject3dIds = ref<number[]>([])
  const selectedWorkId = ref<number | null>(null)
  const workObject3dIds = ref<number[]>([])
  const isLoadingDaily = ref(false)

  /**
   * 날짜 기반 데일리 데이터 로드 (workIds + object3dIds)
   */
  async function loadDailyData() {
    isLoadingDaily.value = true
    try {
      const [workIds, obj3dIds] = await Promise.all([
        workApi.getWorkListByDate(selectedDate.value),
        object3dApi.getObject3dListByDate(selectedDate.value),
      ])
      dailyWorkIds.value = workIds
      dailyObject3dIds.value = obj3dIds
    } catch (error) {
      console.error('작업 일보 데이터 로드 실패:', error)
      dailyWorkIds.value = []
      dailyObject3dIds.value = []
    } finally {
      isLoadingDaily.value = false
    }
  }

  /**
   * 작업 카드 클릭 (토글)
   */
  async function selectWork(workId: number) {
    if (selectedWorkId.value === workId) {
      // 선택 해제
      selectedWorkId.value = null
      workObject3dIds.value = []
      return
    }

    selectedWorkId.value = workId
    try {
      workObject3dIds.value = await object3dApi.getObject3dListByWork(workId)
    } catch (error) {
      console.error('작업 부재 목록 조회 실패:', error)
      workObject3dIds.value = []
    }
  }

  /**
   * 날짜 변경 (days만큼 이동)
   */
  function changeDate(days: number) {
    const date = new Date(selectedDate.value)
    date.setDate(date.getDate() + days)
    selectedDate.value = formatDate(date)
  }

  /**
   * 날짜 직접 설정
   */
  function setDate(date: string) {
    selectedDate.value = date
  }

  /**
   * 체크박스 토글
   */
  function toggleShowTodayOnly(checked: boolean) {
    showTodayOnly.value = checked
  }

  /**
   * Engine에 가시성 + 강조 적용
   */
  function updateModelAppearance(engine: Engine | null) {
    if (!engine) return

    // 1) 가시성: showTodayOnly면 dailyObject3dIds만 표시
    const visibleIds = showTodayOnly.value
      ? new Set(dailyObject3dIds.value)
      : null

    engine.setObjectVisibility(visibleIds)

    // 2) 강조: selectedWorkId가 있으면 workObject3dIds만 원래 색상, 나머지 회색
    const emphasizedIds = selectedWorkId.value != null
      ? new Set(workObject3dIds.value)
      : null

    engine.setObjectEmphasis(emphasizedIds)
  }

  /**
   * 외부에서 호출 (work 변경 시 새로고침)
   */
  async function refreshDaily() {
    // 작업 선택 초기화
    selectedWorkId.value = null
    workObject3dIds.value = []
    await loadDailyData()
  }

  // 날짜 변경 시 자동 로드
  watch(selectedDate, () => {
    selectedWorkId.value = null
    workObject3dIds.value = []
    loadDailyData()
  })

  return {
    selectedDate,
    showTodayOnly,
    dailyWorkIds,
    dailyObject3dIds,
    selectedWorkId,
    workObject3dIds,
    isLoadingDaily,
    loadDailyData,
    selectWork,
    changeDate,
    setDate,
    toggleShowTodayOnly,
    updateModelAppearance,
    refreshDaily,
  }
}
