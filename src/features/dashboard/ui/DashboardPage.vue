<script setup lang="ts">
import AreaCard from '@/shared/helper-ui/AreaCard.vue'
import { Button } from '@/shared/ui/button'
</script>

<template>
  <div class="flex-1 flex flex-col gap-4">
    <div class="dashboard-layout">
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
            <div class="border border-border rounded-lg p-3 h-full overflow-y-auto text-sm">
              <p>
                26.03.27 금요일<br />
                1. 로그인/회원가입 보안 강화 — 비밀번호가 암호화되어 전송됩니다. 로그인 5회 실패 시 일시 잠금됩니다.<br />
                2. 2D공정표 버전 관리 — 공정표 탭 우클릭으로 복제/삭제/주 공정표 지정이 가능합니다.<br />
                3. 2D공정표 작업/연결선 우클릭 메뉴 — 작업 ID 확인, 휴일 작업 전환, 따라가기 설정 및 지연일수 조정이 가능합니다.<br />
                4. 2D공정표 세부공종이 없는 공종도 빈 행으로 표시됩니다.<br />
                5. 대시보드 날짜 이동 — 날짜를 자유롭게 변경하여 다른 날의 작업을 확인할 수 있습니다.<br />
                6. 대시보드 작업 관리 — 작업 클릭 시 사진입력/가리기/삭제 메뉴가 제공됩니다. 공종 옆 +버튼으로 작업을 바로 생성할 수 있습니다.<br />
                7. 출역 누적 집계가 '유용한 기능' 메뉴로 이동했습니다. 대시보드에서 인력/장비 입력이 가능합니다.<br />
                8. 자재 반입 등록 팝업이 개선되었습니다.
              </p>
              <br />
              <p>
                26.03.20 목요일<br />
                1. 2D공정표에서 3주 공정표 / 3개월 공정표 엑셀 생성 기능 추가.<br />
                2. 공정표 생성 시 제외할 세부공종 선택 가능.<br />
                3. 2D공정표 확대/축소 버튼 및 공종/세부공종 그룹 기능 제거.
              </p>
              <br />
              <p>
                26.03.15 토요일<br />
                1. 사진 업로드 시 프리뷰 확인 및 회전/설명 입력 기능 추가.<br />
                2. 홈페이지 작업일보 생성/수정 지원.<br />
                3. 작업일보 영역 글자크기 1.5배 확대.<br />
                4. 자재반입 송장/사진 업로드 시 이미지 회전 프리뷰 추가.<br />
                5. MIR 문서번호 수정 기능 추가.<br />
                6. 반입자재 목록에 MIR 문서번호 표시.
              </p>
              <br />
              <p>
                26.03.13 금요일<br />
                1. 공종편집할수있는 위치를 공정표 코너 셀에 추가.<br />
                2. 캘린더 작동방식수정<br />
                3. 캘린더 휴일/비활성일 변경시 작업 갱신 안되는 오류 수정<br />
              </p>
              <br />
              <p>
                26.03.12 목요일<br />
                1. 2D공정표 작동방식 대규모 수정.<br />
                2. 작업 오른쪽클릭 -> 메뉴 기반으로 행동선택<br />
                3. 작업일보 엑셀 -> 공종간 간격 추가됨<br />
                4. 작업일보 엑셀 -> 관리자페이지에서 정렬순서 바꾸면 즉시 반영<br />
                5. 각 생성/수정 팝업에서 기준정보 바로 수정가능.
              </p>
              <br />
              <p>
                26.03.11 수요일<br />
                1. 2D공정표 작동방식 대규모 수정.<br />
                2. 작업모드, 패스모드 구분이 없어짐<br />
                3. 작업, 패스 수정은 오른쪽버튼 클릭으로 변경<br />
                4. 작업을 선택하면 날짜조정, 선택하지 않으면 새로운 패스 생성<br />
                5. 패스를 선택하고 연결하면 패스에 작업추가<br />
                6. 구간, 용도 개념 제거. 구역 / 층 만 입력합니다.<br />
                7. 원하는 세부공종 위치에 더블클릭하면 해당 세부공종 작업 생성합니다.
              </p>
              <br />
              <p>
                26.03.09 월요일<br />
                1. 오늘 작업 각각 클릭해서 사진입력 가능.<br />
                2. 공정표 작업 패스로 연결하면 기본적으로 따라다님.<br />
                3. 대시보드 날씨 잘못 출력하는 버그 해결.<br />
                4. 대시보드작업일보 -> 내일작업 / 다음 작업일 선택가능.<br />
                5. 작업일보 생성가능!!!
              </p>
              <br />
              <p>
                26.02.27 금요일<br />
                1. 자재반입검수요청서 생성가능.
              </p>
              <br />
              <p>
                26.02.20 금요일<br />
                1. 출역 입력가능.<br />
                2. 자재발주서 생성가능.
              </p>
              <br />
              <p>
                26.01.31 토요일<br />
                1. 웹페이지 작업일보 구현.
              </p>
              <br />
              <p>
                26.01.28 수요일<br />
                1. 작업으로 3d 오브젝트 필터링 가능.
              </p>
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
                <p class="text-sm font-medium text-orange-600">
                  ⚠️ 오늘 효율 저하
                </p>
                <p class="text-sm text-muted-foreground mt-1">
                  오늘은 출역인원 대비 작업량이 84% 밖에 되지 않습니다.
                </p>
              </div>
              <div class="border border-border rounded-lg p-3">
                <p class="text-sm font-medium text-green-600">
                  ✓ 이번주 목표 초과 달성
                </p>
                <p class="text-sm text-muted-foreground mt-1">
                  이번주는 출역인원 대비 작업량이 110% 입니다.
                </p>
              </div>
              <div class="border border-border rounded-lg p-3">
                <p class="text-sm font-medium text-blue-600">
                  📊 철근콘크리트공사
                </p>
                <p class="text-sm text-muted-foreground mt-1">
                  이번달 철근공사 진척률이 계획 대비 105%로 순조롭습니다.
                </p>
              </div>
              <div class="border border-border rounded-lg p-3">
                <p class="text-sm font-medium text-red-600">⚠️ 지연 주의</p>
                <p class="text-sm text-muted-foreground mt-1">
                  금속공사가 계획 대비 3일 지연되고 있습니다. 인원 보강을 검토하세요.
                </p>
              </div>
              <div class="border border-border rounded-lg p-3">
                <p class="text-sm font-medium text-purple-600">
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
