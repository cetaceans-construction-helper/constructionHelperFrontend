# Feature Refactor Execution Plan (V3, Legacy First)

## 1) 고정 조건

이번 리팩토링은 아래 조건을 고정한다.

- [ ] 브랜치는 하나만 사용한다: `codex/refactor-feature-architecture`
- [ ] 기능별로 브랜치를 새로 만들지 않는다.
- [ ] 커밋은 작은 단위로 나눈다. (구조 이동 / 로직 이동 / 규칙 적용 분리)
- [ ] 시작은 기존 코드의 `legacy` 이관부터 한다.
- [ ] 계획/검증 단위는 `상위 feature -> 하위 feature` 기준으로 잡는다.

이 문서는 **Stage A (코드베이스 분류 + legacy 선이관 계획)** 까지만 다룬다.  
Stage B(신규 `src/features/*` 구축) 계획은 Stage A 리뷰 후 별도 작성한다.

## 2) 브랜치/커밋 운영

### 2.1 단일 브랜치 생성

- [ ] 'refactor-feature-architecture' branch

### 2.2 커밋 원칙

- [ ] 커밋 하나는 목적 하나만 담는다.
- [ ] 커밋 메시지에 `상위 feature/하위 feature`를 명시한다.
- [ ] 구조 이동 커밋은 동작 변경을 포함하지 않는다.

커밋 메시지 예시:

- `chore(legacy/material.order): move files to src/legacy`
- `chore(alias): add legacy compatibility aliases`
- `refactor(material.order): split view-model from ui`

## 3) 현재 코드베이스 분류 (상위 feature -> 하위 feature)

아래는 현재 코드 스캔 결과를 Guardrails 기준으로 묶은 1차 분류다.

## Top Feature: `app`

- `app.bootstrap`
  - `src/main.ts`
  - `src/App.vue`
  - `src/config.ts`
  - `src/assets/index.css`
- `app.routing`
  - `src/router/index.ts`
  - `src/router/guards.ts`
- `app.shell`
  - `src/pages/ConstructionHelperPage.vue`
- `app.public-home`
  - `src/pages/MainPage.vue`
- `app.context`
  - `src/stores/project.ts`
  - `src/stores/calendarStore.ts`
  - `src/types/project.ts`
  - `src/types/calendar.ts`
  - `src/api/project.ts`
  - `src/api/calendar.ts`
  - `src/api/projectCalendar.ts`
- `app.legacy-shell-candidate` (사용 여부 재검토)
  - `src/pages/HelperPage.vue`
- `app.test`
  - `src/__tests__/App.spec.ts`

## Top Feature: `auth`

- `auth.login`
  - `src/pages/LoginPage.vue`
- `auth.signup`
  - `src/pages/SignupPage.vue`
- `auth.session`
  - `src/stores/auth.ts`
  - `src/types/auth.ts`
  - `src/api/auth.ts`
  - `src/api/client.ts`

## Top Feature: `dashboard`

- `dashboard.main`
  - `src/pages/helper/DashboardPage.vue`
  - `src/pages/helper/dashboard/components/*`

## Top Feature: `schedule`

- `schedule.schedule-2d`
  - `src/pages/helper/schedule/Schedule2dPage.vue`
  - `src/pages/helper/schedule/components/Viewer2dArea.vue`
  - `src/pages/helper/schedule/composables/schedule2D/*`
  - `src/pages/helper/schedule/groupLogic.ts`
  - `src/pages/helper/schedule/nodeConfig.ts`
  - `src/stores/chartConfigStore.ts`
  - `src/api/work.ts`
  - `src/api/workPath.ts`
  - `src/api/task.ts`
- `schedule.schedule-3d`
  - `src/pages/helper/schedule/Schedule3dPage.vue`
  - `src/pages/helper/schedule/components/Viewer3dArea.vue`
  - `src/composables/useEngine.ts`
  - `src/composables/useDailyReport.ts`
  - `src/utils/three/**/*`
  - `src/api/object3d.ts`
  - `src/types/object3d.ts`

## Top Feature: `attendance`

- `attendance.input`
  - `src/pages/helper/attendance/AttendanceInputPage.vue`
- `attendance.worker-register`
  - `src/pages/helper/attendance/WorkerRegisterPage.vue`
- `attendance.data`
  - `src/api/attendance.ts`

참고:
- `AttendanceInputPage`는 현재 `src/pages/helper/material/components/AttendanceTab.vue`를 사용한다.
- Stage B에서 `attendance` 전용 UI로 분리하거나 `shared` 승격 여부를 결정한다.

## Top Feature: `material`

- `material.order`
  - `src/pages/helper/material/InvoicePage.vue`
  - `src/pages/helper/material/composables/useMaterialOrder.ts`
- `material.incoming`
  - `src/pages/helper/material/IncomingMaterialPage.vue`
  - `src/pages/helper/material/composables/useAttendance.ts`
- `material.outgoing`
  - `src/pages/helper/material/OutgoingMaterialPage.vue`
- `material.remaining`
  - `src/pages/helper/material/RemainingMaterialPage.vue`
  - `src/pages/helper/material/composables/useEquipmentDeployment.ts`
- `material.shared-ui`
  - `src/pages/helper/material/components/*`
- `material.data`
  - `src/api/materialOrder.ts`
  - `src/api/equipment.ts`
- `material.legacy-candidate` (사용 여부 재검토)
  - `src/pages/helper/material/ListPage.vue`

## Top Feature: `document`

- `document.manager`
  - `src/pages/helper/document/ManagerPage.vue`
- `document.daily-report`
  - `src/pages/helper/document/DailyReportPage.vue`
- `document.material-inspection`
  - `src/pages/helper/document/MaterialInspectionPage.vue`
  - `src/api/projectDocumentCode.ts`

## Top Feature: `project-admin`

- `project-admin.master-data`
  - `src/pages/helper/admin/AdminPage.vue`
  - `src/pages/helper/admin/components/WorkClassificationArea.vue`
  - `src/pages/helper/admin/components/MaterialMasterArea.vue`
  - `src/pages/helper/admin/components/LocationMasterArea.vue`
  - `src/pages/helper/admin/components/ComponentCodeArea.vue`
  - `src/pages/helper/admin/composables/useWorkClassification.ts`
  - `src/pages/helper/admin/composables/useMaterialMaster.ts`
  - `src/pages/helper/admin/composables/useLocationMaster.ts`
  - `src/pages/helper/admin/composables/useComponentCode.ts`
- `project-admin.resource`
  - `src/pages/helper/admin/ResourceManagementPage.vue`
  - `src/pages/helper/admin/components/LaborTypeArea.vue`
  - `src/pages/helper/admin/components/EquipmentMasterArea.vue`
  - `src/pages/helper/admin/composables/useLaborType.ts`
  - `src/pages/helper/admin/composables/useEquipmentMaster.ts`
- `project-admin.document-setting`
  - `src/pages/helper/admin/DocumentSettingPage.vue`
  - `src/pages/helper/admin/components/MirSettingArea.vue`
  - `src/pages/helper/admin/components/PromptManagementArea.vue`
  - `src/pages/helper/admin/composables/useDocumentSetting.ts`
  - `src/pages/helper/admin/composables/usePromptManagement.ts`
  - `src/api/materialTypePrompt.ts`
  - `src/api/reference.ts`
- `project-admin.holiday`
  - `src/pages/helper/admin/HolidayManagementPage.vue`
  - `src/pages/helper/admin/components/HolidayCalendarArea.vue`
  - `src/pages/helper/admin/components/InactivePeriodDialog.vue`
  - `src/pages/helper/admin/composables/useHolidayManagement.ts`

## Top Feature: `system-admin`

- `system-admin.shell`
  - `src/pages/system-admin/SystemAdminPage.vue`
- `system-admin.project-management`
  - `src/pages/system-admin/components/ProjectManagementArea.vue`
  - `src/pages/system-admin/composables/useProjectManagement.ts`
- `system-admin.worker-management`
  - `src/pages/system-admin/components/WorkerManagementArea.vue`
  - `src/pages/system-admin/composables/useWorkerManagement.ts`
- `system-admin.company-management`
  - `src/pages/system-admin/components/CompanyManagementArea.vue`
  - `src/pages/system-admin/composables/useCompanyManagement.ts`
- `system-admin.role-management`
  - `src/pages/system-admin/components/RoleManagementArea.vue`
  - `src/pages/system-admin/composables/useRoleManagement.ts`
- `system-admin.mapping-management`
  - `src/pages/system-admin/components/MappingManagementArea.vue`
  - `src/pages/system-admin/composables/useMappingManagement.ts`
- `system-admin.data`
  - `src/api/super.ts`
  - `src/api/company.ts`
  - `src/types/super.ts`

## Top Feature: `shared`

- `shared.ui`
  - `src/components/ui/**/*`
- `shared.helper-ui`
  - `src/components/helper/*`
- `shared.analytics`
  - `src/lib/analytics/**/*`
- `shared.network-core`
  - `src/api/apiClient.ts`
- `shared.utils`
  - `src/lib/utils.ts`
- `shared.theme`
  - `src/stores/theme.ts`
- `shared.legacy-sample` (사용 여부 재검토)
  - `src/stores/counter.ts`

## 4) Stage A 실행 계획 (legacy 선이관, 상위 feature 기준)

## A-0. 베이스라인 고정

- [ ] `npm run lint`
- [ ] `npm run type-check`
- [ ] `npm run test:unit`
- [ ] `npm run build`
- [ ] 핵심 수동 플로우 점검
  - [ ] 로그인/로그아웃
  - [ ] `/helper/dashboard`
  - [ ] `/helper/schedule/2d`
  - [ ] `/helper/material/order`
  - [ ] `/system-admin`

## A-1. legacy 컨테이너 생성 + 호환 레이어

### A-1.1 legacy 디렉토리 생성

- [ ] `src/legacy/pages`
- [ ] `src/legacy/api`
- [ ] `src/legacy/components`
- [ ] `src/legacy/composables`
- [ ] `src/legacy/stores`
- [ ] `src/legacy/types`
- [ ] `src/legacy/lib`
- [ ] `src/legacy/utils`

### A-1.2 alias 호환 설정

`legacy` 이관 직후 앱 동작 유지를 위해 Vite/TS path에 호환 alias를 추가한다.

- [ ] `vite.config.ts`에 legacy alias 추가
  - [ ] `@/pages` -> `src/legacy/pages`
  - [ ] `@/api` -> `src/legacy/api`
  - [ ] `@/components` -> `src/legacy/components`
  - [ ] `@/composables` -> `src/legacy/composables`
  - [ ] `@/stores` -> `src/legacy/stores`
  - [ ] `@/types` -> `src/legacy/types`
  - [ ] `@/lib` -> `src/legacy/lib`
  - [ ] `@/utils` -> `src/legacy/utils`
- [ ] `tsconfig.app.json`, `tsconfig.json`에도 동일한 path 매핑 추가

## A-2. 상위 feature 기준 legacy 이관 배치

아래 이관은 **같은 브랜치에서**, **작은 커밋**으로 순차 수행한다.

### Batch 1: `app`

- [ ] `app.bootstrap`
- [ ] `app.routing`
- [ ] `app.shell`
- [ ] `app.public-home`
- [ ] `app.context`
- [ ] `app.legacy-shell-candidate`
- [ ] `app.test`

### Batch 2: `auth`

- [ ] `auth.login`
- [ ] `auth.signup`
- [ ] `auth.session`

### Batch 3: `dashboard`

- [ ] `dashboard.main`

### Batch 4: `schedule`

- [ ] `schedule.schedule-2d`
- [ ] `schedule.schedule-3d`

### Batch 5: `attendance`

- [ ] `attendance.input`
- [ ] `attendance.worker-register`
- [ ] `attendance.data`

### Batch 6: `material`

- [ ] `material.order`
- [ ] `material.incoming`
- [ ] `material.outgoing`
- [ ] `material.remaining`
- [ ] `material.shared-ui`
- [ ] `material.data`
- [ ] `material.legacy-candidate`

### Batch 7: `document`

- [ ] `document.manager`
- [ ] `document.daily-report`
- [ ] `document.material-inspection`

### Batch 8: `project-admin`

- [ ] `project-admin.master-data`
- [ ] `project-admin.resource`
- [ ] `project-admin.document-setting`
- [ ] `project-admin.holiday`

### Batch 9: `system-admin`

- [ ] `system-admin.shell`
- [ ] `system-admin.project-management`
- [ ] `system-admin.worker-management`
- [ ] `system-admin.company-management`
- [ ] `system-admin.role-management`
- [ ] `system-admin.mapping-management`
- [ ] `system-admin.data`

### Batch 10: `shared`

- [ ] `shared.ui`
- [ ] `shared.helper-ui`
- [ ] `shared.analytics`
- [ ] `shared.network-core`
- [ ] `shared.utils`
- [ ] `shared.theme`
- [ ] `shared.legacy-sample`

## A-3. Stage A 검증 게이트

각 Batch 완료 시 아래를 반복 검증한다.

- [ ] `npm run lint`
- [ ] `npm run type-check`
- [ ] `npm run test:unit`
- [ ] `npm run build`
- [ ] 라우트 smoke test
  - [ ] `/`
  - [ ] `/login`
  - [ ] `/signup`
  - [ ] `/helper/dashboard`
  - [ ] `/helper/material/order`
  - [ ] `/helper/schedule/2d`
  - [ ] `/system-admin`

## 5) Stage A 완료 산출물 (리뷰용)

Stage A 완료 시, 다음 산출물을 기준으로 Stage B 계획을 확정한다.

- [ ] legacy 이관 완료 리포트 (상위 feature/하위 feature별 이동 결과)
- [ ] 미사용/삭제 후보 리스트
  - [ ] `app.legacy-shell-candidate`
  - [ ] `material.legacy-candidate`
  - [ ] `shared.legacy-sample`
  - [ ] 기타 라우트 미연결 페이지
- [ ] alias 호환 레이어 목록
- [ ] Stage B 우선순위 후보 (예: `material.order`부터 신규 feature 구조 전환)

