export { useDailyReportSetting } from '@/features/project-admin/daily-report-setting/view-model/useDailyReportSetting'

export { default as DailyReportSettingPageView } from '@/features/project-admin/daily-report-setting/ui/DailyReportSettingPage.vue'

export const projectAdminDailyReportSettingRouteComponents = {
  DailyReportSettingPage: () => import('@/features/project-admin/daily-report-setting/ui/DailyReportSettingPage.vue'),
}
