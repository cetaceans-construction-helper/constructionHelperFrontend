# GA4 액션 중심 트래킹 전략 (초기 버전)

## 1. 목적
- 전체 프로젝트에 GA4를 도입해 사용자 행동의 큰 흐름을 본다.
- 스크롤/세부 클릭은 제외하고, 업무 액션 중심으로 측정한다.
- 최소 이벤트로 빠르게 시작하고 이후 확장한다.

## 2. 이번 범위
- 포함:
  - 인증 흐름
  - 화면/섹션 진입
  - 핵심 저장/생성/수정/삭제 액션
  - 주요 실패 이벤트
- 제외:
  - 스크롤 깊이, 버튼 단건 클릭 로그
  - 자유 텍스트 원문
  - 마우스/터치 좌표

## 3. 측정 질문
- 사용자는 로그인 후 어떤 섹션을 가장 많이 쓰는가?
- 실제로 업무 데이터를 저장하는가?
- 어떤 기능에서 실패가 자주 나는가?
- 프로젝트 선택 이후 행동이 이어지는가?

## 4. KPI (초기)
- `활성 사용자`: DAU, WAU
- `로그인 전환`: `login_result(success) / login_attempt`
- `활성화율`: 로그인 후 24시간 내 `feature_action(success)` 발생 비율
- `기능 사용량`: 섹션별 사용자 수, 핵심 액션 건수
- `실패율`: 기능별 `feature_action(fail)` 비율

## 5. 이벤트 모델

### 5.1 이벤트 네이밍
- 규칙: `snake_case`
- 원칙: 행동 중심(`create_*`, `update_*`, `delete_*`, `save_*`)

### 5.2 공통 파라미터
- `route_name`: Vue Router name
- `route_path`: hash 라우트 전체 경로
- `section`: `main|auth|dashboard|process|material|safety|document|utility|admin|system_admin|mobile`
- `user_role`: `anonymous|SUPER|...`
- `project_selected`: `yes|no`
- `platform_view`: `pc|mobile_route`

### 5.3 초기 이벤트 목록 (P0)
| event_name | 설명 | 핵심 파라미터 | 구현 위치 |
|---|---|---|---|
| `app_open` | 앱 시작 | 공통 파라미터 | `src/main.ts` |
| `page_view` | 라우트 진입 | 공통 파라미터 | `src/router/index.ts` (`afterEach`) |
| `section_view` | 상위 섹션 전환 | `section` | `src/router/index.ts` (`afterEach`) |
| `login_attempt` | 로그인 제출 | `route_name` | `src/pages/LoginPage.vue` |
| `login_result` | 로그인 결과 | `result`, `error_type` | `src/stores/auth.ts` |
| `signup_attempt` | 회원가입 제출 | `route_name` | `src/pages/SignupPage.vue` |
| `signup_result` | 회원가입 결과 | `result`, `error_type` | `src/stores/auth.ts` |
| `logout` | 로그아웃 | `section` | `src/pages/ConstructionHelperPage.vue`, `src/pages/system-admin/SystemAdminPage.vue` |
| `project_selected` | 프로젝트 변경 | `selection_state` | `src/pages/ConstructionHelperPage.vue` |
| `feature_action` | 핵심 업무 액션 결과 | `feature`, `action`, `result` | 아래 표 참조 |
| `api_error` | 주요 API 실패 | `feature`, `status_group` | `src/api/client.ts`, `src/api/apiClient.ts` |

### 5.4 `feature_action` 액션 매핑
| feature | action | 구현 위치 |
|---|---|---|
| `schedule_2d` | `create_work` | `src/pages/helper/schedule/composables/schedule2D/useWorkForm.ts` |
| `schedule_2d` | `update_work` | `src/pages/helper/schedule/composables/schedule2D/useWorkEditor.ts` |
| `schedule_2d` | `delete_work` | `src/pages/helper/schedule/components/Viewer2dArea.vue` |
| `schedule_2d` | `create_path` | `src/pages/helper/schedule/components/Viewer2dArea.vue` |
| `schedule_2d` | `update_path` | `src/pages/helper/schedule/composables/schedule2D/usePathEditor.ts` |
| `schedule_2d` | `delete_path` | `src/pages/helper/schedule/components/Viewer2dArea.vue` |
| `schedule_2d` | `optimize_path` | `src/pages/helper/schedule/components/Viewer2dArea.vue` |
| `schedule_3d` | `update_task_quantity` | `src/pages/helper/schedule/components/Viewer3dArea.vue` |
| `schedule_3d` | `create_material_order` | `src/pages/helper/schedule/components/Viewer3dArea.vue` |
| `material_attendance` | `save_attendance` | `src/pages/helper/material/composables/useAttendance.ts` |
| `material_equipment` | `save_equipment` | `src/pages/helper/material/composables/useEquipmentDeployment.ts` |
| `admin` | `save_master_data` | `src/pages/helper/admin/*` |
| `system_admin` | `save_system_data` | `src/pages/system-admin/composables/*` |

## 6. 구현 방식
1. 공통 래퍼 생성
   - 파일: `src/lib/analytics/ga.ts`
   - 함수: `trackPageView`, `trackAuth`, `trackAction`, `trackApiError`
   - `VITE_GA_MEASUREMENT_ID` 미설정 시 no-op
2. 자동 수집
   - 라우터 `afterEach`에서 `page_view`, `section_view`
3. 수동 수집
   - 핵심 액션 성공 시 `feature_action` + `result=success`
   - `catch`에서 `feature_action` + `result=fail`
4. 오류 수집
   - API 에러는 샘플링(예: 20%) 적용
   - 401/403 토큰 갱신 경로는 제외

## 7. 개인정보/데이터 품질 가이드
- 금지:
  - 이메일, 전화번호, 이름, 주민번호, 메모 원문
- 허용:
  - 역할, 섹션, 기능명, 성공/실패 여부
- 에러 정보:
  - `error_type`은 짧은 분류값만 사용 (`validation`, `network`, `server`)

## 8. 도입 순서
- Phase 1 (당일):
  - `app_open`, `page_view`, `section_view`, 인증 이벤트
- Phase 2 (1~2일):
  - `project_selected`
  - `feature_action` (schedule/material 우선)
- Phase 3 (추가 1일):
  - `admin/system_admin` 액션
  - `api_error` 샘플링 수집

## 9. 검증 체크리스트
- DebugView에서 페이지 이동당 `page_view` 1회
- 로그인 성공/실패가 `login_result.result`로 분리
- 핵심 저장 액션이 성공/실패 모두 들어옴
- 파라미터에 PII가 없는지 확인
- 이벤트 이름/파라미터가 snake_case인지 확인

## 10. 확장 기준 (운영 2~4주 후)
- 확장 조건:
  - 특정 기능 사용량이 높고 전환 개선 여지가 큼
  - 실패율이 높은 기능의 원인 분해가 필요함
- 확장 후보:
  - 액션별 세부 단계 이벤트
  - 기능별 퍼널 분리
  - role/project 기준 세그먼트 대시보드

## 11. GA 연동 세부 TODO (검증 게이트 방식)

### 11.0 Gate 0 - 사전 상태 확인 (현재 상태 반영)
- [x] [작업] GA4 속성 생성 완료
- [x] [작업] Web 데이터 스트림 생성 및 측정 ID 확보 (`G-61RZ9ZS0MN`)
- [x] [작업] Google 안내 스니펫 수신 완료
- [x] [검증] 작업 브랜치에서만 연동 작업 진행 중인지 확인
- [x] [완료조건] Gate 1부터 코드 변경 시작 가능

### 11.1 Gate 1 - 태그 로더 삽입 (기본 연동)
- [x] [작업] `index.html`에 `gtag.js` 로더와 `gtag('config', 'G-61RZ9ZS0MN')` 삽입
- [x] [작업] dev/prod 환경에서 중복 로딩이 발생하지 않도록 1회만 실행되게 구성
- [x] [검증] 브라우저 네트워크 탭에서 `https://www.googletagmanager.com/gtag/js?id=G-61RZ9ZS0MN` 호출 확인
- [x] [검증] 콘솔 에러 없이 앱 정상 부팅 확인
- [x] [완료조건] 기본 gtag 로딩 성공

### 11.2 Gate 2 - 분석 래퍼 유틸 생성
- [ ] [작업] `src/lib/analytics/ga.ts` 생성 (`trackEvent`, `trackPageView`, `trackAction`, `trackAuth`, `trackError`)
- [ ] [작업] `window.gtag` 미존재 시 no-op 처리
- [ ] [작업] 공통 파라미터 빌더(`section`, `route_name`, `project_selected`) 추가
- [ ] [검증] 로컬에서 수동 호출 시 런타임 에러가 없는지 확인
- [ ] [완료조건] 앱 어디서든 안전하게 호출 가능한 상태

### 11.3 Gate 3 - 페이지/섹션 자동 수집
- [ ] [작업] `src/router/index.ts`의 `afterEach`에서 `page_view`, `section_view` 전송
- [ ] [작업] 최초 진입 시 누락 방지 처리
- [ ] [검증] GA4 DebugView에서 라우트 이동 1회당 `page_view` 1건 확인
- [ ] [검증] 섹션 이동 시 `section_view` 파라미터 값이 의도대로 찍히는지 확인
- [ ] [완료조건] 자동 수집 안정화 (중복/누락 없음)

### 11.4 Gate 4 - 인증 이벤트 연동
- [ ] [작업] `login_attempt`, `login_result` 연결
- [ ] [작업] `signup_attempt`, `signup_result` 연결
- [ ] [작업] `logout` 이벤트 연결
- [ ] [검증] 성공/실패 각각 테스트하고 `result=success|fail` 분리 확인
- [ ] [완료조건] 인증 퍼널 데이터 수집 가능

### 11.5 Gate 5 - 프로젝트 선택 이벤트 연동
- [ ] [작업] `project_selected` 이벤트 연결
- [ ] [작업] 초기 자동 선택과 사용자 직접 변경을 구분할지 결정 후 반영
- [ ] [검증] 프로젝트 변경 시 이벤트 1회 전송 확인
- [ ] [완료조건] 프로젝트 맥락 분석 가능

### 11.6 Gate 6 - 핵심 `feature_action` 연동 (우선 기능)
- [ ] [작업] `schedule_2d` 액션 연결 (`create/update/delete work`, `create/update/delete/optimize path`)
- [ ] [작업] `schedule_3d` 액션 연결 (`update_task_quantity`, `create_material_order`)
- [ ] [작업] `material` 액션 연결 (`save_attendance`, `save_equipment`)
- [ ] [검증] 각 액션별 성공 1건/실패 1건 수동 테스트
- [ ] [완료조건] 핵심 업무 액션 지표 수집 시작

### 11.7 Gate 7 - 오류 이벤트 최소 연동
- [ ] [작업] API 클라이언트 인터셉터에 `api_error` 연동
- [ ] [작업] 샘플링 비율 적용(예: 20%)
- [ ] [작업] 401/403 토큰 갱신 루프는 제외 처리
- [ ] [검증] 의도적 실패 요청 시 `status_group` 값 정확성 확인 (`4xx`, `5xx`, `network`)
- [ ] [완료조건] 장애 징후 모니터링 가능

### 11.8 Gate 8 - 데이터 품질/보안 점검
- [ ] [작업] 이벤트/파라미터 네이밍 최종 점검 (snake_case)
- [ ] [작업] PII 미전송 점검 (이메일, 전화번호, 이름, 주민번호, 자유 텍스트)
- [ ] [작업] 커스텀 차원 등록 필요 목록 정리 (GA4 관리 화면 반영)
- [ ] [검증] DebugView 실측 로그 샘플 검토 (핵심 이벤트 전체 1회 이상)
- [ ] [완료조건] 운영 반영 가능 상태

### 11.9 Gate 9 - 운영 반영 후 관찰
- [ ] [작업] 프로덕션 반영
- [ ] [작업] 24~72시간 데이터 적재 확인
- [ ] [작업] 초기 대시보드(인증, 섹션, 핵심 액션, 실패율) 생성
- [ ] [검증] 비정상 급증/중복/누락 모니터링
- [ ] [완료조건] 1차 GA 운영 시작 완료
