export { useDashboardPage } from '@/features/dashboard/view-model/useDashboardPage'
export { default as DashboardPageView } from '@/features/dashboard/ui/DashboardPage.vue'
export { default as WorkPhotoDialogView } from '@/features/dashboard/ui/components/WorkPhotoDialog.vue'
export { default as DailyReportArea } from '@/features/dashboard/ui/components/DailyReportArea.vue'

export const dashboardRouteComponents = {
  DashboardPage: () => import('@/features/dashboard/ui/DashboardPage.vue'),
}
