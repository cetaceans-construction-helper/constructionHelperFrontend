import { ref } from 'vue'
import {
  attendanceApi,
  type AttendanceCumulativeWorkType,
} from '@/features/attendance/infra/attendance-api'
import { projectApi } from '@/shared/network-core/apis/project'

export function useAttendanceCumulative() {
  const startDate = ref('')
  const endDate = ref('')
  const cumulativeList = ref<AttendanceCumulativeWorkType[]>([])
  const isLoading = ref(false)
  const grandTotal = ref(0)

  async function initDates() {
    try {
      const projects = await projectApi.getProjects()
      const project = projects[0]
      if (project) {
        startDate.value = project.startDate
        endDate.value = project.completionDate
        return
      }
    } catch {
      // 프로젝트 조회 실패 시 오늘 날짜 기본값 사용
    }
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    startDate.value = `${y}-${m}-01`
    endDate.value = `${y}-${m}-${d}`
  }

  async function fetchCumulative() {
    if (!startDate.value || !endDate.value) return
    isLoading.value = true
    try {
      const data = await attendanceApi.getAttendanceCumulativeList(
        startDate.value,
        endDate.value,
      )
      cumulativeList.value = data.workTypes
      grandTotal.value = data.grandTotalCount
    } catch (error: any) {
      console.error('누적 집계 조회 실패:', error)
      const errorMessage = error.response?.data?.message || error.message
      alert(errorMessage)
    } finally {
      isLoading.value = false
    }
  }

  return {
    startDate,
    endDate,
    cumulativeList,
    isLoading,
    grandTotal,
    initDates,
    fetchCumulative,
  }
}
