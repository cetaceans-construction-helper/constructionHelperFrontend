export { useDashboardPage } from '@/features/dashboard/view-model/useDashboardPage'

export const dashboardRouteComponents = {
  DashboardPage: () => import('@/features/dashboard/ui/DashboardPage.vue'),
}
