# Feature Refactor Execution Plan (V4, End-to-End)

## 1) 고정 조건

- [ ] 브랜치는 하나만 사용: `codex/refactor-feature-architecture`
- [ ] 기능별 브랜치 분기 금지
- [ ] 커밋은 작은 단위로 분리 (구조 이동 / 로직 이동 / 규칙 적용)
- [ ] 시작은 `legacy` 선이관
- [ ] 계획/검증 단위는 `상위 feature -> 하위 feature` 2단계

## 2) 최종 목표 구조 (Target)

```txt
src/
  app/
    bootstrap/
    routing/
    shell/
    context/
    public-home/
  features/
    auth/
      login/
      signup/
      session/
    dashboard/
      main/
    schedule/
      schedule-2d/
      schedule-3d/
    attendance/
      input/
      worker-register/
      data/
    material/
      order/
      incoming/
      outgoing/
      remaining/
      data/
    document/
      manager/
      daily-report/
      material-inspection/
    project-admin/
      master-data/
      resource/
      document-setting/
      holiday/
    system-admin/
      shell/
      project-management/
      worker-management/
      company-management/
      role-management/
      mapping-management/
      data/
  shared/
    ui/
    helper-ui/
    analytics/
    network-core/
    utils/
    theme/
  legacy/
```

하위 feature 내부 템플릿(원칙):

```txt
<sub-feature>/
  ui/
  view-model/
  use-cases/
  model/
  infra/
  public.ts
```

예외:
- `app/*`, `shared/*`는 인프라 성격이라 위 템플릿을 강제하지 않는다.

## 3) 2단계 분류 기준 (확정)

- `app`: `bootstrap`, `routing`, `shell`, `public-home`, `context`
- `auth`: `login`, `signup`, `session`
- `dashboard`: `main`
- `schedule`: `schedule-2d`, `schedule-3d`
- `attendance`: `input`, `worker-register`, `data`
- `material`: `order`, `incoming`, `outgoing`, `remaining`, `data`
- `document`: `manager`, `daily-report`, `material-inspection`
- `project-admin`: `master-data`, `resource`, `document-setting`, `holiday`
- `system-admin`: `shell`, `project-management`, `worker-management`, `company-management`, `role-management`, `mapping-management`, `data`
- `shared`: `ui`, `helper-ui`, `analytics`, `network-core`, `utils`, `theme`

## 4) 커밋/검증 규칙

### 4.1 커밋 규칙

- [ ] 커밋 하나는 목적 하나
- [ ] 구조 이동 커밋과 동작 변경 커밋 분리
- [ ] 커밋 메시지에 `top/sub` 포함

예시:
- `chore(legacy/material.order): move files`
- `refactor(material.order): split use-cases from view-model`
- `chore(imports/material.order): route through public.ts`

## A-1. legacy 컨테이너 + 호환 레이어

### A-1.1 legacy 디렉토리

- [x] `src/legacy/pages`
- [x] `src/legacy/api`
- [x] `src/legacy/components`
- [x] `src/legacy/composables`
- [x] `src/legacy/stores`
- [x] `src/legacy/types`
- [x] `src/legacy/lib`
- [x] `src/legacy/utils`

### A-1.2 alias 호환

- [x] Vite legacy 우선 resolver 적용
- [x] TS path legacy 우선/fallback 매핑 적용

## A-2. legacy 이관 (Top feature 배치)

### Batch A2-1: `app`
- [x] `app.bootstrap`
- [x] `app.routing`
- [x] `app.shell`
- [x] `app.public-home`
- [x] `app.context`
- [x] `app.legacy-shell-candidate`
- [x] `app.test`

### Batch A2-2: `auth`
- [x] `auth.login`
- [x] `auth.signup`
- [x] `auth.session`

### Batch A2-3: `dashboard`
- [x] `dashboard.main`

### Batch A2-4: `schedule`
- [x] `schedule.schedule-2d`
- [x] `schedule.schedule-3d`

### Batch A2-5: `attendance`
- [x] `attendance.input`
- [x] `attendance.worker-register`
- [x] `attendance.data`

### Batch A2-6: `material`
- [x] `material.order`
- [x] `material.incoming`
- [x] `material.outgoing`
- [x] `material.remaining`
- [x] `material.data`
- [x] `material.legacy-candidate`

### Batch A2-7: `document`
- [ ] `document.manager`
- [ ] `document.daily-report`
- [ ] `document.material-inspection`

### Batch A2-8: `project-admin`
- [ ] `project-admin.master-data`
- [ ] `project-admin.resource`
- [ ] `project-admin.document-setting`
- [ ] `project-admin.holiday`

### Batch A2-9: `system-admin`
- [ ] `system-admin.shell`
- [ ] `system-admin.project-management`
- [ ] `system-admin.worker-management`
- [ ] `system-admin.company-management`
- [ ] `system-admin.role-management`
- [ ] `system-admin.mapping-management`
- [ ] `system-admin.data`

### Batch A2-10: `shared`
- [ ] `shared.ui`
- [ ] `shared.helper-ui`
- [ ] `shared.analytics`
- [ ] `shared.network-core`
- [ ] `shared.utils`
- [ ] `shared.theme`
- [ ] `shared.legacy-sample`

Stage A 완료 조건:
- [ ] 모든 코드가 `src/legacy/*` 또는 신규 위치에서 정상 resolve
- [ ] A2 전 배치 검증 통과

## 6) Stage B - 신규 아키텍처 뼈대 구축

## B-1. `src/app` 뼈대

- [ ] `src/app/bootstrap`
- [ ] `src/app/routing`
- [ ] `src/app/shell`
- [ ] `src/app/context`
- [ ] `src/app/public-home`

## B-2. `src/features` 뼈대 (2단계 분류 반영)

- [ ] `src/features/auth/{login,signup,session}`
- [ ] `src/features/dashboard/main`
- [ ] `src/features/schedule/{schedule-2d,schedule-3d}`
- [ ] `src/features/attendance/{input,worker-register,data}`
- [ ] `src/features/material/{order,incoming,outgoing,remaining,data}`
- [ ] `src/features/document/{manager,daily-report,material-inspection}`
- [ ] `src/features/project-admin/{master-data,resource,document-setting,holiday}`
- [ ] `src/features/system-admin/{shell,project-management,worker-management,company-management,role-management,mapping-management,data}`

## B-3. 하위 feature 템플릿 생성

각 하위 feature마다:

- [ ] `ui/`
- [ ] `view-model/`
- [ ] `use-cases/`
- [ ] `model/`
- [ ] `infra/`
- [ ] `public.ts`

## B-4. `src/shared` 뼈대 정리

- [ ] `src/shared/ui`
- [ ] `src/shared/helper-ui`
- [ ] `src/shared/analytics`
- [ ] `src/shared/network-core`
- [ ] `src/shared/utils`
- [ ] `src/shared/theme`

Stage B 완료 조건:
- [ ] 목표 폴더 스캐폴드 완성
- [ ] 아직 동작 변경 없음 (구조만 준비)

## 7) Stage C - Top Feature별 본 마이그레이션

진행 순서는 의존도 기준으로 고정한다.

1. `app`
2. `auth`
3. `dashboard`
4. `schedule`
5. `attendance`
6. `material`
7. `document`
8. `project-admin`
9. `system-admin`
10. `shared` 정리

각 Top Feature마다 아래 공통 절차를 적용한다:

- [ ] `legacy` 코드 -> 새 하위 feature로 이동
- [ ] `ui/view-model/use-cases/model/infra` 분리
- [ ] `public.ts` export 정리
- [ ] 외부 import를 `public.ts` 경유로 교체
- [ ] 라우터/셸 연결점 교체
- [ ] 배치 검증 수행

### C-1. `app`

- [ ] `main.ts`는 루트 유지, 내부 부트스트랩 로직만 `app/bootstrap`으로 이동
- [ ] 라우터 구성 `app/routing`으로 이동
- [ ] 셸 컴포넌트 `app/shell`로 이동
- [ ] 프로젝트/캘린더 컨텍스트 `app/context`로 이동

### C-2. `auth`

- [ ] `login`, `signup`, `session` 분리
- [ ] `auth.session`에서 token/유저 상태와 API 경계를 정리
- [ ] 라우트 참조/가드 참조를 `auth/public.ts` 기반으로 정리

### C-3. `dashboard`

- [ ] `dashboard.main`을 feature 템플릿에 맞게 분리
- [ ] 셸 의존 최소화 (입력은 props/컨텍스트, 로직은 use-cases)

### C-4. `schedule`

- [ ] `schedule-2d`, `schedule-3d` 독립 분리
- [ ] three engine 관련 코드는 3d 하위 feature로 우선 귀속
- [ ] 공용이 확실해지면 `shared` 승격

### C-5. `attendance`

- [ ] 현재 `material` UI 재사용 의존 제거
- [ ] `attendance.input` 전용 UI/VM 정리
- [ ] `attendance.data` API 경계 분리

### C-6. `material`

- [ ] `order`, `incoming`, `outgoing`, `remaining` 분리
- [ ] `material.data`와 하위 feature 간 repository 경계 명확화
- [ ] 상태 전이/검증 규칙을 `model`로 이동

### C-7. `document`

- [ ] `manager`, `daily-report`, `material-inspection` 분리
- [ ] 문서 생성/다운로드 로직 use-case로 이동

### C-8. `project-admin`

- [ ] `master-data`, `resource`, `document-setting`, `holiday` 분리
- [ ] 반복 CRUD 패턴 공통화는 2개 이상 재사용 확인 후 진행

### C-9. `system-admin`

- [ ] `shell` 분리
- [ ] 하위 관리 feature 각각 독립화
- [ ] `system-admin.data` 계약 명확화

### C-10. `shared` 정리

- [ ] 실제 2개 이상 feature 재사용 코드만 남김
- [ ] 도메인 특화 코드는 원래 feature로 회수

Stage C 완료 조건:
- [ ] 모든 Top Feature가 새 구조에서 동작
- [ ] 라우터가 `src/features`/`src/app` 기반으로 동작
- [ ] 신규 코드에 `legacy` 직접 import 없음

## 8) Stage D - Legacy 제거 및 호환 레이어 철거

## D-1. legacy 의존 제거

- [ ] `rg "src/legacy|@/legacy"` 검색 결과 0
- [ ] legacy resolver에서 fallback 경로 참조 제거

## D-2. alias 정리

- [ ] Vite legacy resolver 제거
- [ ] TS legacy path fallback 제거
- [ ] 최종 alias를 `@/* -> src/*` 단순화

## D-3. 코드 삭제

- [ ] `src/legacy/*` 제거
- [ ] 미사용 후보(`app.legacy-shell-candidate`, `material.legacy-candidate`, `shared.legacy-sample`) 처리

Stage D 완료 조건:
- [ ] legacy 코드/호환 로직 0
- [ ] 빌드/테스트/라우팅 정상

## 9) Stage E - 규칙 강제 및 릴리즈 준비

## E-1. Guardrails 자동화

- [ ] ESLint 규칙: 상대경로 체인 제한
- [ ] ESLint 규칙: feature 내부 직접 import 차단 (`public.ts` 강제)
- [ ] PR 템플릿에 Guardrails 체크리스트 반영

## E-2. 검증 강화

- [ ] 핵심 feature smoke 테스트 문서화
- [ ] 취약 구간(라우팅, 인증, schedule, material) 회귀 테스트 보강

## E-3. 문서 완료

- [ ] 최종 아키텍처 문서 업데이트
- [ ] 신규 feature 생성 가이드 업데이트

Stage E 완료 조건 (프로젝트 완료):
- [ ] `app/features/shared` 목표 구조 정착
- [ ] Guardrails 위반이 CI에서 차단
- [ ] legacy/임시 호환 코드 제거 완료

## 10) 진행 보드 (Top Feature 단위)

- [ ] `app` 완료
- [ ] `auth` 완료
- [ ] `dashboard` 완료
- [ ] `schedule` 완료
- [ ] `attendance` 완료
- [ ] `material` 완료
- [ ] `document` 완료
- [ ] `project-admin` 완료
- [ ] `system-admin` 완료
- [ ] `shared` 완료
- [ ] `legacy` 제거 완료
