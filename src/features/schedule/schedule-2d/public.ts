export { default as Schedule2dPageView } from '@/features/schedule/schedule-2d/ui/Schedule2dPage.vue'
export { default as Viewer2dAreaView } from '@/features/schedule/schedule-2d/ui/components/Viewer2dArea.vue'

export * from '@/features/schedule/schedule-2d/view-model/chartConfigStore'
export * from '@/features/schedule/schedule-2d/view-model/useDateHeader'
export * from '@/features/schedule/schedule-2d/view-model/useDependencyEditor'
export * from '@/features/schedule/schedule-2d/view-model/useScheduleVersion'
export * from '@/features/schedule/schedule-2d/view-model/useWorkEditor'
export * from '@/features/schedule/schedule-2d/view-model/useWorkForm'
export * from '@/features/schedule/schedule-2d/view-model/useWorkTooltipData'

export * from '@/features/schedule/schedule-2d/use-cases/groupLogic'
export * from '@/features/schedule/schedule-2d/use-cases/nodeConfig'

export const schedule2dRouteComponents = {
  Schedule2dPage: () => import('@/features/schedule/schedule-2d/ui/Schedule2dPage.vue'),
}
