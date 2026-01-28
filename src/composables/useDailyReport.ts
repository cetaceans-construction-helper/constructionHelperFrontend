import { ref, watch } from 'vue'
import { workApi } from '@/api/work'
import { componentApi } from '@/api/model3dm'
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
  const dailyComponentIds = ref<number[]>([])
  const selectedWorkId = ref<number | null>(null)
  const workComponentIds = ref<number[]>([])
  const isLoadingDaily = ref(false)

  /**
   * 날짜 기반 데일리 데이터 로드 (workIds + componentIds)
   */
  async function loadDailyData() {
    isLoadingDaily.value = true
    try {
      const [workIds, compIds] = await Promise.all([
        workApi.getWorkListByDate(selectedDate.value),
        componentApi.getComponentListByDate(selectedDate.value),
      ])
      dailyWorkIds.value = workIds
      dailyComponentIds.value = compIds
    } catch (error) {
      console.error('작업 일보 데이터 로드 실패:', error)
      dailyWorkIds.value = []
      dailyComponentIds.value = []
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
      workComponentIds.value = []
      return
    }

    selectedWorkId.value = workId
    try {
      workComponentIds.value = await componentApi.getComponentListByWork(workId)
    } catch (error) {
      console.error('작업 부재 목록 조회 실패:', error)
      workComponentIds.value = []
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

    // 1) 가시성: showTodayOnly면 dailyComponentIds만 표시
    const visibleIds = showTodayOnly.value
      ? new Set(dailyComponentIds.value)
      : null

    engine.setObjectVisibility(visibleIds)

    // 2) 강조: selectedWorkId가 있으면 workComponentIds만 원래 색상, 나머지 회색
    const emphasizedIds = selectedWorkId.value != null
      ? new Set(workComponentIds.value)
      : null

    engine.setObjectEmphasis(emphasizedIds)
  }

  /**
   * 외부에서 호출 (work 변경 시 새로고침)
   */
  async function refreshDaily() {
    // 작업 선택 초기화
    selectedWorkId.value = null
    workComponentIds.value = []
    await loadDailyData()
  }

  // 날짜 변경 시 자동 로드
  watch(selectedDate, () => {
    selectedWorkId.value = null
    workComponentIds.value = []
    loadDailyData()
  })

  return {
    selectedDate,
    showTodayOnly,
    dailyWorkIds,
    dailyComponentIds,
    selectedWorkId,
    workComponentIds,
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
