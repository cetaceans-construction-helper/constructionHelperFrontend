# Feature Creation And Maintenance Guide

## 1. 문서 목적

이 문서는 신규 feature 생성과 기존 feature 유지보수 시 팀/에이전트가 동일한 방식으로 작업하도록 하는 실행 가이드다.

## 2. 생성 전 결정

신규 기능은 아래 둘 중 하나로 시작한다.

### 2.1 Top 단일 모드 (기본)

아래 조건이면 top 단일로 시작한다.
- 하나의 응집된 도메인
- 분리된 하위 기능 간 독립 배포/운영 필요가 없음
- 복잡도가 아직 낮음

구조:

```txt
src/features/<feature>/
  ui/
  view-model/
  use-cases/
  model/
  infra/
  public.ts
```

### 2.2 Wrapper + Sub 모드

아래 조건이면 wrapper + sub로 시작한다.
- 하위 기능 간 변경 주기/담당 팀이 다름
- 하위 기능을 독립적으로 운영/배포/회귀 검증해야 함
- 하위 경계가 도메인적으로 명확함

구조:

```txt
src/features/<wrapper>/<sub-feature>/
  ui/
  view-model/
  use-cases/
  model/
  infra/
  public.ts
```

주의:
- wrapper top 자체에 템플릿 계층을 두지 않는다.
- top 템플릿과 sub 템플릿은 공존 금지.

## 3. 신규 feature 생성 절차

1. feature 모드 결정 (Top 단일 / Wrapper+Sub)
2. 표준 템플릿 디렉토리 생성
3. `public.ts` 생성 후 외부 공개 심볼만 export
4. `ui -> view-model -> use-cases -> infra` 흐름으로 코드 배치
5. 라우트가 필요하면 `app/routing`에서 `public.ts`만 참조
6. lint/type-check/build 통과 확인

## 4. 계층별 작성 규칙

### 4.1 `ui`
- 화면과 이벤트 바인딩만 담당
- API 호출 로직 금지

### 4.2 `view-model`
- 화면 상태 + use-case 호출
- 도메인 규칙 정의 금지

### 4.3 `use-cases`
- 시나리오 단위 동작 흐름
- Vue/DOM/라우터 의존 금지

### 4.4 `model`
- 도메인 타입/검증/규칙
- 외부 I/O 의존 금지

### 4.5 `infra`
- API/저장소 연동
- DTO <-> 도메인 매핑

## 5. import 규칙

- feature 간 import는 `public.ts`만 허용
- deep relative chain(`../../../`) 금지
- alias(`@/...`) 경로 사용
- 외부 공개가 필요한 심볼은 반드시 `public.ts`를 통해 제공

## 6. `public.ts` 운영 규칙

- 외부 노출이 필요한 심볼만 export
- 내부 구현 파일 경로를 외부에서 직접 참조하지 않도록 보호
- breaking change가 필요한 경우 `public.ts`에서 먼저 호환 레이어를 제공하고 단계적으로 정리

예시:

```ts
// src/features/example/public.ts
export { useExamplePage } from '@/features/example/view-model/useExamplePage'
export { exampleApi } from '@/features/example/infra/example-api'
export type { Example } from '@/features/example/model/example-types'
```

## 7. shared 승격 기준

아래를 모두 만족할 때만 `shared/*`로 이동한다.
- 2개 이상 feature에서 재사용
- 특정 도메인 용어에 종속되지 않음
- 인터페이스가 안정적

아래는 승격 금지:
- 단일 feature 전용 코드
- 요구사항이 빠르게 변하는 코드
- 도메인 의미가 강한 코드

## 8. 유지보수 작업 규칙

### 8.1 작은 단위로 변경
- 구조 이동과 로직 변경을 분리
- feature 단위로 검증 가능한 크기로 커밋

### 8.2 경계 유지
- feature 내부 구현은 외부에 노출하지 않음
- shared를 과도하게 키우지 않음

### 8.3 리팩토링 시 체크
- 새 import가 `public.ts`를 통하는지
- `ui/view-model/use-cases/model/infra` 책임이 섞이지 않았는지
- 기존 라우팅/인증/핵심 플로우 회귀가 없는지

## 9. PR 체크리스트

- [ ] 선택한 모드(Top 단일 / Wrapper+Sub)에 맞는 템플릿 구조를 사용했다.
- [ ] top 템플릿과 sub 템플릿을 동시에 두지 않았다.
- [ ] feature 간 import는 `public.ts`만 사용했다.
- [ ] `../../../` 이상의 deep relative import가 없다.
- [ ] shared 승격 시 2개 이상 재사용 근거를 PR에 남겼다.
- [ ] `npm run lint` / `npm run type-check` / `npm run build` 통과했다.
