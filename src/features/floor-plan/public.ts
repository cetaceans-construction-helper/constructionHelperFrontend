export { drawingAxisApi, type DrawingAxisResponse } from './infra/drawing-axis-api'
export { useFloorPlanStore } from './view-model/useFloorPlanStore'
export { default as AxisInputBar } from './ui/components/AxisInputBar.vue'

export const floorPlanRouteComponents = {
  FloorPlanPage: () => import('@/features/floor-plan/ui/FloorPlanPage.vue'),
}
