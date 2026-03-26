import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type {
  AttendanceByDateItem,
  EquipmentDeploymentByDateItem,
} from '@/features/attendance/public'
import type { DeliveryQuantityByDate } from '@/features/material/public'
import { workApi, type WorkPhotoResponse, type WorkResponse } from '@/shared/network-core/apis/work'
import { skippedWorkApi } from '@/shared/network-core/apis/skippedWork'
import { useProjectStore } from '@/app/context/stores/project'
import type { WeatherByDateResponse } from '@/shared/network-core/contracts/calendar'
import type {
  AttendanceGroup,
  EquipmentGroup,
  PhotoWithWork,
  WorkPhotoDialogExpose,
} from '@/features/dashboard/model/dashboard-types'
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

  const selectedDateString = ref(formatLocalDate(new Date()))
  const today = computed(() => new Date(selectedDateString.value + 'T00:00:00'))
  const todayString = computed(() => selectedDateString.value)
  const todayDayName = computed(() => dayNames[today.value.getDay()] ?? '알수없음')

  // 데이터 상태
  const todayWorks = ref<WorkResponse[]>([])
  const tomorrowWorks = ref<WorkResponse[]>([])
  const nextWorkDateLabel = ref('')
  const nextWorkDateString = ref('')
  const simpleTomorrowWorks = ref<WorkResponse[]>([])
  const simpleTomorrowDateLabel = ref('')
  const simpleTomorrowDateString = ref('')
  const tomorrowWorkMode = ref<1 | 2>(1)
  const todayAttendance = ref<AttendanceByDateItem[]>([])
  const todayDeliveryQuantities = ref<DeliveryQuantityByDate[]>([])
  const todayEquipment = ref<EquipmentDeploymentByDateItem[]>([])
  const isLoading = ref(false)

  // 사진 관련 상태
  const photoObjectUrls = ref<Map<number, string>>(new Map())
  const fileInputRef = ref<HTMLInputElement | null>(null)
  const selectedWorkForPhoto = ref<WorkResponse | null>(null)
  const photoDialogRef = ref<WorkPhotoDialogExpose | null>(null)

  // 사진 프리뷰 다이얼로그 상태
  const pendingPhotos = ref<File[]>([])
  const pendingPhotoDescriptions = ref<string[]>([])
  const photoPreviewDialogOpen = ref(false)
  const isUploadingPhotos = ref(false)

  const revokeAllObjectUrls = () => {
    for (const url of photoObjectUrls.value.values()) {
      URL.revokeObjectURL(url)
    }
    photoObjectUrls.value = new Map()
  }

  const loadAllPhotos = async () => {
    revokeAllObjectUrls()
    const photoEntries = todayWorks.value.flatMap((work) => work.photos ?? [])

    const results = await Promise.allSettled(
      photoEntries.map((photo) =>
        dashboardRepository.downloadWorkPhoto(photo.thumbnailUrl)
          .then((url) => ({ photoId: photo.photoId, url }))
      )
    )

    const newUrls = new Map<number, string>()
    for (const result of results) {
      if (result.status === 'fulfilled') {
        newUrls.set(result.value.photoId, result.value.url)
      }
    }
    photoObjectUrls.value = newUrls
  }

  const triggerPhotoUpload = (work: WorkResponse) => {
    selectedWorkForPhoto.value = work
    fileInputRef.value?.click()
  }

  const onPhotoFileChange = (event: Event) => {
    const input = event.target as HTMLInputElement
    const files = input.files ? Array.from(input.files) : []
    input.value = ''
    if (files.length === 0 || !selectedWorkForPhoto.value) return

    pendingPhotos.value = files
    pendingPhotoDescriptions.value = files.map(() => '')
    photoPreviewDialogOpen.value = true
  }

  const confirmPhotoUpload = async () => {
    if (!selectedWorkForPhoto.value || pendingPhotos.value.length === 0) return
    isUploadingPhotos.value = true
    try {
      const descriptions = pendingPhotoDescriptions.value.some((d) => d.trim())
        ? pendingPhotoDescriptions.value
        : undefined
      await dashboardRepository.createWorkPhoto(
        selectedWorkForPhoto.value.workId,
        todayString.value,
        pendingPhotos.value,
        descriptions,
      )
      photoPreviewDialogOpen.value = false
      todayWorks.value = await dashboardRepository.getWorkListByDate(todayString.value)
      await loadAllPhotos()
      analyticsClient.trackAction('dashboard', 'upload_photo', 'success')
    } catch (error: unknown) {
      console.error('사진 업로드 실패:', error)
      analyticsClient.trackAction('dashboard', 'upload_photo', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isUploadingPhotos.value = false
      pendingPhotos.value = []
      pendingPhotoDescriptions.value = []
      selectedWorkForPhoto.value = null
    }
  }

  const cancelPhotoUpload = () => {
    photoPreviewDialogOpen.value = false
    pendingPhotos.value = []
    pendingPhotoDescriptions.value = []
    selectedWorkForPhoto.value = null
  }

  const allTodayPhotos = computed<PhotoWithWork[]>(() => {
    const result: PhotoWithWork[] = []
    for (const work of todayWorks.value) {
      if (!work.photos) continue
      for (const photo of work.photos) {
        result.push({ photo, workName: work.workName })
      }
    }
    return result
  })

  const openPhotoDialog = async (photo: WorkPhotoResponse) => {
    const thumbnailUrl = photoObjectUrls.value.get(photo.photoId)
    if (!thumbnailUrl) return
    const originalUrl = await dashboardRepository.downloadWorkPhoto(photo.url)
    photoDialogRef.value?.openDialog(photo, originalUrl)
  }

  const onPhotoUpdated = async () => {
    todayWorks.value = await dashboardRepository.getWorkListByDate(todayString.value)
    await loadAllPhotos()
  }

  const todayWorksByType = computed(() => {
    const grouped = new Map<string, WorkResponse[]>()
    for (const work of todayWorks.value) {
      const workType = work.workType || '미분류'
      if (!grouped.has(workType)) grouped.set(workType, [])
      grouped.get(workType)?.push(work)
    }
    return grouped
  })

  const skipWork = async (workId: number) => {
    try {
      await skippedWorkApi.createSkippedWork(workId, todayString.value)
      const work = todayWorks.value.find(w => w.workId === workId)
      if (work) work.isSkipped = true
      todayWorks.value = [...todayWorks.value]
      analyticsClient.trackAction('dashboard', 'skip_work', 'success')
    } catch (error: any) {
      console.error('작업 숨기기 실패:', error)
      analyticsClient.trackAction('dashboard', 'skip_work', 'fail')
      alert(error.response?.data?.message || error.message)
    }
  }

  const unskipWork = async (workId: number) => {
    try {
      await skippedWorkApi.deleteSkippedWork(workId, todayString.value)
      const work = todayWorks.value.find(w => w.workId === workId)
      if (work) work.isSkipped = false
      todayWorks.value = [...todayWorks.value]
      analyticsClient.trackAction('dashboard', 'unskip_work', 'success')
    } catch (error: any) {
      console.error('작업 숨기기 취소 실패:', error)
      analyticsClient.trackAction('dashboard', 'unskip_work', 'fail')
      alert(error.response?.data?.message || error.message)
    }
  }

  const deleteWork = async (workId: number) => {
    try {
      await workApi.deleteWork(workId)
      await loadData()
      analyticsClient.trackAction('dashboard', 'delete_work', 'success')
    } catch (error: any) {
      console.error('작업 삭제 실패:', error)
      analyticsClient.trackAction('dashboard', 'delete_work', 'fail')
      alert(error.response?.data?.message || error.message)
    }
  }

  const skipTomorrowWork = async (workId: number) => {
    try {
      await skippedWorkApi.createSkippedWork(workId, activeTomorrowDateString.value)
      const work = activeTomorrowWorks.value.find(w => w.workId === workId)
      if (work) work.isSkipped = true
      // reactivity trigger
      tomorrowWorks.value = [...tomorrowWorks.value]
      simpleTomorrowWorks.value = [...simpleTomorrowWorks.value]
      analyticsClient.trackAction('dashboard', 'skip_tomorrow_work', 'success')
    } catch (error: any) {
      console.error('작업 숨기기 실패:', error)
      analyticsClient.trackAction('dashboard', 'skip_tomorrow_work', 'fail')
      alert(error.response?.data?.message || error.message)
    }
  }

  const unskipTomorrowWork = async (workId: number) => {
    try {
      await skippedWorkApi.deleteSkippedWork(workId, activeTomorrowDateString.value)
      const work = activeTomorrowWorks.value.find(w => w.workId === workId)
      if (work) work.isSkipped = false
      tomorrowWorks.value = [...tomorrowWorks.value]
      simpleTomorrowWorks.value = [...simpleTomorrowWorks.value]
      analyticsClient.trackAction('dashboard', 'unskip_tomorrow_work', 'success')
    } catch (error: any) {
      console.error('작업 숨기기 취소 실패:', error)
      analyticsClient.trackAction('dashboard', 'unskip_tomorrow_work', 'fail')
      alert(error.response?.data?.message || error.message)
    }
  }

  const tomorrowWorksByType = computed(() => {
    const grouped = new Map<string, WorkResponse[]>()
    for (const work of tomorrowWorks.value) {
      const workType = work.workType || '미분류'
      if (!grouped.has(workType)) grouped.set(workType, [])
      grouped.get(workType)?.push(work)
    }
    return grouped
  })

  const simpleTomorrowWorksByType = computed(() => {
    const grouped = new Map<string, WorkResponse[]>()
    for (const work of simpleTomorrowWorks.value) {
      const workType = work.workType || '미분류'
      if (!grouped.has(workType)) grouped.set(workType, [])
      grouped.get(workType)?.push(work)
    }
    return grouped
  })

  const activeTomorrowWorks = computed(() =>
    tomorrowWorkMode.value === 1 ? tomorrowWorks.value : simpleTomorrowWorks.value,
  )

  const activeTomorrowDateLabel = computed(() =>
    tomorrowWorkMode.value === 1 ? nextWorkDateLabel.value : simpleTomorrowDateLabel.value,
  )

  const activeTomorrowDateString = computed(() =>
    tomorrowWorkMode.value === 1 ? nextWorkDateString.value : simpleTomorrowDateString.value,
  )

  const activeTomorrowWorksByType = computed(() => {
    const grouped = new Map<string, WorkResponse[]>()
    for (const work of activeTomorrowWorks.value) {
      const workType = work.workType || '미분류'
      if (!grouped.has(workType)) grouped.set(workType, [])
      grouped.get(workType)?.push(work)
    }
    return grouped
  })

  const toggleTomorrowWorkMode = () => {
    tomorrowWorkMode.value = tomorrowWorkMode.value === 1 ? 2 : 1
  }

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
      // skipped 작업 제외
      const filteredTodayWorksByType = new Map<string, WorkResponse[]>()
      for (const [wt, works] of todayWorksByType.value) {
        const filtered = works.filter(w => !w.isSkipped)
        if (filtered.length > 0) filteredTodayWorksByType.set(wt, filtered)
      }

      await createHomepageDailyReport({
        todayDayName: todayDayName.value,
        todayWeather: todayWeather.value,
        todayWorksByType: filteredTodayWorksByType,
        tomorrowWorksByType: tomorrowWorksByType.value,
        simpleTomorrowWorksByType: simpleTomorrowWorksByType.value,
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
        date: todayString,
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

  const loadData = async () => {
    if (!projectStore.selectedProjectId) return

    isLoading.value = true
    try {
      const data = await loadDashboardData(dashboardRepository, todayString.value)

      todayWeather.value = data.weather
      todayWorks.value = data.todayWorks
      tomorrowWorks.value = data.tomorrowWorks
      nextWorkDateLabel.value = data.nextWorkDateLabel
      nextWorkDateString.value = data.nextWorkDateString
      simpleTomorrowWorks.value = data.simpleTomorrowWorks
      simpleTomorrowDateLabel.value = data.simpleTomorrowDateLabel
      simpleTomorrowDateString.value = data.simpleTomorrowDateString
      todayAttendance.value = data.attendance
      todayDeliveryQuantities.value = data.deliveryQuantities
      todayEquipment.value = data.equipment

      await loadAllPhotos()
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error)
    } finally {
      isLoading.value = false
    }
  }

  watch(selectedDateString, () => loadData())

  onMounted(() => loadData())

  onUnmounted(() => {
    revokeAllObjectUrls()
  })

  return {
    allTodayPhotos,
    attendanceByGroup,
    cancelPhotoUpload,
    confirmExcludeAndCreate,
    confirmPhotoUpload,
    deliveryByWorkType,
    equipmentByGroup,
    generateHomepageDailyReport,
    isCreatingHomepageDailyReport,
    isUploadingPhotos,
    fileInputRef,
    generateDailyReport,
    isCreatingDailyReport,
    isLoading,
    onPhotoFileChange,
    onPhotoUpdated,
    openPhotoDialog,
    pendingPhotos,
    pendingPhotoDescriptions,
    photoDialogRef,
    photoObjectUrls,
    photoPreviewDialogOpen,
    deleteWork,
    skipWork,
    unskipWork,
    showExcludeDialog,
    selectedDateString,
    today,
    todayWeather,
    todayDayName,
    todayString,
    nextWorkDateLabel,
    todayWorksByType,
    tomorrowWorkMode,
    activeTomorrowWorksByType,
    activeTomorrowDateLabel,
    activeTomorrowDateString,
    skipTomorrowWork,
    unskipTomorrowWork,
    toggleTomorrowWorkMode,
    loadData,
    triggerPhotoUpload,
    validateResult,
  }
}
