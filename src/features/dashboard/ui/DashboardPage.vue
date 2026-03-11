<script setup lang="ts">
import { useRouter } from 'vue-router'
import AreaCard from '@/shared/helper-ui/AreaCard.vue'
import { Button } from '@/shared/ui/button'
import WorkPhotoDialog from '@/features/dashboard/ui/components/WorkPhotoDialog.vue'
import DailyReportExcludeDialog from '@/features/dashboard/ui/components/DailyReportExcludeDialog.vue'
import { useDashboardPage } from '@/features/dashboard/view-model/useDashboardPage'

const router = useRouter()
const {
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
  todayWorksByType,
  tomorrowWorkMode,
  activeTomorrowWorksByType,
  activeTomorrowDateLabel,
  toggleTomorrowWorkMode,
  triggerPhotoUpload,
  validateResult,
} = useDashboardPage()
</script>

<template>
  <div class="flex-1 flex flex-col gap-4">
    <div class="dashboard-layout">
      <!-- 작업일보 영역 -->
      <AreaCard height="flex-none" min-height="auto" class="dashboard-col-main dashboard-order-1">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold">작업일보</h3>
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              :disabled="isCreatingDailyReport"
              @click="generateDailyReport"
            >
              {{ isCreatingDailyReport ? '생성 중...' : '작업일보생성' }}
            </Button>
            <Button variant="outline" size="sm" @click="router.push('/helper/schedule/2d')">
              공정표 수정
            </Button>
          </div>
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
              <p>{{ todayWeather?.weather ?? '-' }}</p>
              <p>
                {{
                  todayWeather
                    ? `${todayWeather.minTemperature}°C / ${todayWeather.maxTemperature}°C`
                    : '-'
                }}
              </p>
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
            <div class="flex items-center gap-2 mb-2">
              <h4 class="text-sm font-semibold text-foreground w-52 shrink-0">
                {{ tomorrowWorkMode === 1 ? '다음 작업일' : '내일'
                }}{{ activeTomorrowDateLabel ? ` - ${activeTomorrowDateLabel}` : '' }}
              </h4>
              <Button
                variant="secondary"
                size="sm"
                class="h-6 px-2 text-xs"
                @click="toggleTomorrowWorkMode"
              >
                {{ tomorrowWorkMode === 1 ? '내일로 변경' : '다음 작업일로 변경' }}
              </Button>
            </div>
            <div v-if="activeTomorrowWorksByType.size === 0" class="text-sm text-muted-foreground">
              내일 예정된 작업이 없습니다.
            </div>
            <div v-else class="space-y-3">
              <div v-for="[workType, works] in activeTomorrowWorksByType" :key="workType">
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
                  <p
                    v-for="item in items"
                    :key="item.materialSpecName"
                    class="text-sm text-muted-foreground"
                  >
                    - {{ item.materialTypeName }}({{ item.materialSpecName }}) :
                    {{ item.totalQuantity }} {{ item.unit }}
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
                    - {{ item.equipmentTypeName }}({{ item.equipmentSpecName }}) :
                    {{ item.count }}대
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
                  &#9632; {{ group.workTypeName }}({{ group.companyDisplayName }}) :
                  {{ group.totalCount }}명
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
                &#9632; 총 출역인원 :
                {{ attendanceByGroup.reduce((sum, g) => sum + g.totalCount, 0) }}명
              </p>
            </div>
          </div>
        </div>
      </AreaCard>

      <!-- 우측 영역 -->
      <div class="dashboard-col-right">
        <!-- Release Note 영역 -->
        <AreaCard
          height="flex-none"
          min-height="auto"
          class="dashboard-order-2 dashboard-release-note"
        >
          <h3 class="text-lg font-semibold">Release Note</h3>
          <div class="mt-4 flex-1 min-h-0">
            <div class="border border-border rounded-lg p-3 h-full overflow-y-auto">
              <p class="text-sm font-medium">26.03.11 수요일</p>
              <p class="text-sm text-muted-foreground mt-1">1. 2D공정표 작동방식 대규모 수정.</p>
              <p class="text-sm text-muted-foreground mt-1">2. 작업모드, 패스모드 구분이 없어짐</p>
              <p class="text-sm font-bold text-red-500 mt-1">
                3. 작업, 패스 수정은 오른쪽버튼 클릭으로 변경
              </p>
              <p class="text-sm font-bold text-red-500 mt-1">
                4. 작업을 선택하면 날짜조정, 선택하지 않으면 새로운 패스 생성
              </p>
              <p class="text-sm font-bold text-red-500 mt-1">
                5. 패스를 선택하고 연결하면 패스에 작업추가
              </p>
              <p class="text-sm text-muted-foreground mt-1">
                6. 구간, 용도 개념 제거. 구역 / 층 만 입력합니다.
              </p>
              <p class="text-sm font-bold text-red-500 mt-1">
                7. 원하는 세부공종 위치에 더블클릭하면 해당 세부공종 작업 생성합니다.
              </p>
              <br />
              <p class="text-sm font-medium">26.03.09 월요일</p>
              <p class="text-sm font-bold text-red-500 mt-1">
                1. 오늘 작업 각각 클릭해서 사진입력 가능.
              </p>
              <p class="text-sm text-muted-foreground mt-1">
                2. 공정표 작업 패스로 연결하면 기본적으로 따라다님.
              </p>
              <p class="text-sm font-bold text-red-500 mt-1">
                3. 대시보드 날씨 잘못 출력하는 버그 해결.
              </p>
              <p class="text-sm font-bold text-red-500 mt-1">
                4. 대시보드작업일보 -> 내일작업 / 다음 작업일 선택가능.
              </p>
              <p class="text-sm font-bold text-red-500 mt-1">5. 작업일보 생성가능!!!</p>
              <br />
              <p class="text-sm font-medium">26.02.27 금요일</p>
              <p class="text-sm text-muted-foreground mt-1">1. 자재반입검수요청서 생성가능.</p>
              <br />
              <p class="text-sm font-medium">26.02.20 금요일</p>
              <p class="text-sm text-muted-foreground mt-1">1. 출역 입력가능.</p>
              <p class="text-sm text-muted-foreground mt-1">2. 자재발주서 생성가능.</p>
              <br />
              <p class="text-sm font-medium">26.01.31 토요일</p>
              <p class="text-sm text-muted-foreground mt-1">1. 웹페이지 작업일보 구현.</p>
              <br />
              <p class="text-sm font-medium">26.01.28 수요일</p>
              <p class="text-sm text-muted-foreground mt-1">1. 작업으로 3d 오브젝트 필터링 가능.</p>
              <br />
            </div>
          </div>
        </AreaCard>

        <!-- AI 도우미 + 작업 평가 하단 행 -->
        <div class="dashboard-bottom-row">
          <!-- AI 도우미 영역 -->
          <AreaCard
            height="flex-none"
            min-height="auto"
            class="dashboard-bottom-item dashboard-order-3"
          >
            <h3 class="text-lg font-semibold">AI 도우미</h3>
            <div class="space-y-4 mt-4">
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
          <AreaCard
            height="flex-none"
            min-height="auto"
            class="dashboard-bottom-item dashboard-order-4"
          >
            <h3 class="text-lg font-semibold">작업 평가</h3>
            <div class="space-y-4 mt-4">
              <div class="border border-border rounded-lg p-3">
                <p class="text-sm font-medium text-orange-600 dark:text-orange-400">
                  ⚠️ 오늘 효율 저하
                </p>
                <p class="text-sm text-muted-foreground mt-1">
                  오늘은 출역인원 대비 작업량이 84% 밖에 되지 않습니다.
                </p>
              </div>
              <div class="border border-border rounded-lg p-3">
                <p class="text-sm font-medium text-green-600 dark:text-green-400">
                  ✓ 이번주 목표 초과 달성
                </p>
                <p class="text-sm text-muted-foreground mt-1">
                  이번주는 출역인원 대비 작업량이 110% 입니다.
                </p>
              </div>
              <div class="border border-border rounded-lg p-3">
                <p class="text-sm font-medium text-blue-600 dark:text-blue-400">
                  📊 철근콘크리트공사
                </p>
                <p class="text-sm text-muted-foreground mt-1">
                  이번달 철근공사 진척률이 계획 대비 105%로 순조롭습니다.
                </p>
              </div>
              <div class="border border-border rounded-lg p-3">
                <p class="text-sm font-medium text-red-600 dark:text-red-400">⚠️ 지연 주의</p>
                <p class="text-sm text-muted-foreground mt-1">
                  금속공사가 계획 대비 3일 지연되고 있습니다. 인원 보강을 검토하세요.
                </p>
              </div>
              <div class="border border-border rounded-lg p-3">
                <p class="text-sm font-medium text-purple-600 dark:text-purple-400">
                  📈 생산성 분석
                </p>
                <p class="text-sm text-muted-foreground mt-1">
                  형틀공 1인당 일일 평균 작업량: 12.5㎡ (업계 평균 대비 +15%)
                </p>
              </div>
            </div>
          </AreaCard>
        </div>
      </div>
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

    <DailyReportExcludeDialog
      :open="showExcludeDialog"
      :validate-result="validateResult"
      @confirm="confirmExcludeAndCreate"
      @cancel="showExcludeDialog = false"
    />
  </div>
</template>

<style scoped>
.dashboard-layout {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.dashboard-col-main {
  flex: 1 1 0;
  min-width: 0;
}

.dashboard-col-right {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dashboard-release-note {
  height: 400px;
  display: flex;
  flex-direction: column;
}

.dashboard-release-note :deep(::-webkit-scrollbar) {
  width: 6px;
}

.dashboard-release-note :deep(::-webkit-scrollbar-track) {
  background: transparent;
}

.dashboard-release-note :deep(::-webkit-scrollbar-thumb) {
  background: oklch(0.7 0 0 / 40%);
  border-radius: 3px;
}

.dashboard-release-note :deep(::-webkit-scrollbar-thumb:hover) {
  background: oklch(0.5 0 0 / 60%);
}

.dashboard-bottom-row {
  display: flex;
  gap: 1rem;
}

.dashboard-bottom-item {
  flex: 1 1 0;
  min-width: 0;
}

@media (max-aspect-ratio: 1/1) {
  .dashboard-layout {
    flex-direction: column;
  }

  .dashboard-col-main {
    width: 100%;
    flex: none;
  }

  .dashboard-col-right {
    width: 100%;
    flex: none;
    display: contents;
  }

  .dashboard-bottom-row {
    display: contents;
  }

  .dashboard-bottom-item,
  .dashboard-order-2 {
    width: 100%;
    flex: none;
  }

  .dashboard-order-1 {
    order: 1;
  }

  .dashboard-order-2 {
    order: 2;
  }

  .dashboard-order-3 {
    order: 3;
  }

  .dashboard-order-4 {
    order: 4;
  }
}
</style>
