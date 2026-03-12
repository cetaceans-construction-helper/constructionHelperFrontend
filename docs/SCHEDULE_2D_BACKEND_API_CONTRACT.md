# 2D Schedule Rebuild Backend API Contract

작성일: 2026-03-12

관련 문서:
- [docs/SCHEDULE_2D_REBUILD_PLAN.md](/Users/leo/Desktop/fun/programming/constructionHelperFrontend/docs/SCHEDULE_2D_REBUILD_PLAN.md)

## 1. 목적

- 현재 `schedule-2d-rebuild` 프론트가 사용 중인 상위/하위 공정, 독립 summary bar, `dependency`, `link`, `critical path`를 저장/조회할 수 있는 백엔드 계약 초안이다.
- 기존 [`workApi`](/Users/leo/Desktop/fun/programming/constructionHelperFrontend/src/shared/network-core/apis/work.ts), [`workPathApi`](/Users/leo/Desktop/fun/programming/constructionHelperFrontend/src/shared/network-core/apis/workPath.ts)의 역할을 유지하되, `path`에 섞여 있던 세 개의 의미를 분리한다.
- 1차 목표는 프론트가 실제 저장 가능한 MVP를 확보하는 것이다. `group`, `milestone`은 2차 계약으로 분리한다.

## 2. MVP 범위

이번 계약에서 반드시 필요한 것:

- 상위 공정 / 하위 공정 tree 조회, 생성, 수정
- 하위 공정 row에만 작업(`work`)을 귀속하는 구조
- 상위 공정 summary 기간의 독립 저장
- 작업 생성, 수정, 삭제
- `dependency` CRUD
- `link` CRUD
- `critical path` 조회
- 전체 화면을 한 번에 그릴 수 있는 aggregate snapshot 조회

이번 계약에서 제외 가능한 것:

- 그룹 저장
- 마일스톤 저장
- dependency relation type 다변화(`SS`, `FF` 등)
- critical path 수동 편집

## 3. 핵심 비즈니스 규칙

### 3.1 공정(row) 규칙

- 공정은 `PARENT`, `CHILD` 두 종류만 필요하다.
- 작업은 반드시 `CHILD` 공정에만 속해야 한다.
- `PARENT` 공정은 독립적인 `summaryStartDate`, `summaryEndDate`를 가진다.
- `PARENT` 공정 기간은 자식 작업 합집합으로 강제 계산하지 않는다.
- 자식 작업 기간이 상위 공정보다 길거나 짧으면 프론트에서 해치로 표시한다. 백엔드는 단순 저장만 하면 된다.

### 3.2 dependency 규칙

- 의미: 선후행 제약(`finish-to-start`)
- 저장 필드: `sourceWorkId`, `targetWorkId`, `lagDays`
- 현재 UI는 `relationType = FS`만 사용한다.
- 제약식:
  - `target.startDate >= source.endDate + lagDays + 1일`
- 동작 규칙:
  - 선행 작업을 뒤로 밀어서 제약이 깨지면 후행 작업이 따라 밀린다.
  - 후행 작업을 앞으로 당겨도 선행 작업은 따라 움직이지 않는다.

### 3.3 link 규칙

- 의미: 고정 gap 일수 관계
- 저장 필드: `sourceWorkId`, `targetWorkId`, `gapDays`
- 제약식:
  - `target.startDate = source.endDate + gapDays + 1일`
- 동작 규칙:
  - 앞 작업이나 뒤 작업 어느 쪽을 움직여도 연결된 집합이 gap을 유지하며 함께 움직인다.
  - `gapDays`는 signed integer여야 한다.
  - 예시:
    - `gapDays = 0`: 앞 작업 끝 다음날 시작
    - `gapDays = +2`: 2일 띄우고 시작
    - `gapDays = -2`: 2일 겹치게 시작

### 3.4 critical path 규칙

- 의미: 계산/표시용 하이라이트 레이어
- 현재 프론트는 read-only로 사용한다.
- `dependency`, `link`와 별도 엔티티 또는 계산 결과로 제공되어야 한다.

## 4. 권장 API 구성

권장안은 `1개 aggregate 조회 + entity별 CRUD` 구조다.

이유:

- 프론트는 화면 진입 시 snapshot 하나로 전체를 그리는 편이 안정적이다.
- 쓰기 API는 개별 entity 단위가 백엔드 구현과 디버깅이 쉽다.
- 1차 프론트 저장 연동은 mutation 성공 후 `getScheduleSnapshot` 재조회 방식으로 붙일 수 있다.

권장 resource:

- `/schedule2d`
- `/scheduleProcess`
- `/work`
- `/scheduleDependency`
- `/scheduleLink`
- `/scheduleCriticalPath`

## 5. API 상세

### 5.1 전체 스냅샷 조회

`GET /schedule2d/getScheduleSnapshot`

목적:

- 좌측 row tree
- 우측 bar
- dependency / link / critical path
- 향후 group / milestone

를 한 번에 내려준다.

Response:

```json
{
  "projectId": "PJT-001",
  "processes": [
    {
      "scheduleProcessId": 101,
      "parentProcessId": null,
      "processKind": "PARENT",
      "processName": "토공사",
      "colorHex": "#64748b",
      "orderNo": 0,
      "collapsed": false,
      "summaryStartDate": "2026-03-01",
      "summaryEndDate": "2026-04-30",
      "workTypeId": null,
      "workTypeName": null,
      "subWorkTypeId": null,
      "subWorkTypeName": null
    },
    {
      "scheduleProcessId": 102,
      "parentProcessId": 101,
      "processKind": "CHILD",
      "processName": "터파기",
      "colorHex": null,
      "orderNo": 1,
      "collapsed": false,
      "summaryStartDate": null,
      "summaryEndDate": null,
      "workTypeId": 11,
      "workTypeName": "토공사",
      "subWorkTypeId": 111,
      "subWorkTypeName": "터파기"
    }
  ],
  "works": [
    {
      "workId": 9001,
      "projectId": "PJT-001",
      "scheduleProcessId": 102,
      "workName": "1구간 굴착",
      "startDate": "2026-03-03",
      "completionDate": "2026-03-08",
      "workLeadTime": 6,
      "colorHex": "#0ea5e9",
      "isWorkingOnHoliday": false,
      "division": "건축",
      "workType": "토공사",
      "subWorkType": "터파기",
      "subWorkTypeId": 111,
      "positionY": 0,
      "annotation": ""
    }
  ],
  "dependencies": [
    {
      "dependencyId": 5001,
      "sourceWorkId": 9001,
      "targetWorkId": 9002,
      "relationType": "FS",
      "lagDays": 0,
      "pathName": null,
      "colorHex": "#64748b"
    }
  ],
  "links": [
    {
      "linkId": 6001,
      "sourceWorkId": 9003,
      "targetWorkId": 9004,
      "gapDays": 2,
      "pathName": null,
      "colorHex": "#64748b"
    }
  ],
  "criticalPaths": [
    {
      "criticalPathId": 7001,
      "sourceWorkId": 9001,
      "targetWorkId": 9002,
      "colorHex": "#dc2626"
    }
  ],
  "groups": [],
  "milestones": [],
  "metadata": {
    "snapshotVersion": 12,
    "generatedAt": "2026-03-12T10:30:00+09:00"
  }
}
```

필수 규칙:

- `processes.orderNo`는 전 공정 트리에서 유일한 flat order여야 한다.
- `works.scheduleProcessId`는 반드시 `processKind = CHILD`인 공정을 가리켜야 한다.
- 아직 미구현이어도 `groups`, `milestones`는 빈 배열로 내려주는 것이 안전하다.

### 5.2 공정(row) API

#### 생성

`POST /scheduleProcess/createScheduleProcess`

Request:

```json
{
  "parentProcessId": null,
  "processKind": "PARENT",
  "processName": "토공사",
  "orderNo": 0,
  "colorHex": null,
  "collapsed": false,
  "summaryStartDate": "2026-03-01",
  "summaryEndDate": "2026-04-30",
  "workTypeId": null,
  "subWorkTypeId": null
}
```

Child 생성 예시:

```json
{
  "parentProcessId": 101,
  "processKind": "CHILD",
  "processName": "터파기",
  "orderNo": 1,
  "colorHex": null,
  "collapsed": false,
  "summaryStartDate": null,
  "summaryEndDate": null,
  "workTypeId": 11,
  "subWorkTypeId": 111
}
```

#### 수정

`PUT /scheduleProcess/updateScheduleProcess/{scheduleProcessId}`

허용 필드:

- `processName`
- `colorHex`
- `orderNo`
- `collapsed`
- `summaryStartDate`
- `summaryEndDate`
- `parentProcessId`

주의:

- `CHILD -> PARENT`, `PARENT -> CHILD` kind 변경은 1차에서 금지하는 것이 안전하다.
- `summaryStartDate`, `summaryEndDate`는 `PARENT`에만 의미가 있다.

#### 삭제

`DELETE /scheduleProcess/deleteScheduleProcess/{scheduleProcessId}`

권장 동작:

- `PARENT` 삭제 시 하위 `CHILD` 공정도 함께 삭제
- 해당 공정에 속한 `work`, `dependency`, `link`, `critical path`도 cascade delete

현재 UI에서는 row 삭제가 핵심 기능은 아니므로, 1차에서 제외해도 된다. 다만 백엔드가 제공 가능하면 이후 확장에 유리하다.

### 5.3 작업(work) API 확장

기존 `/work/*`를 재사용하되 payload/response를 확장하는 것을 권장한다.

#### `CreateWorkPayload` 추가 필드

- `scheduleProcessId: number`
- `workName?: string`
- `colorHex?: string | null`

#### `UpdateWorkPayload` 추가 필드

- `scheduleProcessId?: number`
- `workName?: string`
- `completionDate?: string`
- `colorHex?: string | null`

주의:

- 현재 UI는 drag/resize 결과를 `startDate`, `completionDate` 기준으로 다룬다.
- 따라서 백엔드는 `completionDate` 직접 수정 또는 `startDate + workLeadTime` 양쪽을 모두 받을 수 있는 형태가 좋다.
- 응답의 `WorkResponse`에도 `scheduleProcessId`, `colorHex`가 포함되어야 한다.

### 5.4 dependency API

#### 조회

snapshot에 포함해서 내려주면 충분하다.

#### 생성

`POST /scheduleDependency/createScheduleDependency`

Request:

```json
{
  "sourceWorkId": 9001,
  "targetWorkId": 9002,
  "relationType": "FS",
  "lagDays": 0,
  "pathName": null,
  "colorHex": "#64748b"
}
```

#### 수정

`PUT /scheduleDependency/updateScheduleDependency/{dependencyId}`

허용 필드:

- `lagDays`
- `pathName`
- `colorHex`

#### 삭제

`DELETE /scheduleDependency/deleteScheduleDependency/{dependencyId}`

### 5.5 link API

#### 조회

snapshot에 포함해서 내려주면 충분하다.

#### 생성

`POST /scheduleLink/createScheduleLink`

Request:

```json
{
  "sourceWorkId": 9003,
  "targetWorkId": 9004,
  "gapDays": -2,
  "pathName": null,
  "colorHex": "#64748b"
}
```

#### 수정

`PUT /scheduleLink/updateScheduleLink/{linkId}`

허용 필드:

- `gapDays`
- `pathName`
- `colorHex`

#### 삭제

`DELETE /scheduleLink/deleteScheduleLink/{linkId}`

### 5.6 critical path API

권장안:

- 1차는 read-only
- snapshot에 `criticalPaths` 배열로 포함

선택지:

1. 백엔드 계산 결과를 내려준다.
2. 백엔드가 수동 저장된 pair를 내려준다.

현재 프론트는 둘 다 수용 가능하다. 다만 1차는 write API가 없어도 된다.

## 6. DTO 정의 요약

### 6.1 ScheduleProcessResponse

```ts
interface ScheduleProcessResponse {
  scheduleProcessId: number
  parentProcessId: number | null
  processKind: 'PARENT' | 'CHILD'
  processName: string
  colorHex: string | null
  orderNo: number
  collapsed: boolean
  summaryStartDate: string | null
  summaryEndDate: string | null
  workTypeId: number | null
  workTypeName: string | null
  subWorkTypeId: number | null
  subWorkTypeName: string | null
}
```

### 6.2 WorkResponse 확장안

```ts
interface WorkResponseV2 {
  workId: number
  projectId: string
  scheduleProcessId: number
  workName: string
  startDate: string
  completionDate: string
  workLeadTime: number
  colorHex: string | null
  isWorkingOnHoliday: boolean
  division: string
  workType: string
  subWorkType: string
  subWorkTypeId: number
  positionY: number
  annotation?: string
}
```

### 6.3 ScheduleDependencyResponse

```ts
interface ScheduleDependencyResponse {
  dependencyId: number
  sourceWorkId: number
  targetWorkId: number
  relationType: 'FS'
  lagDays: number
  pathName: string | null
  colorHex: string
}
```

### 6.4 ScheduleLinkResponse

```ts
interface ScheduleLinkResponse {
  linkId: number
  sourceWorkId: number
  targetWorkId: number
  gapDays: number
  pathName: string | null
  colorHex: string
}
```

### 6.5 ScheduleCriticalPathResponse

```ts
interface ScheduleCriticalPathResponse {
  criticalPathId: number
  sourceWorkId: number
  targetWorkId: number
  colorHex: string
}
```

## 7. 프론트 액션과 API 매핑

| 프론트 액션 | API |
| --- | --- |
| 화면 진입 | `GET /schedule2d/getScheduleSnapshot` |
| 상위 공정 추가 | `POST /scheduleProcess/createScheduleProcess` |
| 하위 공정 추가 | `POST /scheduleProcess/createScheduleProcess` |
| 상위 공정 이름/색 변경 | `PUT /scheduleProcess/updateScheduleProcess/{id}` |
| 상위 공정 summary bar 이동/리사이즈 | `PUT /scheduleProcess/updateScheduleProcess/{id}` |
| 작업 생성 | `POST /work/createWork` |
| 작업 이름/색 변경 | `PUT /work/updateWork/{id}` |
| 작업 이동/리사이즈 | `PUT /work/updateWork/{id}` |
| 작업 삭제 | `DELETE /work/deleteWork/{id}` |
| dependency 생성 | `POST /scheduleDependency/createScheduleDependency` |
| dependency 제거 | `DELETE /scheduleDependency/deleteScheduleDependency/{id}` |
| link 생성 | `POST /scheduleLink/createScheduleLink` |
| link gap 수정 | `PUT /scheduleLink/updateScheduleLink/{id}` |
| link 제거 | `DELETE /scheduleLink/deleteScheduleLink/{id}` |

## 8. 기존 workPath 마이그레이션 기준

현재 `workPath`는 의미가 섞여 있으므로 신규 API로 이동할 때 아래 기준을 추천한다.

- 모든 `workPath.edges`는 `dependency`로 변환
- `edge.lagDays`가 있는 경우:
  - 기존 비즈니스에서 이것이 "강한 gap" 의미였다면 `link.gapDays`로 변환
  - 단순 선후행 지연 의미였다면 `dependency.lagDays`로 유지
- `workPath.critical = true`는 `criticalPaths`로 분리

주의:

- 현재 프론트는 `dependency`, `link`, `critical path`를 서로 다른 의미로 처리한다.
- 따라서 신규 리빌드 화면에서는 기존 `/workPath/*`를 그대로 write API로 재사용하면 의미 충돌이 다시 생긴다.

## 9. 2차 계약 항목

이번 문서에는 포함하지 않지만, 이후 필요해질 항목:

- `group`
  - `groupId`
  - `parentGroupId`
  - `memberWorkIds`
- `milestone`
  - `milestoneId`
  - `date`
  - `label`
  - `colorHex`
  - `scheduleProcessId | null`

## 10. 권장 합의안

백엔드 팀에 요청할 때는 아래 수준으로 먼저 합의하는 것이 가장 빠르다.

1. `GET /schedule2d/getScheduleSnapshot` 추가
2. `scheduleProcess` 신규 CRUD 추가
3. `work`에 `scheduleProcessId`, `colorHex`, `workName`, `completionDate` update 지원 추가
4. `scheduleDependency` 신규 CRUD 추가
5. `scheduleLink` 신규 CRUD 추가
6. `criticalPaths`는 1차 read-only로 snapshot 포함

이 6개가 되면 현재까지 구현한 2D 공정표 UI는 저장 연동을 시작할 수 있다.
