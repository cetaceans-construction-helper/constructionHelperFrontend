# TODO - Mobile 3D Refactoring Backlog (Post-Pilot)

## 배경
- 현재 목표는 모바일 3D 화면의 빠른 검증(파일럿)이다.
- 협업 프로젝트 특성상, 대규모 구조 리팩토링은 현재 시점에서 리스크가 크다.
- 따라서 Gate 2(공용 코어 추출)는 **파일럿 이후**로 이관한다.

## 리팩토링 범위 (후속)

### 1. Schedule3d 오케스트레이션 공용화
- [ ] `Schedule3dPage.vue`의 로딩/선택/이벤트 오케스트레이션을 `useSchedule3dCore`로 추출
- [ ] 공용 상태 타입 정리 (`selectedObject3d`, `selectedObject3dIds`, `selectedTasks`, `isLoadingTasks`)
- [ ] 페이지는 UI 조합만 담당하도록 역할 축소

### 2. API 호출 위치 정리
- [ ] `Viewer3dArea.vue` 내부 직접 API 호출(`taskApi`, `materialOrderApi`, `referenceApi`) 제거
- [ ] 액션 로직은 composable/service 계층으로 이동
- [ ] UI 컴포넌트는 이벤트 emit + 상태 표시만 담당

### 3. 모바일/PC 공용 이벤트 계약 정리
- [ ] `Viewer3dArea`와 모바일 전용 뷰의 공통 emit 계약 정의
- [ ] 회전/선택/작업상태변경/미니맵 이동 이벤트를 표준화
- [ ] 이벤트 payload 타입 파일 분리 (`types/schedule3d.ts` 등)

### 4. 엔진 제어 계층 단순화
- [ ] `useEngine` + `useDailyReport` + 페이지 watch 분산 로직을 코어 composable로 통합
- [ ] 엔진 업데이트(visibility/emphasis) 트리거 지점을 단일화
- [ ] 언마운트/정리(cleanup) 책임 경계 재점검

### 5. 테스트 보강
- [ ] 최소 단위 테스트: 코어 composable 상태 전이 테스트
- [ ] 회귀 테스트: 선택 → task 조회 → 상태 반영 플로우
- [ ] 모바일 라우트 스모크 테스트 추가

## 완료 기준 (리팩토링 착수 시)
- [ ] PC 기능 회귀 없음
- [ ] 모바일 기능 회귀 없음
- [ ] UI 컴포넌트의 API 직접 호출 제거 완료
- [ ] 공용 코어를 PC/모바일 모두에서 사용
