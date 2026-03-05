import { createRouter, createWebHashHistory } from 'vue-router'
import { authGuard, authRouteComponents } from '@/features/auth/public'
import { attendanceRouteComponents } from '@/features/attendance/public'
import { dashboardRouteComponents } from '@/features/dashboard/public'
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
          component: () => import('@/pages/helper/material/InvoicePage.vue'),
        },
        {
          path: 'material/incoming',
          name: 'material-incoming',
          component: () => import('@/pages/helper/material/IncomingMaterialPage.vue'),
        },
        {
          path: 'material/outgoing',
          name: 'material-outgoing',
          component: () => import('@/pages/helper/material/OutgoingMaterialPage.vue'),
        },
        {
          path: 'material/remaining',
          name: 'material-remaining',
          component: () => import('@/pages/helper/material/RemainingMaterialPage.vue'),
        },
        {
          path: 'safety',
          name: 'safety',
          component: () => import('@/pages/helper/safety/PlaceholderPage.vue'),
        },
        {
          path: 'document/manager',
          name: 'document-manager',
          component: () => import('@/pages/helper/document/ManagerPage.vue'),
        },
        {
          path: 'document/daily-report',
          name: 'document-daily-report',
          component: () => import('@/pages/helper/document/DailyReportPage.vue'),
        },
        {
          path: 'document/material-inspection',
          name: 'document-material-inspection',
          component: () => import('@/pages/helper/document/MaterialInspectionPage.vue'),
        },
        {
          path: 'functions',
          name: 'functions',
          component: () => import('@/pages/helper/functions/PlaceholderPage.vue'),
        },
        {
          path: 'admin',
          name: 'admin',
          component: () => import('@/pages/helper/admin/AdminPage.vue'),
        },
        {
          path: 'admin/resource',
          name: 'admin-resource',
          component: () => import('@/pages/helper/admin/ResourceManagementPage.vue'),
        },
        {
          path: 'admin/document',
          name: 'admin-document',
          component: () => import('@/pages/helper/admin/DocumentSettingPage.vue'),
        },
        {
          path: 'admin/holiday',
          name: 'admin-holiday',
          component: () => import('@/pages/helper/admin/HolidayManagementPage.vue'),
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
