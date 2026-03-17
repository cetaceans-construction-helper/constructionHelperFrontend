# GA4 액션 트래킹 전략 (최신)

기준일: 2026-03-17

이 문서는 현재 코드 기준의 GA4 트래킹 전략과 이벤트 카탈로그를 정리한 최신 문서다.

이관 메모:
- 기존 위치: `docs/GA4_ACTION_TRACKING_STRATEGY.md`
- 현재 위치: `docs/ga/GA4_ACTION_TRACKING_STRATEGY.md`

## 1. 목적

- 사용자 행동의 큰 흐름을 본다.
- 화면 조회보다 업무 액션 중심으로 본다.
- 로그인, 프로젝트 선택, 핵심 저장/생성/수정/삭제, 주요 실패를 우선 수집한다.
- 노이즈가 큰 상호작용은 제외하되, 화면 모드가 실제로 바뀌는 전환 이벤트는 예외적으로 수집한다.

## 2. 측정 원칙

- 이벤트 이름은 `snake_case`를 쓴다.
- `feature_action`은 기본적으로 `feature`, `action`, `result` 중심으로 최소 수집한다.
- 자유 텍스트 원문, 이메일, 전화번호, 이름 등 PII는 보내지 않는다.
- 버튼 클릭 수집을 남발하지 않는다.
- 스크롤 깊이 자체는 수집하지 않는다.
- 다만 스크롤이 실제 화면 모드 전환을 일으키는 경우는 업무 화면 해석에 필요하면 수집할 수 있다.

현재 예외:
- `schedule_2d`의 `change_layout_by_scroll`
  - `daily`와 `weekly` 레이아웃 전환 순간만 수집

## 3. 현재 구현 구조

### 3.1 태그 로더

- `index.html`
  - `gtag.js` 직접 로드
  - 측정 ID: `G-61RZ9ZS0MN`
  - `send_page_view: false`로 두고 앱에서 수동 `page_view` 전송

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

### 3.3 자동/수동 수집 위치

- `src/app/routing/index.ts`
  - `page_view`
- `src/features/auth/ui/LoginPage.vue`
  - `login_attempt`
- `src/features/auth/ui/SignupPage.vue`
  - `signup_attempt`
- `src/features/auth/view-model/auth-store.ts`
  - `login_result`
  - `signup_result`
  - `logout`
  - `user_id` 설정/해제
- `src/app/shell/ui/ConstructionHelperPage.vue`
  - `project_selected`
- `src/shared/network-core/apiClient.ts`
  - 일반 API `api_error`
- `src/features/auth/infra/auth-client.ts`
  - 인증 API `api_error`
- `src/features/**`
  - 기능별 `feature_action`

## 4. 이벤트 모델

### 4.1 공통 파라미터

- `user_id`
  - 로그인 사용자 내부 비식별 ID

### 4.2 이벤트별 파라미터

- `page_view`
  - `route_name`
  - `route_path`
- `login_result`, `signup_result`, `logout`
  - `result`
  - 실패 시 `error_type`
- `project_selected`
  - `project_id`
  - `previous_project_id`
  - `selection_state`
  - `route_name`
  - `route_path`
- `feature_action`
  - 기본: `feature`, `action`, `result`
  - 예외: 일부 UI 상태 전환 이벤트는 추가 파라미터 허용
- `api_error`
  - `feature`
  - `status_group`
  - `route_path`

### 4.3 `feature_action` 기본 정책

- 기본 스키마:
  - `feature`
  - `action`
  - `result`
- 기본 원칙:
  - ID 미수집
  - 자유 텍스트 미수집
  - 성공/실패 중심

현재 허용 예외:
- `schedule_2d / change_layout_by_scroll`
  - `from_layout`
  - `to_layout`
  - `trigger=scroll`

## 5. 공식 이벤트 카탈로그

### 5.1 공통 이벤트

| event_name | 상태 | 설명 |
| --- | --- | --- |
| `page_view` | 구현됨 | 라우트 진입 |
| `login_attempt` | 구현됨 | 로그인 제출 |
| `login_result` | 구현됨 | 로그인 결과 |
| `signup_attempt` | 구현됨 | 회원가입 제출 |
| `signup_result` | 구현됨 | 회원가입 결과 |
| `logout` | 구현됨 | 로그아웃 결과 |
| `project_selected` | 구현됨 | 프로젝트 변경 |
| `feature_action` | 구현됨 | 핵심 업무 액션 결과 |
| `api_error` | 구현됨 | 주요 API 실패 |
| `app_open` | 미구현 | 앱 시작 이벤트 |

### 5.2 `feature_action` 카탈로그

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

참고:
- `create_section`, `update_section`, `delete_section`
- `create_usage`, `update_usage`, `delete_usage`

위 액션은 전략상 후보였지만 현재 기능이 임시 비활성화되어 실제 코드에는 없다.

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

#### `system_admin`

- 현재 없음
- 후보 액션:
  - `save_system_data`

## 6. 현재 미구현 또는 부분 구현 영역

### 6.1 미구현

- `app_open`
- `system_admin` 계열 액션

### 6.2 page_view만 있고 액션 추적이 없는 대표 화면

- `/helper/dashboard`
- `/helper/attendance/register`
- `/helper/material/outgoing`
- `/helper/material/remaining`
- `/helper/document/manager`
- `/helper/admin/holiday`
- `/helper/admin/bulk-deployment`
- `/helper/admin/homepage-setting`
- `/helper/admin/rebuild-work-names`
- `/system-admin`

## 7. API 에러 수집 정책

- 수집 위치:
  - 인증 API 클라이언트
  - 일반 API 클라이언트
- 제외:
  - `401`
  - `403`
  - `/refresh`
- 샘플링:
  - 현재 코드 기본값은 100%
  - `VITE_GA_API_ERROR_SAMPLE_RATE`로 조정 가능

## 8. 개인정보 및 데이터 품질 가이드

- 금지:
  - 이메일
  - 전화번호
  - 이름
  - 주민번호
  - 메모 원문
  - 자유 입력 텍스트 원문
- 허용:
  - 라우트명
  - 기능명
  - 성공/실패 여부
  - 내부 비식별 ID
  - UI 모드 전환 상태값
- `error_type`은 짧은 분류값만 사용한다.

## 9. 검증 체크리스트

- DebugView에서 라우트 이동당 `page_view`가 1회만 찍히는지 확인
- 로그인/회원가입/로그아웃 결과가 `result=success|fail`로 나뉘는지 확인
- `project_selected`의 `selection_state`가 의도대로 나가는지 확인
- `feature_action`이 성공/실패 모두 찍히는지 확인
- `change_layout_by_scroll`가 레이아웃 전환 순간에만 찍히는지 확인
- `api_error.status_group`가 `4xx`, `5xx`, `network`로 올바르게 분류되는지 확인
- 이벤트와 파라미터에 PII가 없는지 확인

## 10. 다음 우선순위

1. `app_open` 구현
2. `system_admin` 액션 정의 및 연동
3. 현재 `page_view`만 있는 주요 화면의 저장/수정/삭제 액션 보강
4. `section/usage` 기능 재활성화 시 관련 액션 복구
5. `api_error` 샘플링 기본값을 운영 정책에 맞게 재결정
