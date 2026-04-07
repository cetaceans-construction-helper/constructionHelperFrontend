import { createRouter, createWebHashHistory } from 'vue-router'
import { authGuard, authRouteComponents } from '@/features/auth/public'
import { attendanceRouteComponents } from '@/features/attendance/public'
import { dashboardRouteComponents } from '@/features/dashboard/public'
import { documentRouteComponents } from '@/features/document/public'
import { materialRouteComponents } from '@/features/material/public'
import { projectAdminDailyReportSettingRouteComponents } from '@/features/project-admin/daily-report-setting/public'
import { projectAdminDocumentSettingRouteComponents } from '@/features/project-admin/document-setting/public'
import { projectAdminHolidayRouteComponents } from '@/features/project-admin/holiday/public'
import { projectAdminMasterDataRouteComponents } from '@/features/project-admin/master-data/public'
import { projectAdminBulkDeploymentRouteComponents } from '@/features/project-admin/bulk-deployment/public'
import { projectAdminHomepageSettingRouteComponents } from '@/features/project-admin/homepage-setting/public'
import { rebuildWorkNamesRouteComponents } from '@/features/project-admin/rebuild-work-names/public'
import { projectAdminResourceRouteComponents } from '@/features/project-admin/resource/public'
import { schedule2dRouteComponents } from '@/features/schedule/schedule-2d/public'
import { schedule3dRouteComponents } from '@/features/schedule/schedule-3d/public'
import { systemAdminRouteComponents } from '@/features/system-admin/public'
import { analyticsClient } from '@/shared/analytics/analyticsClient'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'main',
      component: () => import('@/app/public-home/ui/MainPage.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: authRouteComponents.LoginPage,
    },
    {
      path: '/signup',
      name: 'signup',
      component: authRouteComponents.SignupPage,
    },
    {
      path: '/helper',
      component: () => import('@/app/shell/ui/ConstructionHelperPage.vue'),
      redirect: '/helper/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: dashboardRouteComponents.DashboardPage,
        },
        {
          path: 'schedule',
          redirect: '/helper/schedule/2d',
          children: [
            {
              path: '3d',
              name: 'schedule-3d',
              component: schedule3dRouteComponents.Schedule3dPage,
            },
            {
              path: '2d',
              name: 'schedule-2d',
              component: schedule2dRouteComponents.Schedule2dPage,
            },
          ],
        },
        {
          path: 'attendance/input',
          name: 'attendance-input',
          component: attendanceRouteComponents.AttendanceInputPage,
        },
        {
          path: 'attendance/register',
          name: 'attendance-register',
          component: attendanceRouteComponents.WorkerRegisterPage,
        },
        {
          path: 'material/order',
          name: 'material-order',
          component: materialRouteComponents.InvoicePage,
        },
        {
          path: 'material/delivery',
          name: 'material-delivery',
          component: materialRouteComponents.MaterialDeliveryPage,
        },
        {
          path: 'material/outgoing',
          name: 'material-outgoing',
          component: materialRouteComponents.OutgoingMaterialPage,
        },
        {
          path: 'material/remaining',
          name: 'material-remaining',
          component: materialRouteComponents.RemainingMaterialPage,
        },
        {
          path: 'safety',
          name: 'safety',
          component: () => import('@/app/shell/ui/placeholders/SafetyPlaceholderPage.vue'),
        },
        {
          path: 'document/manager',
          name: 'document-manager',
          component: documentRouteComponents.ManagerPage,
        },
        {
          path: 'document/daily-report',
          name: 'document-daily-report',
          component: documentRouteComponents.DailyReportPage,
        },
        {
          path: 'document/material-inspection',
          name: 'document-material-inspection',
          component: documentRouteComponents.MaterialInspectionPage,
        },
        {
          path: 'functions',
          name: 'functions',
          redirect: '/helper/functions/cumulative-attendance',
        },
        {
          path: 'functions/cumulative-attendance',
          name: 'cumulative-attendance',
          component: attendanceRouteComponents.CumulativeAttendancePage,
        },
        {
          path: 'admin',
          name: 'admin',
          component: projectAdminMasterDataRouteComponents.AdminPage,
        },
        {
          path: 'admin/resource',
          name: 'admin-resource',
          component: projectAdminResourceRouteComponents.ResourceManagementPage,
        },
        {
          path: 'admin/document',
          name: 'admin-document',
          component: projectAdminDocumentSettingRouteComponents.DocumentSettingPage,
        },
        {
          path: 'admin/daily-report',
          name: 'admin-daily-report',
          component: projectAdminDailyReportSettingRouteComponents.DailyReportSettingPage,
        },
        {
          path: 'admin/holiday',
          name: 'admin-holiday',
          component: projectAdminHolidayRouteComponents.HolidayManagementPage,
        },
        {
          path: 'admin/bulk-deployment',
          name: 'admin-bulk-deployment',
          component: projectAdminBulkDeploymentRouteComponents.BulkDeploymentPage,
        },
        {
          path: 'admin/homepage-setting',
          name: 'admin-homepage-setting',
          component: projectAdminHomepageSettingRouteComponents.HomepageSettingPage,
        },
        {
          path: 'admin/rebuild-work-names',
          name: 'admin-rebuild-work-names',
          component: rebuildWorkNamesRouteComponents.RebuildWorkNamesPage,
        },
      ],
    },
    {
      path: '/system-admin',
      name: 'system-admin',
      component: systemAdminRouteComponents.SystemAdminPage,
      meta: { requiresSuper: true },
    },
  ],
})

// Global navigation guard (temporarily disabled)
router.beforeEach(authGuard)

router.afterEach((to, _from, failure) => {
  if (failure) return
  analyticsClient.trackRouteView({
    routeName: to.name,
    routePath: to.fullPath,
  })
})

// 최초 진입이 afterEach에서 누락되는 경우를 대비한 fallback
router
  .isReady()
  .then(() => {
    const current = router.currentRoute.value
    analyticsClient.trackRouteView({
      routeName: current.name,
      routePath: current.fullPath,
    })
  })
  .catch(() => {})

export default router
