import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type {
  AttendanceByDateItem,
  EquipmentDeploymentByDateItem,
} from '@/features/attendance/public'
import type { DeliveryQuantityByDate } from '@/features/material/public'
import { useProjectStore } from '@/app/context/stores/project'
import type { WeatherByDateResponse } from '@/shared/network-core/contracts/calendar'
import type {
  ActualWorkGroup,
  AttendanceGroup,
  EquipmentGroup,
} from '@/features/dashboard/model/dashboard-types'
import type {
  ActualWorkResponse,
  CreateActualWorkPayload,
  UpdateActualWorkPayload,
} from '@/shared/network-core/apis/actualWork'
import { workApi } from '@/shared/network-core/apis/work'
import { formatLocalDate } from '@/features/dashboard/use-cases/dashboard-date'
import { loadDashboardData } from '@/features/dashboard/use-cases/load-dashboard-data'
import { dashboardRepository } from '@/features/dashboard/infra/dashboard-repository'
import { analyticsClient } from '@/shared/analytics/analyticsClient'
import {
  validateDailyReport,
  createDailyReport,
} from '@/features/document/public'
import { createHomepageDailyReport } from '@/features/dashboard/use-cases/create-homepage-daily-report'
import type { ValidateDailyReportResponse } from '@/features/document/public'
import { dailyReportRepository } from '@/features/document/public'

export const useDashboardPage = () => {
  const projectStore = useProjectStore()
  const router = useRouter()
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']

  function nextDayString(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00')
    d.setDate(d.getDate() + 1)
    return formatLocalDate(d)
  }

  const selectedDateString = ref(formatLocalDate(new Date()))
  const today = computed(() => new Date(selectedDateString.value + 'T00:00:00'))
  const todayString = computed(() => selectedDateString.value)
  const todayDayName = computed(() => dayNames[today.value.getDay()] ?? '알수없음')

  // 내일 (다음 작업일) — 기본값 today+1, DateStepper 로 변경 가능
  const tomorrowDateString = ref(nextDayString(selectedDateString.value))
  // DateStepper 최소값 — 내일(today+1) 밑으로는 감소 불가
  const tomorrowMinDateString = computed(() => nextDayString(selectedDateString.value))
  const tomorrowDateLabel = computed(() => {
    if (!tomorrowDateString.value) return ''
    const d = new Date(tomorrowDateString.value + 'T00:00:00')
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${dayNames[d.getDay()]}요일)`
  })

  // 데이터 상태
  const todayActualWorks = ref<ActualWorkResponse[]>([])
  const tomorrowActualWorks = ref<ActualWorkResponse[]>([])
  const todayAttendance = ref<AttendanceByDateItem[]>([])
  const todayDeliveryQuantities = ref<DeliveryQuantityByDate[]>([])
  const todayEquipment = ref<EquipmentDeploymentByDateItem[]>([])
  const isLoading = ref(false)

  // workTypeId 기준 그룹핑 헬퍼
  const groupByWorkType = (aws: ActualWorkResponse[]): Map<number, ActualWorkGroup> => {
    const grouped = new Map<number, ActualWorkGroup>()
    for (const aw of aws) {
      const key = aw.workTypeId
      if (!grouped.has(key)) {
        grouped.set(key, { workTypeName: aw.workTypeName || '미분류', items: [] })
      }
      grouped.get(key)!.items.push(aw)
    }
    return grouped
  }

  const todayWorksByType = computed(() => groupByWorkType(todayActualWorks.value))
  const tomorrowWorksByType = computed(() => groupByWorkType(tomorrowActualWorks.value))

  // ActualWork CRUD wrappers
  const createActualWork = async (payload: CreateActualWorkPayload): Promise<boolean> => {
    try {
      await dashboardRepository.createActualWork(payload)
      await refreshData()
      analyticsClient.trackAction('dashboard', 'create_actual_work', 'success')
      return true
    } catch (error: unknown) {
      console.error('실제 작업 생성 실패:', error)
      analyticsClient.trackAction('dashboard', 'create_actual_work', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      return false
    }
  }

  const updateActualWork = async (id: number, payload: UpdateActualWorkPayload): Promise<boolean> => {
    try {
      await dashboardRepository.updateActualWork(id, payload)
      await refreshData()
      analyticsClient.trackAction('dashboard', 'update_actual_work', 'success')
      return true
    } catch (error: unknown) {
      console.error('실제 작업 수정 실패:', error)
      analyticsClient.trackAction('dashboard', 'update_actual_work', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      return false
    }
  }

  const deleteActualWork = async (id: number): Promise<void> => {
    try {
      await dashboardRepository.deleteActualWork(id)
      await refreshData()
      analyticsClient.trackAction('dashboard', 'delete_actual_work', 'success')
    } catch (error: unknown) {
      console.error('실제 작업 삭제 실패:', error)
      analyticsClient.trackAction('dashboard', 'delete_actual_work', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    }
  }

  // ========== 작업 사진 (ActualWork 기반) ==========
  const photoObjectUrls = ref<Map<number, string>>(new Map())

  const revokeAllObjectUrls = () => {
    for (const url of photoObjectUrls.value.values()) {
      URL.revokeObjectURL(url)
    }
    photoObjectUrls.value = new Map()
  }

  const loadAllPhotos = async () => {
    revokeAllObjectUrls()
    const newUrls = new Map<number, string>()
    for (const aw of todayActualWorks.value) {
      for (const photo of aw.photos ?? []) {
        try {
          newUrls.set(photo.photoId, await workApi.downloadWorkPhoto(photo.url))
        } catch {
          // 개별 사진 실패 무시
        }
      }
    }
    photoObjectUrls.value = newUrls
  }

  const uploadPhotos = async (actualWorkId: number, files: File[]): Promise<boolean> => {
    if (files.length === 0) return false
    try {
      await workApi.createWorkPhoto(actualWorkId, selectedDateString.value, files)
      await refreshData()
      await loadAllPhotos()
      analyticsClient.trackAction('dashboard', 'upload_work_photo', 'success')
      return true
    } catch (error: unknown) {
      console.error('사진 업로드 실패:', error)
      analyticsClient.trackAction('dashboard', 'upload_work_photo', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      return false
    }
  }

  const onPhotoUpdated = async () => {
    await refreshData()
    await loadAllPhotos()
  }

  onUnmounted(() => {
    revokeAllObjectUrls()
  })

  const deliveryByWorkType = computed(() => {
    const grouped = new Map<string, DeliveryQuantityByDate[]>()
    for (const item of todayDeliveryQuantities.value) {
      const workType = item.workTypeName || '미분류'
      if (!grouped.has(workType)) grouped.set(workType, [])
      grouped.get(workType)?.push(item)
    }
    return grouped
  })

  const attendanceByGroup = computed(() => {
    const groups: AttendanceGroup[] = []
    const groupMap = new Map<string, AttendanceGroup>()

    for (const item of todayAttendance.value) {
      const key = `${item.workTypeId}-${item.companyId}`
      if (!groupMap.has(key)) {
        const group: AttendanceGroup = {
          workTypeName: item.workTypeName,
          companyDisplayName: item.companyDisplayName,
          totalCount: 0,
          items: [],
        }
        groupMap.set(key, group)
        groups.push(group)
      }
      const group = groupMap.get(key)
      if (!group) continue
      group.items.push(item)
      group.totalCount += item.count
    }

    return groups
  })

  const todayWeather = ref<WeatherByDateResponse | null>(null)

  const equipmentByGroup = computed(() => {
    const groups: EquipmentGroup[] = []
    const groupMap = new Map<string, EquipmentGroup>()

    for (const item of todayEquipment.value) {
      const key = item.companyId
      if (!groupMap.has(key)) {
        const group: EquipmentGroup = {
          companyDisplayName: item.companyDisplayName,
          totalCount: 0,
          items: [],
        }
        groupMap.set(key, group)
        groups.push(group)
      }
      const group = groupMap.get(key)
      if (!group) continue
      group.items.push(item)
      group.totalCount += item.count
    }

    return groups
  })

  // 홈페이지 작업일보 생성
  const isCreatingHomepageDailyReport = ref(false)

  const generateHomepageDailyReport = async () => {
    isCreatingHomepageDailyReport.value = true
    try {
      await createHomepageDailyReport({
        todayDayName: todayDayName.value,
        todayWeather: todayWeather.value,
        todayWorksByType: todayWorksByType.value,
        tomorrowWorksByType: tomorrowWorksByType.value,
        deliveryByWorkType: deliveryByWorkType.value,
        equipmentByGroup: equipmentByGroup.value,
        attendanceByGroup: attendanceByGroup.value,
      })
      analyticsClient.trackAction('dashboard', 'create_homepage_daily_report', 'success')
      alert('홈페이지에 작업일보가 생성/수정되었습니다.')
    } catch (error: unknown) {
      console.error('홈페이지 작업일보 생성 실패:', error)
      analyticsClient.trackAction('dashboard', 'create_homepage_daily_report', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreatingHomepageDailyReport.value = false
    }
  }

  // 작업일보 생성
  const isCreatingDailyReport = ref(false)
  const showExcludeDialog = ref(false)
  const validateResult = ref<ValidateDailyReportResponse | null>(null)

  const generateDailyReport = async () => {
    isCreatingDailyReport.value = true
    try {
      const result = await validateDailyReport(dailyReportRepository, todayString.value)
      const hasExceeded = result.sections.some((s) => s.exceeded) || (result.photos?.exceeded ?? false)

      if (hasExceeded) {
        validateResult.value = result
        showExcludeDialog.value = true
      } else {
        await createDailyReport(dailyReportRepository, { date: todayString.value })
        analyticsClient.trackAction('dashboard', 'create_daily_report', 'success')
        router.push('/helper/document/daily-report')
      }
    } catch (error: unknown) {
      console.error('작업일보 생성 실패:', error)
      analyticsClient.trackAction('dashboard', 'create_daily_report', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreatingDailyReport.value = false
    }
  }

  const confirmExcludeAndCreate = async (
    excludedIds: Record<string, string[]>,
    excludedPhotoIndices: number[],
  ) => {
    isCreatingDailyReport.value = true
    showExcludeDialog.value = false
    try {
      await createDailyReport(dailyReportRepository, {
        date: todayString.value,
        excludedIds,
        excludedPhotoIndices,
      })
      analyticsClient.trackAction('dashboard', 'create_daily_report_with_exclude', 'success')
      router.push('/helper/document/daily-report')
    } catch (error: unknown) {
      console.error('작업일보 생성 실패:', error)
      analyticsClient.trackAction('dashboard', 'create_daily_report_with_exclude', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreatingDailyReport.value = false
    }
  }

  // loadData 내부에서 tomorrowDateString 을 재설정할 때 watch 가 재귀 호출되지 않도록 방어
  let isBulkLoading = false

  /**
   * @param resolveTomorrow true 면 서버 API 로 다음 작업일을 재결정. false 면 현재 tomorrowDateString 유지
   *                        (CRUD 후 같은 날짜에 머물도록)
   */
  const loadData = async (resolveTomorrow = true) => {
    if (!projectStore.selectedProjectId) return

    isLoading.value = true
    isBulkLoading = true
    try {
      if (resolveTomorrow) {
        // 서버에서 다음 작업일 결정 (실적 존재하는 가장 빠른 날짜, 없으면 today+1)
        try {
          const next = await dashboardRepository.getNextDateWithActualWorkChecker(todayString.value)
          if (next.date) tomorrowDateString.value = next.date
        } catch (error) {
          console.error('다음 작업일 조회 실패, today+1 로 폴백:', error)
          tomorrowDateString.value = nextDayString(todayString.value)
        }
      }

      // 대시보드 데이터 로드
      const data = await loadDashboardData(
        dashboardRepository,
        todayString.value,
        tomorrowDateString.value,
      )

      todayWeather.value = data.weather
      todayActualWorks.value = data.todayActualWorks
      tomorrowActualWorks.value = data.tomorrowActualWorks
      todayAttendance.value = data.attendance
      todayDeliveryQuantities.value = data.deliveryQuantities
      todayEquipment.value = data.equipment

      // 사진 ObjectURL 재로딩
      await loadAllPhotos()
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error)
    } finally {
      isBulkLoading = false
      isLoading.value = false
    }
  }

  /** CRUD 후 리프레시 — 현재 tomorrowDateString 유지 */
  const refreshData = () => loadData(false)

  const loadTomorrowOnly = async () => {
    if (!projectStore.selectedProjectId) return
    try {
      tomorrowActualWorks.value = tomorrowDateString.value
        ? await dashboardRepository.getActualWorkListByDate(tomorrowDateString.value)
        : []
    } catch (error) {
      console.error('다음 작업일 actualWork 로드 실패:', error)
    }
  }

  watch(selectedDateString, () => {
    // 오늘 날짜가 바뀌면 loadData 가 서버 API 로 다음 작업일 재결정
    loadData()
  })

  watch(tomorrowDateString, (newDate, oldDate) => {
    if (newDate === oldDate) return
    if (isBulkLoading) return
    loadTomorrowOnly()
  })

  onMounted(() => loadData())

  return {
    attendanceByGroup,
    confirmExcludeAndCreate,
    deliveryByWorkType,
    equipmentByGroup,
    generateHomepageDailyReport,
    isCreatingHomepageDailyReport,
    generateDailyReport,
    isCreatingDailyReport,
    isLoading,
    showExcludeDialog,
    selectedDateString,
    today,
    todayWeather,
    todayDayName,
    todayString,
    todayWorksByType,
    tomorrowWorksByType,
    tomorrowDateString,
    tomorrowMinDateString,
    tomorrowDateLabel,
    loadData,
    createActualWork,
    updateActualWork,
    deleteActualWork,
    validateResult,
    photoObjectUrls,
    uploadPhotos,
    onPhotoUpdated,
    todayActualWorks,
  }
}
