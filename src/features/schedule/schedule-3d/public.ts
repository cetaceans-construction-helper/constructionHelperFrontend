export { default as Schedule3dPageView } from '@/features/schedule/schedule-3d/ui/Schedule3dPage.vue'
export { default as Viewer3dAreaView } from '@/features/schedule/schedule-3d/ui/components/Viewer3dArea.vue'

export { useDailyReport } from '@/features/schedule/schedule-3d/view-model/useDailyReport'
export { useEngine } from '@/features/schedule/schedule-3d/view-model/useEngine'

export { Engine } from '@/features/schedule/schedule-3d/infra/three/Engine'
export type { EngineOptions } from '@/features/schedule/schedule-3d/infra/three/Engine'

export const schedule3dRouteComponents = {
  Schedule3dPage: () => import('@/features/schedule/schedule-3d/ui/Schedule3dPage.vue'),
}
