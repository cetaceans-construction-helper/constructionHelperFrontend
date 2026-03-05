# Final Architecture

## 1. 목적

이 문서는 현재 코드베이스의 **최종 아키텍처 기준선**을 정의한다.

- 실제 디렉토리 구조 기준
- feature 경계/계층 책임 기준
- 신규 구현/리팩토링 시 따라야 할 고정 규칙 기준

## 2. 최종 디렉토리 구조 (현재 기준)

```txt
src/
  main.ts
  app/
    bootstrap/
    routing/
    shell/
    context/
    public-home/
  features/
    attendance/
      ui/
      view-model/
      use-cases/
      model/
      infra/
      public.ts
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
    document/
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
    project-admin/
      document-setting/
        ui/
        view-model/
        use-cases/
        model/
        infra/
        public.ts
      holiday/
        ui/
        view-model/
        use-cases/
        model/
        infra/
        public.ts
      master-data/
        ui/
        view-model/
        use-cases/
        model/
        infra/
        public.ts
      resource/
        ui/
        view-model/
        use-cases/
        model/
        infra/
        public.ts
    schedule/
      schedule-2d/
        ui/
        view-model/
        use-cases/
        model/
        infra/
        public.ts
      schedule-3d/
        ui/
        view-model/
        use-cases/
        model/
        infra/
        public.ts
    system-admin/
      ui/
      view-model/
      use-cases/
      model/
      infra/
      public.ts
  shared/
    analytics/
    helper-ui/
    network-core/
      apis/
      contracts/
    theme/
    ui/
    utils/
```

## 3. 상위 feature 구성 모드

### 3.1 Top 단일 모드

적용 대상:
- `attendance`
- `auth`
- `dashboard`
- `document`
- `material`
- `system-admin`

규칙:
- top feature 바로 아래에 `ui/view-model/use-cases/model/infra/public.ts`를 둔다.
- 하위 feature를 추가하지 않는다.

### 3.2 Wrapper + Sub 모드

적용 대상:
- `schedule` -> `schedule-2d`, `schedule-3d`
- `project-admin` -> `master-data`, `resource`, `document-setting`, `holiday`

규칙:
- wrapper(top) 자체에는 템플릿 계층을 두지 않는다.
- 하위 feature마다 템플릿 계층 + `public.ts`를 둔다.

## 4. 계층 책임

### 4.1 `ui`
- 화면 렌더링, 이벤트 연결, 표시 로직
- API 직접 호출 금지

### 4.2 `view-model`
- 화면 상태 관리, use-case 호출 오케스트레이션
- 외부 I/O 구현 금지

### 4.3 `use-cases`
- 사용자 시나리오 단위 흐름
- 프레임워크/뷰 계층 의존 금지

### 4.4 `model`
- 도메인 타입/규칙/검증
- 외부 API/DOM 의존 금지

### 4.5 `infra`
- API 연동, repository 구현, DTO 매핑
- 화면 상태/메시지 결정 금지

## 5. import 경계 규칙

- feature 간 import는 대상 feature의 `public.ts`만 허용
- app/shared에서 feature 접근 시 `public.ts`만 허용
- deep relative chain(`../../../`) 금지
- import 기본 형식: `@/...` alias 사용

## 6. shared 경계 규칙

`shared/*`로 이동 가능한 코드 조건:
- 2개 이상 feature에서 재사용
- 도메인 독립
- 인터페이스가 안정적

현재 shared 역할:
- `shared/network-core/apis`: 공통 API access 계층
- `shared/network-core/contracts`: 공통 계약 타입
- `shared/ui`, `shared/helper-ui`: 공통 UI
- `shared/analytics`: 분석/추적
- `shared/theme`: 전역 테마 상태
- `shared/utils`: 범용 유틸

## 7. 아키텍처 결정 요약

- 루트 `legacy` 제거 완료
- 루트 `api/lib/components/composables/stores/types/utils` 제거 완료
- 앱 진입은 `src/main.ts`, 앱 구성은 `src/app/*`
- 도메인 구현은 `src/features/*`, 공통은 `src/shared/*`
