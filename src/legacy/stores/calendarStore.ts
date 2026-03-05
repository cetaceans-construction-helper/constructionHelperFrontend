import { ref } from 'vue'
import { defineStore } from 'pinia'
import { calendarApi } from '@/api/calendar'
import type { CalendarResponse } from '@/types/calendar'

export const useCalendarStore = defineStore('calendar', () => {
  const calendarData = ref<CalendarResponse | null>(null)
  const lastFetchedProjectId = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 캐시된 데이터 반환 또는 새로 fetch
  const getCalendar = async (
    projectId: string,
    forceRefresh = false
  ): Promise<CalendarResponse | null> => {
    // 캐시 히트: 같은 프로젝트이고 강제 리프레시가 아닌 경우
    if (
      !forceRefresh &&
      calendarData.value &&
      lastFetchedProjectId.value === projectId
    ) {
      return calendarData.value
    }

    isLoading.value = true
    error.value = null

    try {
      const data = await calendarApi.getProjectCalendar(projectId)
      calendarData.value = data
      lastFetchedProjectId.value = projectId
      return data
    } catch (err: unknown) {
      console.error('캘린더 데이터 로드 실패:', err)
      const e = err as { response?: { data?: { message?: string } }; message?: string }
      error.value = e.response?.data?.message || e.message || '알 수 없는 오류'
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 강제 리프레시
  const refreshCalendar = async (): Promise<CalendarResponse | null> => {
    if (!lastFetchedProjectId.value) return null
    return getCalendar(lastFetchedProjectId.value, true)
  }

  // 캐시 초기화
  const clearCache = () => {
    calendarData.value = null
    lastFetchedProjectId.value = null
    error.value = null
  }

  return {
    // State
    calendarData,
    isLoading,
    error,

    // Actions
    getCalendar,
    refreshCalendar,
    clearCache
  }
})
