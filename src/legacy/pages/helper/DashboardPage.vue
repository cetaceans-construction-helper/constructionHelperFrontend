<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import AreaCard from '@/components/helper/AreaCard.vue'
import { Button } from '@/components/ui/button'
import { workApi, type WorkResponse, type WorkPhotoResponse } from '@/api/work'
import { attendanceApi, type AttendanceByDateItem } from '@/api/attendance'
import { materialOrderApi, type DeliveryQuantityByDate } from '@/api/materialOrder'
import { equipmentApi, type EquipmentDeploymentByDateItem } from '@/api/equipment'
import { useProjectStore } from '@/stores/project'
import { useCalendarStore } from '@/stores/calendarStore'
import WorkPhotoDialog from '@/pages/helper/dashboard/components/WorkPhotoDialog.vue'

const router = useRouter()
const projectStore = useProjectStore()
const calendarStore = useCalendarStore()

// 로컬 날짜 포맷 함수
const formatLocalDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 오늘/내일 날짜
const today = new Date()
const tomorrow = new Date(today)
tomorrow.setDate(tomorrow.getDate() + 1)

const todayString = formatLocalDate(today)
const tomorrowString = formatLocalDate(tomorrow)

// 요일 배열
const dayNames = ['일', '월', '화', '수', '목', '금', '토']
const todayDayName = dayNames[today.getDay()]

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
const photoDialogRef = ref<InstanceType<typeof WorkPhotoDialog> | null>(null)

function revokeAllObjectUrls() {
  for (const url of photoObjectUrls.value.values()) {
    URL.revokeObjectURL(url)
  }
  photoObjectUrls.value = new Map()
}

async function loadAllPhotos() {
  revokeAllObjectUrls()
  const newUrls = new Map<number, string>()

  for (const work of todayWorks.value) {
    if (!work.photos) continue
    for (const photo of work.photos) {
      try {
        newUrls.set(photo.photoId, await workApi.downloadWorkPhoto(photo.url))
      } catch {
        // 개별 사진 로드 실패 무시
      }
    }
  }
  photoObjectUrls.value = newUrls
}

function triggerPhotoUpload(work: WorkResponse) {
  selectedWorkForPhoto.value = work
  fileInputRef.value?.click()
}

async function onPhotoFileChange(event: Event) {
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

// 전체 사진 목록 (workName 포함)
interface PhotoWithWork {
  photo: WorkPhotoResponse
  workName: string
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

function openPhotoDialog(photo: WorkPhotoResponse) {
  const url = photoObjectUrls.value.get(photo.photoId)
  if (!url) return
  photoDialogRef.value?.openDialog(photo, url)
}

async function onPhotoUpdated() {
  todayWorks.value = await workApi.getWorkListByDate(todayString)
  await loadAllPhotos()
}

onUnmounted(() => {
  revokeAllObjectUrls()
})

// 오늘 작업 (workType별 그루핑)
const todayWorksByType = computed(() => {
  const grouped = new Map<string, WorkResponse[]>()
  for (const work of todayWorks.value) {
    const wt = work.workType || '미분류'
    if (!grouped.has(wt)) grouped.set(wt, [])
    grouped.get(wt)!.push(work)
  }
  return grouped
})

// 내일 작업 (workType별 그루핑)
const tomorrowWorksByType = computed(() => {
  const grouped = new Map<string, WorkResponse[]>()
  for (const work of tomorrowWorks.value) {
    const wt = work.workType || '미분류'
    if (!grouped.has(wt)) grouped.set(wt, [])
    grouped.get(wt)!.push(work)
  }
  return grouped
})

// 반입 자재 (workTypeName별 그룹핑)
const deliveryByWorkType = computed(() => {
  const grouped = new Map<string, DeliveryQuantityByDate[]>()
  for (const item of todayDeliveryQuantities.value) {
    const wt = item.workTypeName || '미분류'
    if (!grouped.has(wt)) grouped.set(wt, [])
    grouped.get(wt)!.push(item)
  }
  return grouped
})

// 출역 인원 (workType + company 기준 그룹핑)
interface AttendanceGroup {
  workTypeName: string
  companyDisplayName: string
  totalCount: number
  items: AttendanceByDateItem[]
}

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
    const group = groupMap.get(key)!
    group.items.push(item)
    group.totalCount += item.count
  }

  return groups
})

// 반입 장비 (company 기준 그루핑)
interface EquipmentGroup {
  companyDisplayName: string
  totalCount: number
  items: EquipmentDeploymentByDateItem[]
}

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
    const group = groupMap.get(key)!
    group.items.push(item)
    group.totalCount += item.count
  }

  return groups
})

// 데이터 로드
onMounted(async () => {
  if (!projectStore.selectedProjectId) return

  isLoading.value = true
  try {
    // 캘린더 데이터 캐시 로드
    await calendarStore.getCalendar(projectStore.selectedProjectId)

    // 작업 데이터 병렬 로드
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

    // 오늘 작업 사진 로드
    await loadAllPhotos()
  } catch (error) {
    console.error('대시보드 데이터 로드 실패:', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="flex-1 flex flex-col gap-4">
    <div class="flex gap-4 items-start">
      <!-- 오늘작업 영역 -->
      <AreaCard height="flex-none" min-height="auto" class="w-1/2">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold">오늘작업</h3>
          <Button variant="outline" size="sm" @click="router.push('/helper/schedule/2d')">
            공정표 수정
          </Button>
        </div>

        <div v-if="isLoading" class="text-sm text-muted-foreground">로딩 중...</div>
        <div v-else class="space-y-4">
          <!-- 오늘 날짜 정보 -->
          <div class="flex items-center justify-between">
            <div>
              <p class="text-lg font-semibold">
                {{ today.getMonth() + 1 }}월 {{ today.getDate() }}일 ({{ todayDayName }})
              </p>
              <p class="text-sm text-muted-foreground">{{ todayString }}</p>
            </div>
            <div class="text-right text-sm text-muted-foreground">
              <p>맑음</p>
              <p>-5°C / 3°C</p>
            </div>
          </div>

          <!-- 오늘 작업 -->
          <div class="border border-border rounded-lg p-3">
            <h4 class="text-sm font-semibold mb-2 text-foreground">오늘 작업</h4>
            <div v-if="todayWorksByType.size === 0" class="text-sm text-muted-foreground">
              오늘 예정된 작업이 없습니다.
            </div>
            <div v-else class="space-y-3">
              <div v-for="[workType, works] in todayWorksByType" :key="workType">
                <p class="text-sm font-medium mb-1">&#9632; {{ workType }}</p>
                <div class="space-y-0.5">
                  <p
                    v-for="work in works"
                    :key="work.workId"
                    class="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                    @click="triggerPhotoUpload(work)"
                  >
                    - {{ work.workName }}
                  </p>
                </div>
              </div>
            </div>

            <!-- 사진 영역 -->
            <div v-if="allTodayPhotos.length > 0" class="mt-4 pt-3 border-t border-border">
              <h4 class="text-xs font-semibold mb-2 text-muted-foreground">사진</h4>
              <div class="grid grid-cols-4 gap-2">
                <div
                  v-for="{ photo, workName } in allTodayPhotos"
                  :key="photo.photoId"
                  class="cursor-pointer"
                  @click="openPhotoDialog(photo)"
                >
                  <div class="aspect-square rounded overflow-hidden border border-border">
                    <img
                      v-if="photoObjectUrls.get(photo.photoId)"
                      :src="photoObjectUrls.get(photo.photoId)"
                      :alt="photo.description || '작업 사진'"
                      class="w-full h-full object-cover"
                    />
                    <div
                      v-else
                      class="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground"
                    >
                      ...
                    </div>
                  </div>
                  <p class="text-sm text-muted-foreground mt-0.5 truncate">{{ workName }}</p>
                  <p v-if="photo.description" class="text-sm text-muted-foreground truncate">
                    {{ photo.description }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- 내일 작업 -->
          <div class="border border-border rounded-lg p-3">
            <h4 class="text-sm font-semibold mb-2 text-foreground">내일 작업</h4>
            <div v-if="tomorrowWorksByType.size === 0" class="text-sm text-muted-foreground">
              내일 예정된 작업이 없습니다.
            </div>
            <div v-else class="space-y-3">
              <div v-for="[workType, works] in tomorrowWorksByType" :key="workType">
                <p class="text-sm font-medium mb-1">&#9632; {{ workType }}</p>
                <div class="space-y-0.5">
                  <p v-for="work in works" :key="work.workId" class="text-sm text-muted-foreground">
                    - {{ work.workName }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- 반입 자재 -->
          <div class="border border-border rounded-lg p-3">
            <h4 class="text-sm font-semibold mb-2 text-foreground">반입 자재</h4>
            <div v-if="deliveryByWorkType.size === 0" class="text-sm text-muted-foreground">
              오늘 반입된 자재가 없습니다.
            </div>
            <div v-else class="space-y-3">
              <div v-for="[workType, items] in deliveryByWorkType" :key="workType">
                <p class="text-sm font-medium mb-1">&#9632; {{ workType }}</p>
                <div class="space-y-0.5">
                  <p v-for="item in items" :key="item.materialSpecName" class="text-sm text-muted-foreground">
                    - {{ item.materialTypeName }}({{ item.materialSpecName }}) : {{ item.totalQuantity }} {{ item.unit }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- 반입 장비 -->
          <div class="border border-border rounded-lg p-3">
            <h4 class="text-sm font-semibold mb-2 text-foreground">반입 장비</h4>
            <div v-if="equipmentByGroup.length === 0" class="text-sm text-muted-foreground">
              오늘 반입된 장비가 없습니다.
            </div>
            <div v-else class="space-y-3">
              <div v-for="(group, index) in equipmentByGroup" :key="index">
                <p class="text-sm font-medium mb-1">
                  &#9632; {{ group.companyDisplayName }} : {{ group.totalCount }}대
                </p>
                <div class="space-y-0.5">
                  <p
                    v-for="item in group.items"
                    :key="item.equipmentSpecId"
                    class="text-sm text-muted-foreground"
                  >
                    - {{ item.equipmentTypeName }}({{ item.equipmentSpecName }}) : {{ item.count }}대
                  </p>
                </div>
              </div>
              <p class="text-sm font-bold mt-2">
                &#9632; 총 장비 : {{ equipmentByGroup.reduce((sum, g) => sum + g.totalCount, 0) }}대
              </p>
            </div>
          </div>

          <!-- 출역인원 -->
          <div class="border border-border rounded-lg p-3">
            <h4 class="text-sm font-semibold mb-2 text-foreground">출역 인원</h4>
            <div v-if="attendanceByGroup.length === 0" class="text-sm text-muted-foreground">
              오늘 출역 인원이 없습니다.
            </div>
            <div v-else class="space-y-3">
              <div v-for="(group, index) in attendanceByGroup" :key="index">
                <p class="text-sm font-medium mb-1">
                  &#9632; {{ group.workTypeName }}({{ group.companyDisplayName }}) : {{ group.totalCount }}명
                </p>
                <div class="space-y-0.5">
                  <p
                    v-for="item in group.items"
                    :key="item.laborTypeId"
                    class="text-sm text-muted-foreground"
                  >
                    - {{ item.laborTypeName }} : {{ item.count }}명
                  </p>
                </div>
              </div>
              <!-- 총 출역인원 -->
              <p class="text-sm font-bold mt-2">
                &#9632; 총 출역인원 : {{ attendanceByGroup.reduce((sum, g) => sum + g.totalCount, 0) }}명
              </p>
            </div>
          </div>
        </div>
      </AreaCard>

      <!-- AI 도우미 영역 -->
      <AreaCard height="flex-none" min-height="auto" class="w-1/4">
        <h3 class="text-lg font-semibold">AI 도우미</h3>
        <div class="space-y-4 mt-[5rem]">
          <div class="border border-border rounded-lg p-3 flex items-center justify-between">
            <p class="text-sm">오늘 작업량을 체크해볼까요?</p>
            <Button variant="outline" size="sm" class="ml-4 shrink-0">바로가기</Button>
          </div>
          <div class="border border-border rounded-lg p-3 flex items-center justify-between">
            <p class="text-sm">3개월 후 엘리베이터 공사가 시작됩니다, 견적을 요청할까요?</p>
            <Button variant="outline" size="sm" class="ml-4 shrink-0">바로가기</Button>
          </div>
          <div class="border border-border rounded-lg p-3 flex items-center justify-between">
            <p class="text-sm">오늘 작업 평가서가 나왔습니다. 확인해주세요.</p>
            <Button variant="outline" size="sm" class="ml-4 shrink-0">바로가기</Button>
          </div>
        </div>
      </AreaCard>

      <!-- 작업 평가 영역 -->
      <AreaCard height="flex-none" min-height="auto" class="w-1/4">
        <h3 class="text-lg font-semibold">작업 평가</h3>
        <div class="space-y-4 mt-[5rem]">
          <div class="border border-border rounded-lg p-3">
            <p class="text-sm font-medium text-orange-600 dark:text-orange-400">⚠️ 오늘 효율 저하</p>
            <p class="text-sm text-muted-foreground mt-1">오늘은 출역인원 대비 작업량이 84% 밖에 되지 않습니다.</p>
          </div>
          <div class="border border-border rounded-lg p-3">
            <p class="text-sm font-medium text-green-600 dark:text-green-400">✓ 이번주 목표 초과 달성</p>
            <p class="text-sm text-muted-foreground mt-1">이번주는 출역인원 대비 작업량이 110% 입니다.</p>
          </div>
          <div class="border border-border rounded-lg p-3">
            <p class="text-sm font-medium text-blue-600 dark:text-blue-400">📊 철근콘크리트공사</p>
            <p class="text-sm text-muted-foreground mt-1">이번달 철근공사 진척률이 계획 대비 105%로 순조롭습니다.</p>
          </div>
          <div class="border border-border rounded-lg p-3">
            <p class="text-sm font-medium text-red-600 dark:text-red-400">⚠️ 지연 주의</p>
            <p class="text-sm text-muted-foreground mt-1">금속공사가 계획 대비 3일 지연되고 있습니다. 인원 보강을 검토하세요.</p>
          </div>
          <div class="border border-border rounded-lg p-3">
            <p class="text-sm font-medium text-purple-600 dark:text-purple-400">📈 생산성 분석</p>
            <p class="text-sm text-muted-foreground mt-1">형틀공 1인당 일일 평균 작업량: 12.5㎡ (업계 평균 대비 +15%)</p>
          </div>
        </div>
      </AreaCard>
    </div>

    <input
      ref="fileInputRef"
      type="file"
      multiple
      accept="image/*"
      class="hidden"
      @change="onPhotoFileChange"
    />

    <WorkPhotoDialog ref="photoDialogRef" @updated="onPhotoUpdated" />
  </div>
</template>
