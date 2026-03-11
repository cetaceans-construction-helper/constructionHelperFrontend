# 2D Schedule Rebuild Plan

작성일: 2026-03-11

## 1. 목표

- Instagantt / Excel 스타일의 좌측 Y-axis 패널과 우측 차트 영역으로 2D 공정표를 재구성한다.
- 상위 공정 / 하위 공정 계층을 도입하고, 모든 일정 element는 하위 공정 row에 귀속되도록 바꾼다.
- 현재의 `작업관리 / 패스관리` 이원화 UX를, `선택 / 편집 / 우클릭 상세 조작` 중심의 표준 Gantt UX로 전환한다.
- 패스의 의미를 `dependency`와 `critical highlight`로 분리하고, 그룹 / 마일스톤을 새 도메인으로 추가한다.

## 2. 현재 코드 기준 진단

- 현재 2D 공정표는 [`src/features/schedule/schedule-2d/ui/components/Viewer2dArea.vue`](/Users/leo/Desktop/fun/programming/constructionHelperFrontend/src/features/schedule/schedule-2d/ui/components/Viewer2dArea.vue) 단일 컴포넌트에 로딩, 렌더링, 편집, 패스관리, 그룹 오버레이가 집중되어 있다.
- 렌더러는 `VueFlow` 기반이라 `node/edge 편집기` 성격이 강하고, 사용자가 원하는 `행 기반 Gantt + 좌측 트리` UX와 구조적으로 어긋난다.
- 현재 저장 계약은 [`workApi`](/Users/leo/Desktop/fun/programming/constructionHelperFrontend/src/shared/network-core/apis/work.ts), [`workPathApi`](/Users/leo/Desktop/fun/programming/constructionHelperFrontend/src/shared/network-core/apis/workPath.ts) 기준의 `work` / `path`만 존재한다.
- 현재의 그룹 기능은 `workType` / `subWorkType` 오버레이 수준이며, 실제 계층 row, 중첩 그룹, 마일스톤, 별도 dependency 엔티티는 없다.

## 3. 재구성 원칙

- `Viewer2dArea.vue`를 점진 보수하지 않고, [`src/features/schedule/schedule-2d-rebuild`](/Users/leo/Desktop/fun/programming/constructionHelperFrontend/src/features/schedule/schedule-2d-rebuild) 를 새 sub-feature로 만들어 그 안에서 새 Gantt 셸과 새 내부 도메인 모델을 먼저 구현한 뒤 기존 route를 교체한다.
- 기존 [`src/features/schedule/schedule-2d`](/Users/leo/Desktop/fun/programming/constructionHelperFrontend/src/features/schedule/schedule-2d) 는 전환 완료 전까지 유지하고, 최종 배치에서 정리한다.
- 1차 구현은 기존 API를 읽어오는 adapter를 두고 시작하되, 상위/하위 공정, 그룹, 마일스톤, critical highlight는 신규 계약이 필요하다는 점을 명시적으로 분리한다.
- 각 배치는 커밋 가능한 단위로 유지하고, `/helper/schedule/2d` 진입 자체는 항상 가능한 상태를 유지한다.
- 공통 검증 기준은 기본적으로 `npm run type-check`, `npm run build`, 그리고 배치별 수동 시나리오 확인으로 잡는다.

## 3.1 코드 작성 가이드라인

- 이번 리빌드는 `feature based clean architecture` 형식으로 작성한다.
- 신규 코드는 [`src/features/schedule/schedule-2d-rebuild`](/Users/leo/Desktop/fun/programming/constructionHelperFrontend/src/features/schedule/schedule-2d-rebuild) 아래의 `ui / view-model / use-cases / model / infra / public.ts` 구조로 작성한다.
- `schedule`는 wrapper, `schedule-2d-rebuild`는 독립 sub-feature로 취급한다. 기존 `schedule-2d`와 구현 파일을 섞지 않는다.
- 계층 의존 방향은 `ui -> view-model -> use-cases -> model/infra` 단방향을 기본으로 한다.
- `ui`
  - 렌더링, 이벤트 바인딩, 컴포넌트 조합만 담당한다.
  - API 호출, DTO 매핑, 핵심 일정 계산 로직을 넣지 않는다.
- `view-model`
  - 선택 상태, 스크롤 동기화 상태, 컨텍스트 메뉴 상태, 다이얼로그 상태처럼 화면 지향 상태를 담당한다.
  - 도메인 규칙 자체를 정의하지 않고 `use-cases`를 호출해 orchestration만 수행한다.
- `use-cases`
  - row tree 구성, bar 배치 계산, selection/move/resize/group/dependency/milestone 같은 시나리오 흐름을 담당한다.
  - 현재 리빌드에서는 마이크로 모듈로 쪼개지 않고 `schedule-service.ts` 단일 파일로 유지한다.
  - 파일이 과도하게 비대해진다는 근거가 생기기 전까지 `buildX`, `loadX`, `validateX` 식의 use-case 파일 분할은 하지 않는다.
  - Vue 컴포넌트, DOM, router, axios에 직접 의존하지 않는다.
- `model`
  - `ScheduleRow`, `ScheduleItem`, `Dependency`, `Group`, `Milestone` 같은 도메인 타입과 검증 규칙을 둔다.
  - 서버 DTO나 화면 좌표계 구현 세부사항을 직접 들고 있지 않는다.
- `infra`
  - 기존 `workApi`, `workPathApi`와의 연동, DTO adapter, repository 구현을 담당한다.
  - 화면 상태나 사용자 메시지 결정을 하지 않는다.
- feature 외부에서 `schedule-2d-rebuild` 내부 파일을 직접 import하지 않고, 반드시 [`src/features/schedule/schedule-2d-rebuild/public.ts`](/Users/leo/Desktop/fun/programming/constructionHelperFrontend/src/features/schedule/schedule-2d-rebuild/public.ts)를 경유한다.
- `shared/*` 승격은 2개 이상 feature에서 재사용되고 도메인 중립성이 확인된 경우에만 허용한다.
- 세부 규칙은 [`docs/FEATURE_CREATION_AND_MAINTENANCE_GUIDE.md`](/Users/leo/Desktop/fun/programming/constructionHelperFrontend/docs/FEATURE_CREATION_AND_MAINTENANCE_GUIDE.md)를 따른다.

## 4. 커밋 배치

### [x] Batch 1. Schedule v2 도메인 모델 + API adapter 도입

- 범위
  - `schedule-2d-rebuild` feature 골격(`ui / view-model / use-cases / model / infra / public.ts`)을 먼저 만든다.
  - `use-cases` 레이어는 `schedule-service.ts` 단일 서비스 파일로 시작한다.
  - `row tree`, `schedule item`, `dependency`, `group`, `milestone`, `selection/context menu state`를 담는 내부 타입을 새로 정의한다.
  - 기존 `WorkResponse`, `PathResponse`를 새 내부 모델로 변환하는 adapter를 만든다.
  - 백엔드 계약이 아직 없는 동안 상위/하위 공정은 임시로 `workType / subWorkType` 또는 별도 mock row metadata로 매핑한다.
- 완료 기준
  - [x] `schedule-2d-rebuild` feature 골격과 `public.ts`가 생성된다.
  - [x] `use-cases`는 단일 `schedule-service.ts`로 정리된다.
  - [x] 새 렌더러는 `WorkResponse` / `PathResponse`를 직접 읽지 않고 adapter 결과만 사용한다.
  - [x] 기존 데이터만으로도 row tree와 bar 목록을 만들 수 있다.
  - [x] 신규 개념 중 저장 불가능한 항목은 `pending contract`로 코드상 분리된다.
- 검증
  - [x] `npm run type-check`
  - [x] `npm run build`
  - [x] work 수와 bar 수, 기존 path 수와 dependency 수가 adapter 결과에서 일치한다.

### [x] Batch 2. VueFlow 의존 제거 + 좌측 패널/우측 차트 셸 구축

- 범위
  - `VueFlow` 중심 렌더링을 벗어나 좌측 row panel, 상단 time header, 우측 chart canvas를 가진 새 레이아웃을 만든다.
  - 좌측 패널의 세로 스크롤과 우측 차트의 세로 스크롤을 동기화한다.
  - 상단 헤더의 가로 스크롤과 차트 body의 가로 스크롤을 동기화한다.
  - `/helper/schedule/2d` route가 새 `schedule-2d-rebuild` 읽기 전용 셸을 렌더링하게 연결한다.
  - Export 대응을 위해 좌측 row panel이 실제 DOM 구조로 유지되게 만든다.
- 완료 기준
  - [x] 좌측 패널에 공정 / 세부공정 row가 표시된다.
  - [x] 헤더, 좌측 패널, 차트 body가 서로 스크롤 기준을 공유한다.
  - [x] 기존 route에서 읽기 전용 Gantt가 깨지지 않고 렌더링된다.
- 검증
  - [x] `npm run type-check`
  - [x] `npm run build`
  - [x] 좌측 row와 우측 막대의 세로 정렬이 유지된다.
  - [x] 브라우저 확대/축소와 관계없이 header/body/left panel이 어긋나지 않는다.

### [ ] Batch 3. 상호작용 재설계: 선택, 패닝, 스크롤, 좌클릭 편집

- 범위
  - 기본 드래그를 `marquee multi-select`로 바꾼다.
  - `Space + drag`일 때만 패닝되도록 바꾼다.
  - 휠은 줌이 아니라 기본 세로 페이지 스크롤로 바꾼다.
  - 좌클릭/드래그로 bar 이동, 리사이즈, row 재배치를 처리한다.
  - 현재의 `작업관리 / 패스관리` 모드 전환 UI는 제거하거나 보조 상태로 축소한다.
- 완료 기준
  - [ ] 기본 드래그 시 영역 선택이 동작한다.
  - [ ] 스페이스를 누른 상태에서만 캔버스 패닝이 가능하다.
  - [ ] 휠 스크롤이 줌이 아니라 세로 스크롤로 동작한다.
  - [ ] 좌클릭 기반 수정이 기존 빠른 편집보다 불안정하지 않다.
- 검증
  - [ ] `npm run type-check`
  - [ ] `npm run build`
  - [ ] 다중 선택, 단일 bar 이동, 좌우 리사이즈, row 이동이 각각 동작한다.
  - [ ] 브라우저 기본 드래그/선택과 충돌하지 않는다.

### [ ] Batch 4. 상위 공정 / 하위 공정 row tree와 배치 규칙 도입

- 범위
  - 상위 공정, 하위 공정, 접기/펼치기, row 정렬 순서를 관리하는 tree 모델을 붙인다.
  - 모든 일정 element는 하위 공정 row에만 배치하고, 상위 공정 row는 요약/집계 row로 동작하게 만든다.
  - 상위 공정 row에는 자식 일정 범위를 집계한 summary bar 또는 summary chip을 렌더링한다.
  - 하위 공정 생성 시 상위 공정의 기본 속성(공종, 색상, 기본 기간, 기본 dependency 규칙 등)을 상속할 수 있게 설계한다.
- 완료 기준
  - [ ] 상위 공정과 하위 공정을 추가/표시할 수 있다.
  - [ ] element를 상위 row에 직접 놓을 수 없고 하위 row에만 귀속된다.
  - [ ] 상위 row를 접으면 하위 row는 숨겨지고 요약 표현만 남는다.
- 검증
  - [ ] `npm run type-check`
  - [ ] `npm run build`
  - [ ] 상위 row 접기/펼치기 후에도 세로 정렬과 bar 위치가 유지된다.
  - [ ] 하위 row 이동/수정이 상위 row summary에 즉시 반영된다.

### [ ] Batch 5. 우클릭 컨텍스트 메뉴와 명령 체계 도입

- 범위
  - bar, row, 빈 공간 각각에 대한 우클릭 메뉴를 만든다.
  - 삭제, dependency 추가/제거, group 생성/해제, row 생성, milestone 생성 후보 등의 명령을 여기로 모은다.
  - 브라우저 기본 context menu를 대체하고, 선택 상태와 연결된 명령 enable/disable 규칙을 만든다.
- 완료 기준
  - [ ] bar 우클릭과 row 우클릭 메뉴가 구분된다.
  - [ ] 삭제 / dependency / group 명령이 우클릭 메뉴에서 실행된다.
  - [ ] 다중 선택 상태에서 허용되는 메뉴만 노출된다.
- 검증
  - [ ] `npm run type-check`
  - [ ] `npm run build`
  - [ ] macOS trackpad, 일반 마우스 기준 모두 우클릭 메뉴가 열린다.
  - [ ] 빈 공간 우클릭 시 잘못된 삭제/수정 명령이 노출되지 않는다.

### [ ] Batch 6. dependency 모델 분리 + critical path 하이라이트 전용 레이어

- 범위
  - 기존 `path`가 갖고 있던 `sequence + follow-gap + critical` 의미를 분리한다.
  - dependency는 일정 계산용 연결로 유지하고, critical path는 가독성 하이라이트 전용 레이어로 바꾼다.
  - critical path는 예시처럼 붉은 선 또는 강조 bar 스타일로 표시한다.
  - 현재 `lagDays`/따라가기 규칙은 dependency 편집 UI로 옮긴다.
- 완료 기준
  - [ ] dependency와 critical highlight가 서로 독립적으로 관리된다.
  - [ ] critical highlight를 꺼도 dependency 계산은 유지된다.
  - [ ] 사용자는 핵심 path를 시각적으로 빠르게 구분할 수 있다.
- 검증
  - [ ] `npm run type-check`
  - [ ] `npm run build`
  - [ ] 같은 dependency 집합에서 critical highlight on/off만 바꿔도 일정 데이터는 변하지 않는다.
  - [ ] dependency 편집 후 일정 당김/밀기가 이전 규칙과 동일하거나 더 예측 가능하게 동작한다.

### [ ] Batch 7. 중첩 가능한 그룹 엔진 도입

- 범위
  - 선택된 bar들을 하나의 group으로 묶고, group 안에 group을 넣을 수 있게 만든다.
  - group 이동 시 내부 bar 간 상대 거리와 dependency 관계를 보존한다.
  - 밀면 함께 밀리고, 당기면 함께 당겨지는 `덩어리 이동` 규칙을 구현한다.
  - 그룹 선택, 해제, 이름 부여, nested group 해체 순서를 정의한다.
- 완료 기준
  - [ ] 그룹 이동 시 내부 일정 간 간격이 유지된다.
  - [ ] 중첩 그룹이 부모/자식 순서대로 안정적으로 이동한다.
  - [ ] dependency가 있는 bar를 group으로 묶어도 데이터가 깨지지 않는다.
- 검증
  - [ ] `npm run type-check`
  - [ ] `npm run build`
  - [ ] 2단계 nested group 생성 후 부모 group 이동이 동작한다.
  - [ ] group 해제 후 각 bar가 원래 dependency를 유지한다.

### [ ] Batch 8. 마일스톤 표시 레이어 추가

- 범위
  - 마일스톤을 휴일 표시와 유사한 `세로 기준선 / 마커 / 라벨` 레이어로 추가한다.
  - 1차는 표시 중심으로 구현하고, 일정 계산 영향은 넣지 않는다.
  - row panel과 chart 양쪽에서 마일스톤 식별이 가능하도록 만든다.
- 완료 기준
  - [ ] 특정 날짜에 마일스톤 마커를 표시할 수 있다.
  - [ ] 마일스톤은 일반 bar와 구분되는 시각 규칙을 가진다.
  - [ ] 마일스톤 추가/삭제는 다른 일정 계산을 망가뜨리지 않는다.
- 검증
  - [ ] `npm run type-check`
  - [ ] `npm run build`
  - [ ] 휴일/비활성일/오늘 표시와 겹쳐도 마일스톤 식별이 가능하다.

### [ ] Batch 9. 마이그레이션 정리, 분석 이벤트 보강, QA 시나리오 고정

- 범위
  - 이미 전환된 `schedule-2d-rebuild` route 기준으로 구형 `schedule-2d` 전용 상태와 dead code를 정리한다.
  - analytics 이벤트를 새 UX 기준으로 정리한다.
  - 핵심 수동 QA 시나리오와 회귀 테스트 포인트를 문서화한다.
  - Export 대응에 필요한 DOM/print 구조가 유지되는지 최종 점검한다.
- 완료 기준
  - [ ] 구형 모드 전환 UI와 중복 로직이 제거된다.
  - [ ] 새 기능 기준의 액션 추적 포인트가 정리된다.
  - [ ] 테스트/문서 없이 남는 핵심 동작이 없게 정리된다.
- 검증
  - [ ] `npm run type-check`
  - [ ] `npm run build`
  - [ ] 수동 QA 시나리오 문서가 추가된다.
  - [ ] 구형 코드 제거 후 route 동작이 유지된다.

## 5. 병행 계약 작업

### [ ] Contract A. 상위/하위 공정 저장 계약 정의

- 필요 필드 후보
  - `processId`
  - `parentProcessId`
  - `rowOrder`
  - `collapsed`
  - `defaultChildTemplate`
- 확인 포인트
  - [ ] 상위 공정만 먼저 생성 가능한지
  - [ ] 하위 공정 없는 상위 공정을 허용할지
  - [ ] 기존 `workType/subWorkType`와 신규 공정 계층을 분리할지

### [ ] Contract B. dependency / critical / group / milestone 분리 저장

- 필요 필드 후보
  - `dependencyId`, `sourceItemId`, `targetItemId`, `lagDays`
  - `criticalChainId` 또는 `critical: boolean`
  - `groupId`, `parentGroupId`, `memberIds`
  - `milestoneId`, `date`, `label`, `color`
- 확인 포인트
  - [ ] critical을 계산 결과로 둘지 수동 지정 가능하게 둘지
  - [ ] group 저장 단위를 row 기준으로도 허용할지
  - [ ] milestone을 프로젝트 공통 레이어로 둘지 row 귀속으로 둘지

## 6. 토의가 필요한 결정사항

1. 상위 공정은 "진짜 연간 스케일 row"로 갈지, 아니면 1차는 동일 타임라인 위의 summary row로 갈지 결정이 필요하다.
   - 현재 코드와 브라우저 성능을 기준으로 보면 1차는 `공통 타임라인 + 상위 row 요약 표현`이 가장 안전하다.
   - row별로 수평 스케일이 달라지는 진짜 mixed-scale renderer는 별도 배치로 빼는 편이 맞다.

2. 상위/하위 공정이 `공종/세부공종`과 같은 개념인지, 아니면 전혀 별도의 일정 구조인지 결정이 필요하다.
   - 현재 데이터는 `workType/subWorkType`만 있으므로, 별도 개념이면 백엔드 계약이 선행되어야 한다.

3. 마일스톤은 1차에서 `표시만` 할지, 우클릭으로 생성/삭제까지 포함할지 결정이 필요하다.
   - 이 계획서는 우선 `표시 중심 + 기본 생성/삭제` 수준을 상정했다.

4. 그룹 이동이 dependency를 자동 재계산해야 하는지, 아니면 내부 상대거리만 보존하고 외부 dependency는 충돌 경고만 줄지 결정이 필요하다.
   - 이 규칙이 정해져야 그룹 엔진과 dependency 엔진의 우선순위를 안정적으로 설계할 수 있다.
