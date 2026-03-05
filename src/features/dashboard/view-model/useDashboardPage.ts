import { computed, onMounted, onUnmounted, ref } from 'vue'
import { attendanceApi, type AttendanceByDateItem } from '@/api/attendance'
import { equipmentApi, type EquipmentDeploymentByDateItem } from '@/api/equipment'
import { materialOrderApi, type DeliveryQuantityByDate } from '@/api/materialOrder'
import { workApi, type WorkPhotoResponse, type WorkResponse } from '@/api/work'
import { useCalendarStore } from '@/app/context/stores/calendarStore'
import { useProjectStore } from '@/app/context/stores/project'
import type {
  AttendanceGroup,
  EquipmentGroup,
  PhotoWithWork,
  WorkPhotoDialogExpose,
} from '@/features/dashboard/model/dashboard-types'
import { getDashboardDateContext } from '@/features/dashboard/use-cases/dashboard-date'

export const useDashboardPage = () => {
  const projectStore = useProjectStore()
  const calendarStore = useCalendarStore()
  const { today, todayDayName, todayString, tomorrowString } = getDashboardDateContext()

  // 데이터 상태
  const todayWorks = ref<WorkResponse[]>([])
  const tomorrowWorks = ref<WorkResponse[]>([])
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
    const newUrls = new Map<number, string>()

    for (const work of todayWorks.value) {
      if (!work.photos) continue
      for (const photo of work.photos) {
        try {
          newUrls.set(photo.photoId, await workApi.downloadWorkPhoto(photo.url))
        } catch {
          // 개별 사진 로드 실패는 무시
        }
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
      await workApi.createWorkPhoto(selectedWorkForPhoto.value.workId, todayString, files)
      todayWorks.value = await workApi.getWorkListByDate(todayString)
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

  const openPhotoDialog = (photo: WorkPhotoResponse) => {
    const url = photoObjectUrls.value.get(photo.photoId)
    if (!url) return
    photoDialogRef.value?.openDialog(photo, url)
  }

  const onPhotoUpdated = async () => {
    todayWorks.value = await workApi.getWorkListByDate(todayString)
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

  const tomorrowWorksByType = computed(() => {
    const grouped = new Map<string, WorkResponse[]>()
    for (const work of tomorrowWorks.value) {
      const workType = work.workType || '미분류'
      if (!grouped.has(workType)) grouped.set(workType, [])
      grouped.get(workType)?.push(work)
    }
    return grouped
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

  onMounted(async () => {
    if (!projectStore.selectedProjectId) return

    isLoading.value = true
    try {
      await calendarStore.getCalendar(projectStore.selectedProjectId)
      const [todayWorkList, tomorrowWorkList, attendance, deliveryQuantities, equipment] =
        await Promise.all([
          workApi.getWorkListByDate(todayString),
          workApi.getWorkListByDate(tomorrowString),
          attendanceApi.getAttendanceListByDate(todayString),
          materialOrderApi.getTotalDeliveryQuantityByDate(todayString),
          equipmentApi.getEquipmentDeploymentListByDate(todayString),
        ])

      todayWorks.value = todayWorkList
      tomorrowWorks.value = tomorrowWorkList
      todayAttendance.value = attendance
      todayDeliveryQuantities.value = deliveryQuantities
      todayEquipment.value = equipment

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
    deliveryByWorkType,
    equipmentByGroup,
    fileInputRef,
    isLoading,
    onPhotoFileChange,
    onPhotoUpdated,
    openPhotoDialog,
    photoDialogRef,
    photoObjectUrls,
    today,
    todayDayName,
    todayString,
    todayWorksByType,
    tomorrowWorksByType,
    triggerPhotoUpload,
  }
}
