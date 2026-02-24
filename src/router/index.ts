import { createRouter, createWebHashHistory } from 'vue-router'
import { authGuard } from './guards'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'main',
      component: () => import('@/pages/MainPage.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/LoginPage.vue'),
    },
    {
      path: '/signup',
      name: 'signup',
      component: () => import('@/pages/SignupPage.vue'),
    },
    {
      path: '/helper',
      component: () => import('@/pages/ConstructionHelperPage.vue'),
      redirect: '/helper/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/pages/helper/DashboardPage.vue'),
        },
        {
          path: 'schedule',
          redirect: '/helper/schedule/3d',
          children: [
            {
              path: '3d',
              name: 'schedule-3d',
              component: () => import('@/pages/helper/schedule/Schedule3dPage.vue'),
            },
            {
              path: '2d',
              name: 'schedule-2d',
              component: () => import('@/pages/helper/schedule/Schedule2dPage.vue'),
            },
          ],
        },
        {
          path: 'material/invoice',
          name: 'material-invoice',
          component: () => import('@/pages/helper/material/InvoicePage.vue'),
        },
        {
          path: 'material/list',
          name: 'material-list',
          component: () => import('@/pages/helper/material/ListPage.vue'),
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
      ],
    },
    {
      path: '/m/helper/schedule/3d',
      name: 'mobile-schedule-3d',
      component: () => import('@/pages/mobile/schedule/MobileSchedule3dPage.vue'),
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

export default router
