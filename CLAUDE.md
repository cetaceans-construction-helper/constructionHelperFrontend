# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vue 3 + TypeScript construction management frontend with 3D visualization (Three.js) and graph-based scheduling (Vue Flow). Uses Vite build tool, Tailwind CSS, shadcn-vue components, and Pinia state management.

## Commands

### Development
```bash
npm install              # Install dependencies
npm run dev             # Start dev server with HMR
npm run build           # Type-check + production build (parallel)
npm run preview         # Preview production build
```

### Code Quality
```bash
npm run type-check      # TypeScript validation (vue-tsc)
npm run lint            # ESLint with auto-fix and caching
npm run format          # Prettier formatting
npm run test:unit       # Run Vitest unit tests
```

### Build Components
```bash
npm run build-only      # Build without type-checking
```

## Architecture

### Routing Structure

4-level navigation hierarchy:

1. **Sections** (top header buttons): 공정관리, 자재관리, 안전관리, 문서관리, 유용한 기능
2. **Menus** (sidebar): Dynamic per section, defined in `ConstructionHelperPage.vue`
3. **Areas** (`AreaCard` component): Content cards with optional tabs
4. **Tabs** (browser-tab style): Within area cards

Routes are nested under `/helper` with lazy-loading. Each feature exports route components via `public.ts`, and `app/routing/index.ts` imports them:
```typescript
// app/routing/index.ts
import { schedule2dRouteComponents } from '@/features/schedule/schedule-2d/public'

// route definition
{ path: '2d', name: 'schedule-2d', component: schedule2dRouteComponents.Schedule2dPage }
```

**ConstructionHelperPage** (`app/shell/ui/`) acts as layout wrapper containing header + sidebar + RouterView.

### Directory Structure

```
src/
├── main.ts                         # App entry point
├── app/                            # App shell (non-domain)
│   ├── bootstrap/                  # App initialization
│   ├── routing/                    # Vue Router config (imports from feature public.ts)
│   ├── shell/                      # Layout wrapper (ConstructionHelperPage)
│   ├── context/                    # App-level context providers
│   └── public-home/                # Landing/main page
├── features/                       # Domain features (each with standard layers)
│   ├── attendance/                 # 출석
│   ├── auth/                       # 인증
│   ├── dashboard/                  # 대시보드
│   ├── document/                   # 문서관리
│   ├── material/                   # 자재관리
│   ├── schedule/                   # 공정관리 (Wrapper+Sub)
│   │   ├── schedule-2d/            #   2D 공정표
│   │   └── schedule-3d/            #   3D 공정표
│   ├── project-admin/              # 현장설정 (Wrapper+Sub)
│   │   ├── master-data/            #   기초정보
│   │   ├── resource/               #   인력/장비
│   │   ├── document-setting/       #   문서 설정
│   │   └── holiday/                #   휴일
│   └── system-admin/               # 시스템 관리
└── shared/                         # Cross-feature shared code
    ├── ui/                         # shadcn-vue components (Reka UI + Tailwind)
    ├── helper-ui/                  # Business layout components (PageContainer, AreaCard)
    ├── network-core/               # API access layer & contract types
    │   ├── apis/
    │   └── contracts/
    ├── analytics/                  # Analytics/tracking
    ├── theme/                      # Global theme state
    └── utils/                      # General utilities
```

### Feature Architecture

Each feature (or sub-feature) follows a standard layered structure:

```
feature/
├── ui/           # Vue components — rendering, events, display logic. No direct API calls.
├── view-model/   # Screen state management, use-case orchestration. No external I/O.
├── use-cases/    # User scenario flows. No Vue/DOM/router dependencies.
├── model/        # Domain types, rules, validation. No external API/DOM dependencies.
├── infra/        # API integration, repository impl, DTO mapping. No UI state decisions.
└── public.ts     # External interface — only symbols exported here are accessible to other features.
```

**Feature modes:**
- **Top 단일 모드**: Feature has layers directly (`features/material/ui/`, etc.). Used by: attendance, auth, dashboard, document, material, system-admin.
- **Wrapper+Sub 모드**: Feature contains sub-features, each with its own layers. The wrapper itself has no layers. Used by: schedule (2d, 3d), project-admin (master-data, resource, document-setting, holiday).

**Import boundary rules:**
- Feature 간 import는 대상 feature의 `public.ts`만 허용
- `app/` 및 `shared/`에서 feature 접근 시에도 `public.ts`만 허용
- Deep relative chain (`../../../`) 금지 — `@/` alias 사용
- `shared/`로 승격 조건: 2개 이상 feature 재사용 + 도메인 독립 + 인터페이스 안정

### State Management (Pinia)

Use **composition API style** (setup function syntax):
```typescript
export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(false)
  const toggleTheme = () => { isDark.value = !isDark.value }

  watch(isDark, (dark) => {
    // DOM side effects
  }, { immediate: true })

  return { isDark, toggleTheme }
})
```

### Three.js Integration Pattern

Three.js code lives in `features/schedule/schedule-3d/` following feature layers:

1. **view-model** (`useEngine.ts`): Lifecycle management, Vue integration
2. **infra/three/**: Engine, controllers, loaders
   - `Engine.ts`: Scene/camera/renderer setup
   - `control/`: CameraController, ClippingController, SelectionController, etc.
   - `loader/`: Model loading from API

**Resource management:**
- Initialize in `onMounted()`
- Clean up in `onUnmounted()` (dispose geometries/materials/renderers)
- Window resize handlers with cleanup

**OrbitControls pattern:**
```typescript
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05

// In animation loop:
controls.update()

// Cleanup:
controls.dispose()
```

### Component Patterns

**Page structure** (using `@/shared/helper-ui/` components):
```vue
<PageContainer title="2D공정표">
  <AreaCard height="flex-1" min-height="400px">
    <!-- Content -->
  </AreaCard>
</PageContainer>
```

**UI components:**
- Import from `@/shared/ui/` via index exports
- Example: `import { Button } from '@/shared/ui/button'`

**Business layout components:**
- Import from `@/shared/helper-ui/`
- Example: `import PageContainer from '@/shared/helper-ui/PageContainer.vue'`

**All components use:**
- `<script setup lang="ts">` syntax
- TypeScript props with `defineProps<{ ... }>()`
- Reactive state with `ref()` and `computed()`

## Code Style

**From `.cursor/rules`:**
- Horizontal-first layout
- No semicolons
- Single quotes
- Pinia stores use composition API style
- Vue components use `<script setup lang="ts">` syntax
- Tests use Vitest + @vue/test-utils with jsdom
- ESLint uses flat config format

**Checkbox Multi-Select with `Ref<number[]>` (필수 패턴):**
- Reka UI Checkbox는 `modelValue` / `update:modelValue`를 사용함. `:checked` / `@update:checked`는 동작하지 않음
- 배열 토글 시 새 배열을 만들어 ref에 재대입 (in-place `push`/`splice` 금지)
```vue
<script setup lang="ts">
function toggleId(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((v) => v !== id) : [...list, id]
}
</script>

<template>
  <Checkbox
    :model-value="selectedIds.includes(item.id)"
    @update:model-value="selectedIds = toggleId(selectedIds, item.id)"
  />
</template>
```
- **금지**: `:checked` / `@update:checked` — Reka UI가 emit하지 않아 핸들러가 실행 안 됨
- **금지**: `list.push(id)` / `list.splice()` — in-place 변경은 ref setter를 트리거하지 않음

**Error Handling:**
- 에러 시 표출할 경고 문구는 백엔드에서 전달한 값을 사용할 것
- 프론트엔드에서 임의로 에러 메시지를 작성하지 말 것

백엔드 에러 응답 형식:
```typescript
interface ApiError {
  status: number    // 400, 401, 403, 404, 500
  error: string     // "Bad Request", "Unauthorized" 등
  message: string   // 사용자에게 표시할 메시지
  details?: Record<string, string>  // 필드별 검증 오류 (선택)
}
```

에러 처리 패턴:
```typescript
} catch (error: any) {
  console.error('작업 실패:', error)
  const errorMessage = error.response?.data?.message || error.message
  alert(errorMessage)
}
```

**Import order:**
1. Vue imports
2. Library imports
3. Local components/stores (use `@/` alias)

**File naming:**
- Components: PascalCase (e.g., `MainPage.vue`)
- TypeScript: camelCase (e.g., `sceneSetup.ts`)

## Technology Stack

- **Vue 3.5** (Composition API)
- **TypeScript 5.9**
- **Vite 7.2** (build tool)
- **Tailwind CSS 4.1** (@tailwindcss/vite)
- **shadcn-vue** (Reka UI 2.6 + class-variance-authority + tailwind-merge)
- **Pinia 3.0** (state management)
- **Vue Router 4.6**
- **Three.js 0.182** (3D rendering)
- **@vue-flow/core 1.48** (graph visualization)
- **Vitest 4.0** (testing)

## Development Notes

**ESLint special rules:**
- UI components allow single-word names (multi-word rule disabled for `shared/ui/**`)

**Type safety:**
- `vue-tsc` replaces `tsc` for `.vue` file type checking
- Use VS Code + Vue (Volar) extension

**Performance:**
- All routes use dynamic imports for code splitting
- Three.js resources must be properly disposed

**Testing:**
- Tests in `src/__tests__/` (co-located with source)
- Use Vitest + @vue/test-utils
- Configuration in `vitest.config.ts`
