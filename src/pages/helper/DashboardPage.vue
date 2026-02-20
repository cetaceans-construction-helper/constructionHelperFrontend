<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AreaCard from '@/components/helper/AreaCard.vue'
import { Button } from '@/components/ui/button'
import { workApi, type WorkResponse } from '@/api/work'
import { attendanceApi, type AttendanceByDateItem } from '@/api/attendance'
import { useProjectStore } from '@/stores/project'
import { useCalendarStore } from '@/stores/calendarStore'

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
const allWorks = ref<WorkResponse[]>([])
const todayWorkIds = ref<number[]>([])
const tomorrowWorkIds = ref<number[]>([])
const todayAttendance = ref<AttendanceByDateItem[]>([])
const isLoading = ref(false)

// 오늘 작업 (workType별 그루핑)
const todayWorksByType = computed(() => {
  const todaySet = new Set(todayWorkIds.value)
  const filtered = allWorks.value.filter(w => todaySet.has(w.workId))

  const grouped = new Map<string, WorkResponse[]>()
  for (const work of filtered) {
    const wt = work.workType || '미분류'
    if (!grouped.has(wt)) {
      grouped.set(wt, [])
    }
    grouped.get(wt)!.push(work)
  }
  return grouped
})

// 내일 작업 (workType별 그루핑)
const tomorrowWorksByType = computed(() => {
  const tomorrowSet = new Set(tomorrowWorkIds.value)
  const filtered = allWorks.value.filter(w => tomorrowSet.has(w.workId))

  const grouped = new Map<string, WorkResponse[]>()
  for (const work of filtered) {
    const wt = work.workType || '미분류'
    if (!grouped.has(wt)) {
      grouped.set(wt, [])
    }
    grouped.get(wt)!.push(work)
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

// 데이터 로드
onMounted(async () => {
  if (!projectStore.selectedProjectId) return

  isLoading.value = true
  try {
    // 캘린더 데이터 캐시 로드
    await calendarStore.getCalendar(projectStore.selectedProjectId)

    // 작업 데이터 병렬 로드
    const [works, todayIds, tomorrowIds, attendance] = await Promise.all([
      workApi.getWorkList(),
      workApi.getWorkListByDate(todayString),
      workApi.getWorkListByDate(tomorrowString),
      attendanceApi.getAttendanceListByDate(todayString),
    ])

    allWorks.value = works
    todayWorkIds.value = todayIds
    tomorrowWorkIds.value = tomorrowIds
    todayAttendance.value = attendance
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
      <AreaCard height="flex-none" min-height="auto" class="w-1/3">
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
                  <p v-for="work in works" :key="work.workId" class="text-sm text-muted-foreground">
                    - {{ work.workName }}
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
            <div class="space-y-3">
              <div>
                <p class="text-sm font-medium mb-1">&#9632; 철근콘크리트공사</p>
                <div class="space-y-0.5">
                  <p class="text-sm text-muted-foreground">- 철근(SD400) : 8.234 ton</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 반입 장비 -->
          <div class="border border-border rounded-lg p-3">
            <h4 class="text-sm font-semibold mb-2 text-foreground">반입 장비</h4>
            <div class="space-y-0.5">
              <p class="text-sm text-muted-foreground">- 크레인(25ton) : 1대</p>
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
      <AreaCard height="flex-none" min-height="auto" class="w-1/3">
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
      <AreaCard height="flex-none" min-height="auto" class="w-1/3">
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
  </div>
</template>
