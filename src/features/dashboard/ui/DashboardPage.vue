<script setup lang="ts">
import { useRouter } from 'vue-router'
import AreaCard from '@/shared/helper-ui/AreaCard.vue'
import { Button } from '@/shared/ui/button'
import WorkPhotoDialog from '@/features/dashboard/ui/components/WorkPhotoDialog.vue'
import { useDashboardPage } from '@/features/dashboard/view-model/useDashboardPage'

const router = useRouter()
const {
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
} = useDashboardPage()
</script>

<template>
  <div class="flex-1 flex flex-col gap-4">
    <div class="dashboard-layout">
      <!-- 오늘작업 영역 -->
      <AreaCard height="flex-none" min-height="auto" class="dashboard-col-main">
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
      <AreaCard height="flex-none" min-height="auto" class="dashboard-col-side">
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
      <AreaCard height="flex-none" min-height="auto" class="dashboard-col-side">
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

<style scoped>
.dashboard-layout {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.dashboard-col-main {
  width: 50%;
}

.dashboard-col-side {
  width: 25%;
}

@media (max-aspect-ratio: 1/1) {
  .dashboard-layout {
    flex-direction: column;
  }

  .dashboard-col-main,
  .dashboard-col-side {
    width: 100%;
  }
}
</style>
