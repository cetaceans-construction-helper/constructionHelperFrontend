import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Routes that don't require authentication
const publicRoutes = ['/', '/login', '/signup', 'main', 'login', 'signup']

export const authGuard = async (
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  const authStore = useAuthStore()

  // Ensure auth state is initialized
  if (!authStore.isInitialized) {
    await authStore.initialize() // 로그인 잠시 해제
  }

  const isPublicRoute =
    publicRoutes.includes(to.path) || publicRoutes.includes(to.name as string)

  if (!isPublicRoute && !authStore.isAuthenticated) {
    // Redirect to login, preserve intended destination
    // next() // 로그인 잠시 해제
    next({ path: '/login', query: { redirect: to.fullPath } }) // 로그인 잠시 해제
  } else if (to.path === '/login' && authStore.isAuthenticated) {
    // Already logged in, redirect to dashboard
    next('/helper/dashboard')
  } else {
    next()
  }
}
