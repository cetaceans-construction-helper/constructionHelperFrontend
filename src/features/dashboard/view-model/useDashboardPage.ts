import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import type {
  AttendanceByDateItem,
  EquipmentDeploymentByDateItem,
} from '@/features/attendance/public'
import type { DeliveryQuantityByDate } from '@/features/material/public'
import type { WorkPhotoResponse, WorkResponse } from '@/shared/network-core/apis/work'
import { useProjectStore } from '@/app/context/stores/project'
import type { WeatherByDateResponse } from '@/shared/network-core/contracts/calendar'
import type {
  AttendanceGroup,
  EquipmentGroup,
  PhotoWithWork,
  WorkPhotoDialogExpose,
} from '@/features/dashboard/model/dashboard-types'
import { getDashboardDateContext } from '@/features/dashboard/use-cases/dashboard-date'
import { loadDashboardData } from '@/features/dashboard/use-cases/load-dashboard-data'
import { dashboardRepository } from '@/features/dashboard/infra/dashboard-repository'
import {
  validateDailyReport,
  createDailyReport,
} from '@/features/document/public'
import type { ValidateDailyReportResponse } from '@/features/document/public'
import { dailyReportRepository } from '@/features/document/public'

export const useDashboardPage = () => {
  const projectStore = useProjectStore()
  const router = useRouter()
  const { today, todayDayName, todayString } = getDashboardDateContext()

  // 데이터 상태
  const todayWorks = ref<WorkResponse[]>([])
  const tomorrowWorks = ref<WorkResponse[]>([])
  const nextWorkDateLabel = ref('')
  const simpleTomorrowWorks = ref<WorkResponse[]>([])
  const simpleTomorrowDateLabel = ref('')
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

  const onPhotoFileChange = async (event: Event) => {
    const input = event.target as HTMLInputElement
    const files = input.files ? Array.from(input.files) : []
    if (files.length === 0 || !selectedWorkForPhoto.value) return

    try {
      await dashboardRepository.createWorkPhoto(selectedWorkForPhoto.value.workId, todayString, files)
      todayWorks.value = await dashboardRepository.getWorkListByDate(todayString)
      await loadAllPhotos()
    } catch (error: unknown) {
      console.error('사진 업로드 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      input.value = ''
      selectedWorkForPhoto.value = null
    }
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
    todayWorks.value = await dashboardRepository.getWorkListByDate(todayString)
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

  const activeTomorrowWorks = computed(() =>
    tomorrowWorkMode.value === 1 ? tomorrowWorks.value : simpleTomorrowWorks.value,
  )

  const activeTomorrowDateLabel = computed(() =>
    tomorrowWorkMode.value === 1 ? nextWorkDateLabel.value : simpleTomorrowDateLabel.value,
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

  // 작업일보 생성
  const isCreatingDailyReport = ref(false)
  const showExcludeDialog = ref(false)
  const validateResult = ref<ValidateDailyReportResponse | null>(null)

  const generateDailyReport = async () => {
    isCreatingDailyReport.value = true
    try {
      const result = await validateDailyReport(dailyReportRepository, todayString, tomorrowWorkMode.value)
      const hasExceeded = result.sections.some((s) => s.exceeded) || (result.photos?.exceeded ?? false)

      if (hasExceeded) {
        validateResult.value = result
        showExcludeDialog.value = true
      } else {
        await createDailyReport(dailyReportRepository, { date: todayString, tomorrowWorkMode: tomorrowWorkMode.value })
        router.push('/helper/document/daily-report')
      }
    } catch (error: unknown) {
      console.error('작업일보 생성 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreatingDailyReport.value = false
    }
  }

  const confirmExcludeAndCreate = async (
    excludedSectionIndices: Record<string, number[]>,
    excludedPhotoIndices: number[],
  ) => {
    isCreatingDailyReport.value = true
    showExcludeDialog.value = false
    try {
      await createDailyReport(dailyReportRepository, {
        date: todayString,
        excludedSectionIndices,
        excludedPhotoIndices,
        tomorrowWorkMode: tomorrowWorkMode.value,
      })
      router.push('/helper/document/daily-report')
    } catch (error: unknown) {
      console.error('작업일보 생성 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreatingDailyReport.value = false
    }
  }

  onMounted(async () => {
    if (!projectStore.selectedProjectId) return

    isLoading.value = true
    try {
      const data = await loadDashboardData(dashboardRepository, todayString)

      todayWeather.value = data.weather
      todayWorks.value = data.todayWorks
      tomorrowWorks.value = data.tomorrowWorks
      nextWorkDateLabel.value = data.nextWorkDateLabel
      simpleTomorrowWorks.value = data.simpleTomorrowWorks
      simpleTomorrowDateLabel.value = data.simpleTomorrowDateLabel
      todayAttendance.value = data.attendance
      todayDeliveryQuantities.value = data.deliveryQuantities
      todayEquipment.value = data.equipment

      await loadAllPhotos()
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error)
    } finally {
      isLoading.value = false
    }
  })

  onUnmounted(() => {
    revokeAllObjectUrls()
  })

  return {
    allTodayPhotos,
    attendanceByGroup,
    confirmExcludeAndCreate,
    deliveryByWorkType,
    equipmentByGroup,
    fileInputRef,
    generateDailyReport,
    isCreatingDailyReport,
    isLoading,
    onPhotoFileChange,
    onPhotoUpdated,
    openPhotoDialog,
    photoDialogRef,
    photoObjectUrls,
    showExcludeDialog,
    today,
    todayWeather,
    todayDayName,
    todayString,
    nextWorkDateLabel,
    todayWorksByType,
    tomorrowWorkMode,
    activeTomorrowWorksByType,
    activeTomorrowDateLabel,
    toggleTomorrowWorkMode,
    triggerPhotoUpload,
    validateResult,
  }
}
