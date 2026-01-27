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

Routes are nested under `/helper` with lazy-loading:
```typescript
component: () => import('@/pages/helper/schedule/Schedule2dPage.vue')
```

**ConstructionHelperPage** acts as layout wrapper containing header + sidebar + RouterView.

### Directory Structure

```
src/
├── pages/                    # Route target components (feature-based)
│   └── helper/
│       ├── schedule/        # 공정관리: nodeConfig.ts, groupLogic.ts, layout.ts
│       ├── material/        # 자재관리
│       ├── document/        # 문서관리
│       ├── safety/          # 안전관리
│       └── functions/       # 유용한 기능
├── components/
│   ├── ui/                  # shadcn-vue (Reka UI + Tailwind)
│   └── helper/              # Business components (PageContainer, AreaCard)
├── stores/                  # Pinia stores (composition API style)
├── composables/             # Vue 3 composition utilities
├── utils/
│   └── three/              # Three.js utilities (separation of concerns)
├── router/                  # Vue Router config
└── lib/                     # Library utilities (cn() for class merging)
```

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

**Separation of concerns:**

1. **Composables** (`useThreeScene.ts`): Lifecycle management (init/cleanup)
2. **Utils** (`utils/three/`):
   - `sceneSetup.ts`: Factory functions (createScene, createCamera, createRenderer)
   - `objectFactory.ts`: 3D object creation
   - `animationLoop.ts`: requestAnimationFrame wrappers

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

**Page structure:**
```vue
<PageContainer title="2D공정표">
  <AreaCard height="flex-1" min-height="400px">
    <!-- Content -->
  </AreaCard>
</PageContainer>
```

**UI components:**
- Import from `@/components/ui/` via index exports
- Example: `import { Button } from '@/components/ui/button'`

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
- UI components allow single-word names (multi-word rule disabled for `components/ui/**`)

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
