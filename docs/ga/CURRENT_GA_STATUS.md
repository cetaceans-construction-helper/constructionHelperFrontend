# 현재 GA 적용 현황 정리

기준일: 2026-03-17

기준 문서:
- `docs/ga/GA4_ACTION_TRACKING_STRATEGY.md`

코드 확인 범위:
- `index.html`
- `src/main.ts`
- `src/app/routing/index.ts`
- `src/app/shell/ui/ConstructionHelperPage.vue`
- `src/shared/analytics/**`
- `src/shared/network-core/apiClient.ts`
- `src/features/**` 내 `analyticsClient` 호출 지점

## 1. 한 줄 요약

- GA4 기본 삽입은 되어 있다.
- 라우트 기반 `page_view`는 전역으로 붙어 있다.
- 인증, 프로젝트 선택, API 에러, 핵심 일부 업무 액션은 붙어 있다.
- `schedule_2d`에서는 스크롤로 `daily`/`weekly` 레이아웃이 바뀌는 순간도 이제 추적한다.
- 다만 `app_open`, `system_admin` 액션은 아직 없다.
- 여전히 일부 화면은 `page_view`만 있고, 명시적 액션 이벤트는 없다.

## 2. 판정 기준

- `붙어 있음`
  - `analyticsClient.track*()` 호출이 직접 존재함
  - 또는 라우터 전역 `trackRouteView()`로 `page_view`가 자동 수집됨
- `붙어 있지 않음`
  - 코드 검색 기준 명시적 GA 호출이 없음
- `부분 적용`
  - 같은 화면 안에서도 일부 액션만 GA가 있고, 일부 액션은 없음

## 3. 공통 GA 상태

### 3.1 기본 삽입

- `index.html`
  - `gtag.js` 로더가 직접 삽입되어 있음
  - 측정 ID: `G-61RZ9ZS0MN`
  - `send_page_view: false` 설정으로 자동 페이지뷰는 끄고 앱에서 수동 전송함

### 3.2 공통 래퍼

- `src/shared/analytics/analyticsClient.ts`
  - `trackEvent`
  - `trackPageView`
  - `trackRouteView`
  - `trackProjectSelected`
  - `trackAction`
  - `trackLayoutChangeByScroll`
  - `trackAuth`
  - `trackError`
  - `setUserId`

### 3.3 페이지뷰

- `src/app/routing/index.ts`
  - `router.afterEach`에서 `page_view` 전송
  - `router.isReady()` fallback도 있어 최초 진입 누락을 방지함
- 결론:
  - 라우터에 연결된 화면은 기본적으로 `page_view`가 붙어 있다고 봐도 됨

### 3.4 인증

- 구현됨
  - `login_attempt`
  - `login_result`
  - `signup_attempt`
  - `signup_result`
  - `logout`
- `user_id`
  - 로그인 성공 시 설정
  - 로그아웃 및 인증 초기화 실패 시 해제

### 3.5 프로젝트 선택

- 구현됨
  - `project_selected`
- 현재 코드에서 보내는 값
  - `project_id`
  - `previous_project_id`
  - `selection_state`
  - `route_name`
  - `route_path`
- `selection_state` 값
  - `manual`
  - `auto_initial`
  - `auto_recovery`

### 3.6 API 에러

- 구현됨
  - 인증 API 클라이언트
  - 일반 API 클라이언트
- 현재 전송 값
  - `feature`
  - `status_group`
  - `route_path`
- 제외 처리
  - `401`
  - `403`
  - `/refresh`
- 샘플링
  - 현재 코드 기본값은 100%
  - `VITE_GA_API_ERROR_SAMPLE_RATE`로 조정 가능

## 4. 현재 GA가 붙어 있는 이벤트

### 4.1 공통 이벤트

| event_name | 상태 | 비고 |
| --- | --- | --- |
| `page_view` | 적용 | 전역 라우터 기반 자동 수집 |
| `login_attempt` | 적용 | 로그인 제출 시점 |
| `login_result` | 적용 | 성공/실패 분리 |
| `signup_attempt` | 적용 | 회원가입 제출 시점 |
| `signup_result` | 적용 | 성공/실패 분리 |
| `logout` | 적용 | 성공/실패 분리 |
| `project_selected` | 적용 | 수동/자동 선택 상태 포함 |
| `api_error` | 적용 | auth/client 양쪽 인터셉터에서 수집 |
| `app_open` | 미적용 | 전략 문서 후보이지만 코드에는 없음 |

### 4.2 `feature_action` 적용 목록

현재 코드 기준으로 실제 붙어 있는 액션은 아래와 같다.

#### `schedule_2d`

- `create_work`
- `update_work`
- `delete_work`
- `create_path`
- `update_path`
- `delete_path`
- `optimize_current_path`
- `optimize_all_paths`
- `update_path_lag_days`
- `change_layout_by_scroll`

설명:
- `update_path_lag_days`는 초기 범위를 넘어 현재 코드에 추가된 액션이다.
- `change_layout_by_scroll`는 마우스 휠 스크롤로 `daily`/`weekly` 레이아웃이 전환되는 순간에만 수집된다.

#### `schedule_3d`

- `update_task_quantity`
- `create_material_order`

#### `material_attendance`

- `save_attendance`
- `reset_attendance`

#### `material_equipment`

- `save_equipment`
- `reset_equipment`

#### `material_delivery`

- `create_delivery`
- `update_delivery`
- `delete_delivery`
- `create_mir`
- `delete_mir`
- `download_mir`
- `update_mir_document_number`

#### `material_order`

- `delete_order`

#### `document`

- `delete_daily_report`
- `download_daily_report`

#### `admin_master_data`

- `create_division`
- `update_division`
- `delete_division`
- `create_work_type`
- `update_work_type`
- `delete_work_type`
- `create_sub_work_type`
- `update_sub_work_type`
- `delete_sub_work_type`
- `create_work_step`
- `update_work_step`
- `delete_work_step`
- `create_material_type`
- `update_material_type`
- `delete_material_type`
- `create_material_spec`
- `update_material_spec`
- `delete_material_spec`
- `create_zone`
- `update_zone`
- `delete_zone`
- `create_floor`
- `update_floor`
- `delete_floor`
- `create_component_type`
- `update_component_type`
- `delete_component_type`
- `create_component_code`
- `delete_component_code`
- `create_component_code_mapping`
- `update_component_code_mapping`
- `delete_component_code_mapping`

주의:
- `section`, `usage` 계열은 전략 후보였지만 현재 기능이 임시 비활성화되어 실제 적용되지 않음

#### `admin_resource_data`

- `create_labor_type`
- `update_labor_type`
- `delete_labor_type`
- `create_equipment_type`
- `update_equipment_type`
- `delete_equipment_type`
- `create_equipment_spec`
- `update_equipment_spec`
- `delete_equipment_spec`

#### `admin_document_setting`

- `save_document_setting`

#### `admin_daily_report_setting`

- `save_daily_report_setting`

## 5. GA가 붙어 있지 않은 부분

### 5.1 전략상 후보지만 아직 없는 것

- `app_open`
  - `src/main.ts`에 아직 호출 없음
- `system_admin / save_system_data`
  - 전략 후보지만 현재 구현 없음

### 5.2 기능이 비활성화되어 비어 있는 영역

- `admin_master_data`
  - `create_section`
  - `update_section`
  - `delete_section`
  - `create_usage`
  - `update_usage`
  - `delete_usage`

사유:
- `src/features/project-admin/master-data/view-model/useLocationMaster.ts`에서 `section/usage` 로직 자체가 주석 처리되어 있음

### 5.3 화면은 있으나 명시적 액션 GA가 없는 영역

아래는 라우터 기준 `page_view`는 들어가지만, 코드 검색 기준 별도 `trackAction` 또는 커스텀 이벤트 호출이 없는 화면/영역이다.

- 메인 공개 화면 `/`
- 대시보드 `/helper/dashboard`
- 작업자 등록 `/helper/attendance/register`
- 반출자재 `/helper/material/outgoing`
- 잔여자재 `/helper/material/remaining`
- 문서관리 `/helper/document/manager`
- 안전관리 placeholder `/helper/safety`
- 유용한 기능 placeholder `/helper/functions`
- 휴일관리 `/helper/admin/holiday`
- 대량 출역 입력 `/helper/admin/bulk-deployment`
- 홈페이지 입력정보 `/helper/admin/homepage-setting`
- 공정명 재생성 `/helper/admin/rebuild-work-names`
- 시스템 관리자 `/system-admin`

해석:
- 이 화면들은 `page_view`는 수집되지만, 사용자가 실제로 저장/생성/수정/삭제를 했는지까지는 현재 GA로 구분하기 어렵다.

## 6. 최신 정합성 메모

- 전략 문서는 이제 `docs/ga/GA4_ACTION_TRACKING_STRATEGY.md`를 기준으로 본다.
- 현재 전략 문서와 실제 코드의 이벤트 카탈로그는 대체로 맞춰져 있다.
- 남은 차이는 대부분 "미구현 후보" 또는 "비활성화 기능"에 해당한다.
- 가장 최근 반영된 변경은 `schedule_2d / change_layout_by_scroll`, `material_delivery / update_mir_document_number` 추가다.

## 7. 현재 상태 결론

- 공통 GA 기반은 이미 안정적으로 깔려 있다.
- 특히 `page_view`, 인증, 프로젝트 선택, API 에러, 핵심 업무 액션 일부는 운영 분석에 바로 쓸 수 있는 수준이다.
- 다만 현재는 "핵심 액션이 붙은 영역"과 "페이지뷰만 있는 영역"이 섞여 있다.
- 우선순위를 잡는다면 아래 순서가 자연스럽다.
  - `app_open` 보강
  - `system_admin` 액션 추가
  - 현재 page_view만 있는 관리자/문서/자재 화면의 저장/수정/삭제 액션 추가
  - `section/usage` 기능 재활성화 시 해당 GA도 함께 복구
  - `api_error` 샘플링 기본값을 운영 정책에 맞게 재결정
