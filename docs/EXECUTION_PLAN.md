# Feature Refactor Execution Plan (V5, End-to-End)

## 1) 고정 조건

- [ ] 브랜치는 하나만 사용: `codex/refactor-feature-architecture`
- [ ] 기능별 브랜치 분기 금지
- [ ] 커밋은 작은 단위로 분리 (구조 이동 / 로직 이동 / 규칙 적용)
- [ ] 시작은 `legacy` 선이관
- [ ] 계획/검증 단위는 기본 `상위 feature -> 하위 feature` 2단계
- [ ] 하위 feature는 의무가 아니라, 필요 시 분리/통합 가능한 선택 단위로 본다
- [ ] 하위 feature를 채택한 top feature에는 top 템플릿(`ui/view-model/use-cases/model/infra/public.ts`)을 두지 않는다

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
      ui/
      view-model/
      use-cases/
      model/
      infra/
      public.ts
    dashboard/
      ui/
      view-model/
      use-cases/
      model/
      infra/
      public.ts
    schedule/
      schedule-2d/
      schedule-3d/
    attendance/
      ui/
      view-model/
      use-cases/
      model/
      infra/
      public.ts
    material/
      ui/
      view-model/
      use-cases/
      model/
      infra/
      public.ts
    document/
      ui/
      view-model/
      use-cases/
      model/
      infra/
      public.ts
    project-admin/
      master-data/
      resource/
      document-setting/
      holiday/
    system-admin/
      ui/
      view-model/
      use-cases/
      model/
      infra/
      public.ts
  shared/
    ui/
    helper-ui/
    analytics/
    network-core/
    utils/
    theme/
  legacy/
```

하위 feature 템플릿(분리 시 적용):

```txt
<sub-feature>/
  ui/
  view-model/
  use-cases/
  model/
  infra/
  public.ts
```

top feature 단일 템플릿(하위 미분리 시 허용):

```txt
<top-feature>/
  ui/
  view-model/
  use-cases/
  model/
  infra/
  public.ts
```

템플릿 적용 규칙:
- 하위 feature를 쓰는 top feature는 하위 feature 디렉토리만 가진다.
- 하위 feature를 쓰는 top feature에는 top 템플릿을 두지 않는다.
- top 단일 템플릿과 하위 feature 템플릿은 동시에 공존할 수 없다.

예외:
- `app/*`, `shared/*`는 인프라 성격이라 위 템플릿을 강제하지 않는다.

## 3) 2단계 분류 기준 (기본안, 필요 시 통합 가능)

- `app`: `bootstrap`, `routing`, `shell`, `public-home`, `context`
- `auth`: top 단일 템플릿 (`ui/view-model/use-cases/model/infra/public.ts`)
- `dashboard`: top 단일 템플릿 (`ui/view-model/use-cases/model/infra/public.ts`)
- `schedule`: `schedule-2d`, `schedule-3d` (wrapper + sub)
- `attendance`: top 단일 템플릿 (`ui/view-model/use-cases/model/infra/public.ts`)
- `material`: top 단일 템플릿 (`ui/view-model/use-cases/model/infra/public.ts`)
- `document`: top 단일 템플릿 (`ui/view-model/use-cases/model/infra/public.ts`)
- `project-admin`: `master-data`, `resource`, `document-setting`, `holiday` (wrapper + sub)
- `system-admin`: top 단일 템플릿 (`ui/view-model/use-cases/model/infra/public.ts`)
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
- [x] `auth` (legacy: `login/signup/session`)

### Batch A2-3: `dashboard`
- [x] `dashboard` 단일 feature (legacy: `dashboard.main`)

### Batch A2-4: `schedule`
- [x] `schedule.schedule-2d`
- [x] `schedule.schedule-3d`

### Batch A2-5: `attendance`
- [x] `attendance` (legacy: `input/register/data`)

### Batch A2-6: `material`
- [x] `material` (legacy: `order/incoming/outgoing/remaining/data`)
- [x] `material.legacy-candidate`

### Batch A2-7: `document`
- [x] `document` (legacy: `manager/daily-report/material-inspection`)

### Batch A2-8: `project-admin`
- [x] `project-admin.master-data`
- [x] `project-admin.resource`
- [x] `project-admin.document-setting`
- [x] `project-admin.holiday`

### Batch A2-9: `system-admin`
- [x] `system-admin` (legacy: `shell/project/worker/company/role/mapping/data`)


### Batch A2-10: `shared`
- [x] `shared.ui`
- [x] `shared.helper-ui`
- [x] `shared.analytics`
- [x] `shared.network-core`
- [x] `shared.utils`
- [x] `shared.theme`
- [x] `shared.legacy-sample`

Stage A 완료 조건:
- [x] 모든 코드가 `src/legacy/*` 또는 신규 위치에서 정상 resolve
- [x] A2 전 배치 검증 통과

## 6) Stage B - 신규 아키텍처 뼈대 구축

## B-1. `src/app` 뼈대

- [x] `src/app/bootstrap`
- [x] `src/app/routing`
- [x] `src/app/shell`
- [x] `src/app/context`
- [x] `src/app/public-home`

## B-2. `src/features` 뼈대 (Top-first, Sub optional)

Top feature 기본 스캐폴드:

- [x] `src/features/auth`
- [x] `src/features/dashboard`
- [x] `src/features/attendance`
- [x] `src/features/material`
- [x] `src/features/document`
- [x] `src/features/system-admin`

Wrapper + sub 스캐폴드:

- [x] `src/features/schedule/{schedule-2d,schedule-3d}`
- [x] `src/features/project-admin/{master-data,resource,document-setting,holiday}`

## B-3. feature 템플릿 생성 (Top/Sub 상호 배타)

Top 단일 구조를 쓰는 Top feature(현재 채택 구조: `auth`, `dashboard`, `attendance`, `material`, `document`, `system-admin`):

- [x] `ui/`
- [x] `view-model/`
- [x] `use-cases/`
- [x] `model/`
- [x] `infra/`
- [x] `public.ts`
- [x] 하위 feature 미생성(단일 구조 유지)

Sub feature를 쓰는 Wrapper Top feature(현재 채택 구조: `schedule`, `project-admin`):

- [x] `ui/`
- [x] `view-model/`
- [x] `use-cases/`
- [x] `model/`
- [x] `infra/`
- [x] `public.ts`
- [x] wrapper top에는 top 템플릿 없음

## B-4. `src/shared` 뼈대 정리

- [x] `src/shared/ui`
- [x] `src/shared/helper-ui`
- [x] `src/shared/analytics`
- [x] `src/shared/network-core`
- [x] `src/shared/utils`
- [x] `src/shared/theme`

Stage B 완료 조건:
- [x] 목표 폴더 스캐폴드 완성
- [x] sub 채택 top feature에서 top 템플릿 제거 완료
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

- [ ] `legacy` 코드 -> 새 feature 구조로 이동 (top 단일 또는 sub feature 구조 중 하나 선택)
- [ ] `ui/view-model/use-cases/model/infra`를 선택한 구조 기준으로 분리
- [ ] `public.ts` export 정리 (sub 구조면 sub `public.ts`, top 단일이면 top `public.ts`)
- [ ] 외부 import를 선택한 구조의 `public.ts`만 경유하도록 교체
- [ ] 라우터/셸 연결점 교체
- [ ] 배치 검증 수행

### C-1. `app`

- [x] `main.ts`는 루트 유지, 내부 부트스트랩 로직만 `app/bootstrap`으로 이동
- [x] 라우터 구성 `app/routing`으로 이동
- [x] 셸 컴포넌트 `app/shell`로 이동
- [x] 프로젝트/캘린더 컨텍스트 `app/context`로 이동

### C-2. `auth`

- [x] `auth` 단일 feature로 통합 유지 (login/signup/session 로직 포함)
- [x] token/유저 상태/API 경계를 `auth` 내부에서 정리
- [x] 라우트 참조/가드 참조를 `auth/public.ts` 기반으로 정리

### C-3. `dashboard`

- [x] `dashboard`를 top 단일 템플릿 기준으로 정리
- [x] 셸 의존 최소화 (입력은 props/컨텍스트, 로직은 use-cases)

### C-4. `schedule`

- [x] `schedule-2d`, `schedule-3d` 독립 분리
- [x] three engine 관련 코드는 3d 하위 feature로 우선 귀속
- [x] 공용이 확실해지면 `shared` 승격

### C-5. `attendance`

- [x] `material` UI 재사용 의존 제거
- [x] `attendance` 단일 feature로 통합 유지
- [x] API 경계를 `attendance/public.ts` 기준으로 정리

### C-6. `material`

- [ ] `material` 단일 feature로 통합 유지
- [ ] use-case/repository 경계를 `material` 내부에서 명확화
- [ ] 상태 전이/검증 규칙을 `model`로 이동

### C-7. `document`

- [ ] `document` 단일 feature로 통합 유지
- [ ] 문서 생성/다운로드 로직 use-case로 이동

### C-8. `project-admin`

- [ ] `master-data`, `resource`, `document-setting`, `holiday` 분리
- [ ] 반복 CRUD 패턴 공통화는 2개 이상 재사용 확인 후 진행

### C-9. `system-admin`

- [ ] `system-admin` 단일 feature로 통합 유지
- [ ] 내부 UI/업무 섹션 분리는 폴더가 아닌 use-case/view-model 경계로 관리
- [ ] 시스템관리 API 계약을 `system-admin` 내부에서 명확화

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

- [x] `app` 완료
- [x] `auth` 완료
- [x] `dashboard` 완료
- [x] `schedule` 완료
- [x] `attendance` 완료
- [ ] `material` 완료
- [ ] `document` 완료
- [ ] `project-admin` 완료
- [ ] `system-admin` 완료
- [ ] `shared` 완료
- [ ] `legacy` 제거 완료
