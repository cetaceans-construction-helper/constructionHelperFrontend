# 2D Schedule Rebuild Plan

작성일: 2026-03-11

## 1. 목표

- Instagantt / Excel 스타일의 좌측 Y-axis 패널과 우측 차트 영역으로 2D 공정표를 재구성한다.
- 상위 공정 / 하위 공정 계층을 도입하고, 모든 일정 element는 하위 공정 row에 귀속되도록 바꾼다.
- 현재의 `작업관리 / 패스관리` 이원화 UX를, `선택 / 편집 / 우클릭 상세 조작` 중심의 표준 Gantt UX로 전환한다.
- 기존 `path`에 섞여 있는 `critical path highlight`, `dependency`, `link(gap 일수 고정 관계)`를 서로 독립된 도메인으로 분리하고, 마일스톤을 새 도메인으로 추가한다.

## 2. 현재 코드 기준 진단

- 현재 2D 공정표는 [`src/features/schedule/schedule-2d/ui/components/Viewer2dArea.vue`](/Users/leo/Desktop/fun/programming/constructionHelperFrontend/src/features/schedule/schedule-2d/ui/components/Viewer2dArea.vue) 단일 컴포넌트에 로딩, 렌더링, 편집, 패스관리, 각종 오버레이가 집중되어 있다.
- 렌더러는 `VueFlow` 기반이라 `node/edge 편집기` 성격이 강하고, 사용자가 원하는 `행 기반 Gantt + 좌측 트리` UX와 구조적으로 어긋난다.
- 현재 저장 계약은 [`workApi`](/Users/leo/Desktop/fun/programming/constructionHelperFrontend/src/shared/network-core/apis/work.ts), [`workPathApi`](/Users/leo/Desktop/fun/programming/constructionHelperFrontend/src/shared/network-core/apis/workPath.ts) 기준의 `work` / `path`만 존재한다.
- 현재 `path` 하나에 `핵심 경로 표시`, `선후행 관계`, `강한 gap 일수 관계`가 혼합되어 있어, 편집 UX와 계산 규칙을 분리하기 어렵다.
- 현재 구조는 `workType` / `subWorkType` 오버레이 수준이라 실제 계층 row, 마일스톤, 별도 dependency 엔티티는 없다.

## 3. 재구성 원칙

- `Viewer2dArea.vue`를 점진 보수하지 않고, [`src/features/schedule/schedule-2d-rebuild`](/Users/leo/Desktop/fun/programming/constructionHelperFrontend/src/features/schedule/schedule-2d-rebuild) 를 새 sub-feature로 만들어 그 안에서 새 Gantt 셸과 새 내부 도메인 모델을 먼저 구현한 뒤 기존 route를 교체한다.
- 기존 [`src/features/schedule/schedule-2d`](/Users/leo/Desktop/fun/programming/constructionHelperFrontend/src/features/schedule/schedule-2d) 는 전환 완료 전까지 유지하고, 최종 배치에서 정리한다.
- 1차 구현은 기존 API를 읽어오는 adapter를 두고 시작하되, 상위/하위 공정, 마일스톤, dependency / link / critical path 분리 저장은 신규 계약이 필요하다는 점을 명시적으로 분리한다.
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
  - row tree 구성, bar 배치 계산, selection/move/resize/dependency/milestone 같은 시나리오 흐름을 담당한다.
  - 현재 리빌드에서는 마이크로 모듈로 쪼개지 않고 `schedule-service.ts` 단일 파일로 유지한다.
  - 파일이 과도하게 비대해진다는 근거가 생기기 전까지 `buildX`, `loadX`, `validateX` 식의 use-case 파일 분할은 하지 않는다.
  - Vue 컴포넌트, DOM, router, axios에 직접 의존하지 않는다.
- `model`
  - `ScheduleRow`, `ScheduleItem`, `Dependency`, `Milestone` 같은 도메인 타입과 검증 규칙을 둔다.
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
  - `row tree`, `schedule item`, `dependency`, `milestone`, `selection/context menu state`를 담는 내부 타입을 새로 정의한다.
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

### [x] Batch 3. 상호작용 재설계: 선택, 패닝, 스크롤, 좌클릭 편집

- 범위
  - 기본 드래그를 `marquee multi-select`로 바꾼다.
  - `Space + drag`일 때만 패닝되도록 바꾼다.
  - 휠은 줌이 아니라 기본 세로 페이지 스크롤로 바꾼다.
  - 좌클릭/드래그로 bar 이동, 리사이즈, row 재배치를 처리한다.
  - 이 배치는 우선 로컬 draft 상태 편집으로 조작 UX를 검증한다.
  - 현재의 `작업관리 / 패스관리` 모드 전환 UI는 제거하거나 보조 상태로 축소한다.
- 완료 기준
  - [x] 기본 드래그 시 영역 선택이 동작한다.
  - [x] 스페이스를 누른 상태에서만 캔버스 패닝이 가능하다.
  - [x] 휠 스크롤이 줌이 아니라 세로 스크롤로 동작한다.
  - [x] 좌클릭 기반 수정이 기존 빠른 편집보다 불안정하지 않다.
- 검증
  - [x] `npm run type-check`
  - [x] `npm run build`
  - [x] 다중 선택, 단일 bar 이동, 좌우 리사이즈, row 이동이 각각 동작한다.
  - [x] 브라우저 기본 드래그/선택과 충돌하지 않는다.

### [x] Batch 4. 상위 공정 / 하위 공정 row tree와 배치 규칙 도입

- 범위
  - 상위 공정, 하위 공정, 접기/펼치기, row 정렬 순서를 관리하는 tree 모델을 붙인다.
  - 모든 일정 element는 하위 공정 row에만 배치하고, 상위 공정 row는 요약/집계 row로 동작하게 만든다.
  - 상위 공정 row에는 자식 일정 범위를 집계한 summary bar 또는 summary chip을 렌더링한다.
  - 하위 공정 생성 시 상위 공정의 기본 속성(공종, 색상, 기본 기간, 기본 dependency 규칙 등)을 상속할 수 있게 설계한다.
- 완료 기준
  - [x] 상위 공정과 하위 공정을 추가/표시할 수 있다.
  - [x] element를 상위 row에 직접 놓을 수 없고 하위 row에만 귀속된다.
  - [x] 상위 row를 접으면 하위 row는 숨겨지고 요약 표현만 남는다.
- 검증
  - [x] `npm run type-check`
  - [x] `npm run build`
  - [x] 상위 row 접기/펼치기 후에도 세로 정렬과 bar 위치가 유지된다.
  - [x] 하위 row 이동/수정이 상위 row summary에 즉시 반영된다.

### [ ] Batch 5. 우클릭 컨텍스트 메뉴와 명령 체계 도입

- 범위
  - bar, row, 빈 공간 각각에 대한 우클릭 메뉴를 만든다.
  - 빈 chart 셀 우클릭은 `작업 생성`만 노출하고, 상위 공정 우클릭은 `색상 변경 / 속성 변경`만 노출한다.
  - 하위 공정 bar 우클릭은 `dependency 생성/제거`, `link 생성/제거`, `색상 변경`, `속성 변경`만 노출한다.
  - 1차는 저장 API 연결 전이므로 dependency / link / 작업 생성은 로컬 draft 명령으로 검증한다.
  - 브라우저 기본 context menu를 대체하고, 선택 상태와 연결된 명령 enable/disable 규칙을 만든다.
- 완료 기준
  - [x] bar 우클릭과 row 우클릭 메뉴가 구분된다.
  - [x] 작업 생성 / dependency / link / 색상 / 속성 명령이 우클릭 메뉴에서 실행된다.
  - [x] 다중 선택 상태에서 허용되는 메뉴만 노출된다.
- 검증
  - [x] `npm run type-check`
  - [x] `npm run build`
  - [ ] macOS trackpad, 일반 마우스 기준 모두 우클릭 메뉴가 열린다.
  - [x] 빈 공간 우클릭 시 잘못된 삭제/수정 명령이 노출되지 않는다.

### [ ] Batch 6. 줌인/줌아웃 + path 3분할(`critical path` / `dependency` / `link`)

- 범위
  - timeline day width를 단계적으로 바꿀 수 있는 `줌인 / 줌아웃` UI를 추가한다.
  - 줌 변경 후에도 좌측 row panel, 상단 header, 우측 chart body의 정렬과 현재 포커스 위치가 크게 어긋나지 않게 유지한다.
  - 기존 `path`가 갖고 있던 `critical path 연결 정보 + 선후관계 + 강한 gap 일수 관계`를 `critical path`, `dependency`, `link` 세 개의 독립 개념으로 분리한다.
  - `dependency`는 1차에서 `finish-to-start` 기준의 선후관계만 표현한다.
  - `dependency`는 앞 작업이 뒤로 밀려 제약을 깨뜨릴 때만 뒤 작업을 따라 밀고, 뒤 작업을 움직여도 앞 작업은 움직이지 않는 단방향 규칙으로 구현한다.
  - `link`는 두 작업 사이의 `gapDays`를 강하게 보존하는 양방향 관계로 구현한다.
  - `link`로 연결된 작업은 앞/뒤 어느 쪽을 움직여도 지정된 간격을 유지한 채 연결된 집합이 함께 움직인다.
  - `critical path`는 일정 계산 규칙이 아니라, 기존 `dependency` 체인 위에 얹는 핵심 흐름 레이어로 구현한다.
  - 여러 bar를 잇는 기본 표현은 `선행 bar의 끝 -> 후행 bar의 시작`을 잇는 pair edge의 연속 표시로 통일한다.
  - `critical path`에 포함된 bar는 연결선과 같은 강조색의 outline 또는 glow를 함께 적용해, 사용자가 `선 + bar`를 하나의 흐름으로 읽게 만든다.
  - 1차에서는 bar 우클릭 -> 다음 bar 좌클릭을 반복하는 방식으로 `critical path`를 연속 생성할 수 있게 하고, 선 우클릭으로 개별 제거 또는 선택 chain 전체 제거를 지원한다.
  - `critical path`는 붉은 실선 계열로 표시하고, `dependency`와 `link`는 서로 다른 선 스타일/색/마커 체계로 즉시 구분 가능하게 만든다.
  - `dependency` 선, `link` 선, `critical path` 선은 동시에 켜져도 의미가 섞여 보이지 않도록 레이어 우선순위와 스타일 규칙을 따로 정의한다.
- 완료 기준
  - [x] 사용자는 차트 스케일을 명시적으로 확대/축소할 수 있다.
  - [x] 줌 변경 후에도 row/bar/header 정렬이 유지된다.
  - [x] `dependency`, `link`, `critical path`가 서로 독립적으로 관리된다.
  - [x] `dependency`는 앞 작업 지연 시에만 뒤 작업을 단방향으로 따라 밀고, 역방향 전파는 하지 않는다.
  - [x] `link`는 어느 한쪽 작업을 움직여도 `gapDays`를 유지한 채 연결된 작업 집합이 함께 이동한다.
  - [x] `critical path`를 꺼도 `dependency` / `link` 계산은 유지된다.
  - [x] 사용자는 세 관계를 시각적으로 즉시 구분할 수 있다.
  - [x] `critical path`는 여러 bar를 pair edge가 연속된 chain으로 읽히게 렌더링된다.
  - [x] `critical path`에 포함된 bar는 일반 bar와 구분되는 추가 강조를 가진다.
  - [x] `critical path` 생성/삭제 명령이 우클릭 메뉴와 연속 선택 흐름으로 동작한다.
- 검증
  - [x] `npm run type-check`
  - [x] `npm run build`
  - [x] 줌인/줌아웃을 반복해도 선택 bar 위치와 header 눈금이 크게 어긋나지 않는다.
  - [x] 선행 작업을 뒤로 밀면 후행 작업이 제약을 만족하는 지점까지 따라 밀린다.
  - [x] 후행 작업을 움직여도 선행 작업은 따라 움직이지 않는다.
  - [x] link된 두 작업 중 어느 쪽을 움직여도 지정 gap이 유지된다.
  - [x] 3개 이상 bar로 이어진 `critical path` chain에서 사용자가 흐름 순서를 혼동하지 않는다.
  - [x] 같은 데이터에서 `critical path` on/off만 바꿔도 일정 데이터는 변하지 않는다.
  - [x] 같은 화면에 `dependency`, `link`, `critical path`가 함께 있어도 사용자가 각 관계를 혼동하지 않는다.
  - [x] 컨텍스트 메뉴와 연속 좌클릭 흐름에서 `critical path` 생성/제거가 동작한다.

### [x] Batch 7. 마일스톤 표시 레이어 추가

- 범위
  - 마일스톤을 날짜 헤더 바로 아래 전용 row와 `마커 / 라벨` 레이어로 추가한다.
  - 마일스톤 날짜는 chart 전체 column과 header cell에서 옅은 노란색 강조로 식별 가능하게 만든다.
  - 마일스톤 row 우클릭으로 생성하고, 텍스트 입력창으로 라벨을 입력/수정할 수 있게 한다.
  - 1차는 표시/생성 중심으로 구현하고, 일정 계산 영향은 넣지 않는다.
  - row panel과 chart 양쪽에서 마일스톤 식별이 가능하도록 만든다.
- 완료 기준
  - [x] 날짜 헤더 바로 아래에 마일스톤 전용 row가 표시된다.
  - [x] 특정 날짜에 마일스톤 마커와 라벨을 표시할 수 있다.
  - [x] 마일스톤은 우클릭 생성과 텍스트 입력/수정 흐름을 가진다.
  - [x] 마일스톤은 일반 bar와 구분되는 시각 규칙을 가진다.
  - [x] 마일스톤 추가/수정은 다른 일정 계산을 망가뜨리지 않는다.
- 검증
  - [x] `npm run type-check`
  - [x] `npm run build`
  - [x] 휴일/비활성일/오늘 표시와 겹쳐도 마일스톤 식별이 가능하다.

### [ ] Batch 8. 마이그레이션 정리, 분석 이벤트 보강, QA 시나리오 고정

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

- 상세 초안 문서: [docs/SCHEDULE_2D_BACKEND_API_CONTRACT.md](/Users/leo/Desktop/fun/programming/constructionHelperFrontend/docs/SCHEDULE_2D_BACKEND_API_CONTRACT.md)
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

### [ ] Contract B. dependency / link / critical / milestone 분리 저장

- 상세 초안 문서: [docs/SCHEDULE_2D_BACKEND_API_CONTRACT.md](/Users/leo/Desktop/fun/programming/constructionHelperFrontend/docs/SCHEDULE_2D_BACKEND_API_CONTRACT.md)
- 필요 필드 후보
  - `dependencyId`, `predecessorItemId`, `successorItemId`, `relationType(fs 1차 고정)`
  - `linkId`, `sourceItemId`, `targetItemId`, `gapDays`
  - `criticalChainId`, `sourceItemId`, `targetItemId`, `orderNo`
  - `milestoneId`, `date`, `label`, `color`
- 확인 포인트
  - [ ] 1차는 `critical path`를 계산/조회 결과 전용으로 두고 수동 지정 API는 제외할지
  - [ ] `link`를 pair edge 저장으로 둘지, 연결된 집합 unit 저장으로 둘지
  - [ ] milestone을 프로젝트 공통 레이어로 둘지 row 귀속으로 둘지

## 6. 토의가 필요한 결정사항

1. 상위 공정은 "진짜 연간 스케일 row"로 갈지, 아니면 1차는 동일 타임라인 위의 summary row로 갈지 결정이 필요하다.
   - 현재 코드와 브라우저 성능을 기준으로 보면 1차는 `공통 타임라인 + 상위 row 요약 표현`이 가장 안전하다.
   - row별로 수평 스케일이 달라지는 진짜 mixed-scale renderer는 별도 배치로 빼는 편이 맞다.

2. 상위/하위 공정이 `공종/세부공종`과 같은 개념인지, 아니면 전혀 별도의 일정 구조인지 결정이 필요하다.
   - 현재 데이터는 `workType/subWorkType`만 있으므로, 별도 개념이면 백엔드 계약이 선행되어야 한다.

3. 마일스톤은 1차에서 `표시만` 할지, 우클릭으로 생성/수정까지 포함할지 결정이 필요하다.
   - 현재 구현은 `전용 row + 우클릭 생성 + 라벨 수정`까지 포함하는 방향으로 정리했다.
