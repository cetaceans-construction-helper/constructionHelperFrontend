# Feature Architecture Guardrails

## 1. 목적

이 문서는 `feature 기반 + 계층형 하이브리드 구조`를 팀 전체(사람/코딩 에이전트)에서 일관되게 적용하기 위한 규칙이다.

아래 규칙은 권장사항이 아니라 기본적으로 `MUST`(필수)다.

## 2. 기본 원칙 (필수 5가지)

### 2.1 동일 템플릿 사용

모든 feature는 동일한 내부 템플릿을 사용한다.

```txt
src/<top-feature>/<sub-feature>/
  ui/
  view-model/
  use-cases/
  model/
  infra/
  public.ts
```

규칙:
- `MUST`: 새 feature 생성 시 위 템플릿을 그대로 사용한다.
- `MUST`: 파일이 적어도 폴더 구조는 먼저 만든다.
- `MUST NOT`: 필요할 때마다 임의 폴더명(`hooks`, `services`, `utils2`)을 추가하지 않는다.

의도:
- 구조 예측 가능성 확보
- 리팩토링/코드리뷰 속도 향상

### 2.2 feature 간 import는 public.ts만 허용

다른 feature의 내부 파일을 직접 import 하지 않는다.

규칙:
- `MUST`: 외부에 공개할 심볼은 각 feature의 `public.ts`에서 export 한다.
- `MUST`: feature 간 참조는 `public.ts`만 통해서 가져온다.
- `MUST NOT`: `@/features/a/b/use-cases/foo` 같은 내부 경로 직접 import 금지

허용 예시:

```ts
import { createDeliveryUseCase } from '@/features/helper/material/order/public'
```

금지 예시:

```ts
import { createDeliveryUseCase } from '@/features/helper/material/order/use-cases/createDeliveryUseCase'
```

의도:
- 내부 구현 변경 시 외부 영향 최소화
- feature 경계 보호

### 2.3 경로는 alias만 사용

상대 경로 체인(`../../..`)을 금지하고 alias 경로만 사용한다.

규칙:
- `MUST`: `@/features/...`, `@/shared/...` 형태 사용
- `MUST NOT`: `../../../model/order` 같은 상대 경로 체인 사용 금지

허용 예시:

```ts
import type { Order } from '@/features/helper/material/order/model/order'
```

금지 예시:

```ts
import type { Order } from '../../../model/order'
```

의도:
- 파일 이동 시 import 깨짐 최소화
- 대규모 폴더 재배치 대응력 확보

### 2.4 도메인 prefix 네이밍 강제

store id, route name, analytics event key 등 식별 가능한 이름에는 도메인 prefix를 붙인다.

규칙:
- `MUST`: `<module>.<feature>.<action>` 패턴 사용
- `MUST`: 최소 3단계 prefix 유지 (`helper.material.order`)
- `MUST NOT`: `save`, `list`, `store` 같은 일반명 단독 사용 금지

예시:
- store id: `material.order.store`
- route name: `material.order.invoice`
- event key: `material.order.create_delivery.success`

의도:
- 추적/로그/디버깅 시 충돌 방지
- 의미가 드러나는 네이밍 확보

### 2.5 shared 승격 기준 명확화

공통화는 비용이 있으므로 기준 없이 shared로 옮기지 않는다.

승격 기준:
- `MUST`: 2개 이상 feature에서 반복 사용
- `MUST`: 특정 도메인에 종속되지 않음
- `MUST`: API가 안정적이고 변경 빈도가 낮음

승격 금지:
- 한 feature에서만 쓰이는 코드
- 도메인 용어가 강하게 붙은 코드
- 아직 요구사항이 자주 바뀌는 코드

의도:
- 조기 공통화(over-abstraction) 방지
- shared 폴더 비대화 방지

## 3. 계층 책임 (상세)

### 3.1 ui (Presentation View)

- 책임: 화면 렌더링, 사용자 입력 수집, 이벤트 바인딩
- 포함: `.vue` 페이지/컴포넌트, 표시용 포맷팅, 단순 조건 렌더링
- 금지: API 직접 호출, 도메인 규칙 판단, 복잡한 상태 전이 로직
- 의존: `view-model`만 의존 (`use-cases/infra` 직접 접근 금지)
- 입력/출력: ViewModel 상태를 입력받아 화면 출력, 사용자 이벤트를 ViewModel로 전달
- 테스트 포인트: 렌더링 결과, 클릭/입력 이벤트 연결, 접근성/표시 조건

### 3.2 view-model (Presentation Logic)

- 책임: 화면 상태 관리와 유스케이스 호출 오케스트레이션
- 포함: `isLoading`, `errorMessage`, `selectedOrder`, form state, 화면 전용 파생 상태
- 금지: 네트워크 구현, 도메인 핵심 규칙 정의, DTO 구조 의존
- 의존: `use-cases`, 필요 시 `model` 타입
- 입력/출력: UI 이벤트 입력 -> 유스케이스 실행 -> UI 친화 상태로 변환/노출
- 테스트 포인트: 상태 전이(`loading/success/fail`), 분기 처리, 에러 메시지 매핑

### 3.3 use-cases (Application Layer)

- 책임: 사용자 시나리오 단위 흐름 정의
- 포함: `getOrderList`, `createDelivery`, `updateDelivery` 같은 실행 단위
- 금지: Vue/Pinia/router/DOM 의존, axios 직접 사용
- 의존: `model`과 Repository 인터페이스(Port)
- 입력/출력: 명확한 입력 모델 -> 명확한 결과 모델(성공/실패)
- 테스트 포인트: 시나리오 분기, 예외 처리 정책, 리포지토리 호출 순서

### 3.4 model (Domain)

- 책임: 도메인 개념, 규칙, 불변조건의 단일 소스
- 포함: 엔티티/값 객체 타입, 검증 함수, 상태 전이 규칙
- 금지: UI/프레임워크/API 스펙 의존
- 의존: 없음(가장 안쪽 계층)
- 입력/출력: 순수 함수 중심 규칙 계산
- 테스트 포인트: 규칙 검증, 경계값, 상태 전이 허용/거부 조건

### 3.5 infra (Data)

- 책임: 외부 시스템(API/스토리지) 연동과 데이터 변환
- 포함: API 호출, Repository 구현체, DTO 정의, Mapper
- 금지: 화면 상태 관리, 화면 메시지 결정, 도메인 정책 결정
- 의존: `shared/api` 클라이언트, `model`(도메인 모델 변환용)
- 입력/출력: 외부 DTO <-> 도메인 모델 매핑
- 테스트 포인트: 매핑 정확성, API 에러 변환, 타임아웃/재시도 정책

### 3.6 계층 간 규칙 (필수)

- 실행 흐름은 `ui -> view-model -> use-cases -> infra`를 유지한다.
- `ui`는 `infra`를 직접 호출하지 않는다.
- `view-model`은 도메인 규칙을 새로 만들지 않고 `use-cases/model` 결과를 사용한다.
- `use-cases`는 프레임워크 의존 없이 유지한다.
- `infra`는 도메인 모델을 반환하고 raw DTO를 상위 계층으로 올리지 않는다.

## 4. 병렬 시작, 이후 nesting 병합 전략

초기에는 feature를 병렬로 만들고, 안정화 후 nesting으로 병합 가능하다.

병합 절차:
1. 새 nesting 경로 생성
2. 기존 경로에서 `public.ts` re-export 유지
3. import를 점진적으로 새 경로로 교체
4. 참조가 0이 되면 구경로 제거

주의:
- 한번에 대량 이동하지 않는다.
- 이동 작업은 기능 변경 PR과 분리한다.

## 5. PR 체크리스트 (사람/에이전트 공통)

아래 항목을 모두 통과해야 merge 가능:

- [ ] feature 템플릿(`ui/view-model/use-cases/model/infra/public.ts`)을 지켰다.
- [ ] feature 간 import는 `public.ts`만 사용했다.
- [ ] `../../..` 상대 경로 체인이 없다.
- [ ] 도메인 prefix 네이밍을 적용했다.
- [ ] shared 이동 시 2개 이상 재사용 근거를 PR 설명에 적었다.

## 6. 빠른 예시

```txt
src/features/material/order/
  ui/InvoicePage.vue
  view-model/useOrderInvoiceViewModel.ts
  use-cases/createDelivery.ts
  use-cases/getOrderList.ts
  model/order.ts
  model/orderStatus.ts
  infra/orderRepository.ts
  infra/orderApi.ts
  public.ts
```

`public.ts` 예시:

```ts
export { useOrderInvoiceViewModel } from './view-model/useOrderInvoiceViewModel'
export { createDelivery } from './use-cases/createDelivery'
export type { Order } from './model/order'
```
