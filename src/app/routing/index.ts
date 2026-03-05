import { createRouter, createWebHashHistory } from 'vue-router'
import { authGuard, authRouteComponents } from '@/features/auth/public'
import { attendanceRouteComponents } from '@/features/attendance/public'
import { dashboardRouteComponents } from '@/features/dashboard/public'
import { documentRouteComponents } from '@/features/document/public'
import { materialRouteComponents } from '@/features/material/public'
import { projectAdminDocumentSettingRouteComponents } from '@/features/project-admin/document-setting/public'
import { projectAdminHolidayRouteComponents } from '@/features/project-admin/holiday/public'
import { projectAdminMasterDataRouteComponents } from '@/features/project-admin/master-data/public'
import { projectAdminResourceRouteComponents } from '@/features/project-admin/resource/public'
import { schedule2dRouteComponents } from '@/features/schedule/schedule-2d/public'
import { schedule3dRouteComponents } from '@/features/schedule/schedule-3d/public'
import { analyticsClient } from '@/lib/analytics/analyticsClient'

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
          path: 'material/incoming',
          name: 'material-incoming',
          component: materialRouteComponents.IncomingMaterialPage,
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
          component: () => import('@/pages/helper/safety/PlaceholderPage.vue'),
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
          component: () => import('@/pages/helper/functions/PlaceholderPage.vue'),
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
          path: 'admin/holiday',
          name: 'admin-holiday',
          component: projectAdminHolidayRouteComponents.HolidayManagementPage,
        },
      ],
    },
    {
      path: '/system-admin',
      name: 'system-admin',
      component: () => import('@/pages/system-admin/SystemAdminPage.vue'),
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
