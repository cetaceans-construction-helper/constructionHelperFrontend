<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AreaCard from '@/components/helper/AreaCard.vue'
import { Button } from '@/components/ui/button'
import { workApi, type WorkResponse } from '@/api/work'
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

// 데이터 로드
onMounted(async () => {
  if (!projectStore.selectedProjectId) return

  isLoading.value = true
  try {
    // 캘린더 데이터 캐시 로드
    await calendarStore.getCalendar(projectStore.selectedProjectId)

    // 작업 데이터 병렬 로드
    const [works, todayIds, tomorrowIds] = await Promise.all([
      workApi.getWorkList(),
      workApi.getWorkListByDate(todayString),
      workApi.getWorkListByDate(tomorrowString)
    ])

    allWorks.value = works
    todayWorkIds.value = todayIds
    tomorrowWorkIds.value = tomorrowIds
  } catch (error) {
    console.error('대시보드 데이터 로드 실패:', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="flex-1 flex flex-col gap-4">
    <h1 class="text-2xl font-bold">대시보드</h1>

    <div class="flex gap-4">
      <!-- 작업일보 영역 (1/3 너비) -->
      <AreaCard height="flex-none" min-height="auto" class="w-1/3">
        <!-- 커스텀 헤더 -->
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold">오늘작업</h3>
          <Button variant="outline" size="sm" @click="router.push('/helper/schedule/2d')">
            공정표 수정
          </Button>
        </div>

        <div v-if="isLoading" class="text-sm text-muted-foreground">
          로딩 중...
        </div>

        <div v-else class="space-y-6">
          <!-- 오늘 날짜 정보 -->
          <div class="flex items-center justify-between">
            <div>
              <p class="text-lg font-semibold">
                {{ today.getMonth() + 1 }}월 {{ today.getDate() }}일 ({{ todayDayName }})
              </p>
              <p class="text-sm text-muted-foreground">{{ todayString }}</p>
            </div>
            <!-- 날씨 (추후 구현) -->
            <div class="text-right text-sm text-muted-foreground">
              <p>맑음</p>
              <p>-5°C / 3°C</p>
            </div>
          </div>

          <!-- 오늘 작업 -->
          <div>
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
                    class="text-sm text-muted-foreground"
                  >
                    - {{ work.workName }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- 내일 작업 -->
          <div>
            <h4 class="text-sm font-semibold mb-2 text-foreground">내일 작업</h4>
            <div v-if="tomorrowWorksByType.size === 0" class="text-sm text-muted-foreground">
              내일 예정된 작업이 없습니다.
            </div>
            <div v-else class="space-y-3">
              <div v-for="[workType, works] in tomorrowWorksByType" :key="workType">
                <p class="text-sm font-medium mb-1">&#9632; {{ workType }}</p>
                <div class="space-y-0.5">
                  <p
                    v-for="work in works"
                    :key="work.workId"
                    class="text-sm text-muted-foreground"
                  >
                    - {{ work.workName }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AreaCard>

      <!-- 나머지 영역 (추후 확장) -->
      <div class="flex-1">
        <!-- 추가 대시보드 컴포넌트들 -->
      </div>
    </div>
  </div>
</template>
