import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// Routes that don't require authentication
const publicRoutes = ['/', '/login', '/signup', 'main', 'login', 'signup']

// Routes that require SUPER role
const superRoutes = ['/system-admin']

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

  // 1. 비로그인 상태에서 보호된 라우트 접근 → 로그인 페이지
  if (!isPublicRoute && !authStore.isAuthenticated) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  // 2. SUPER 전용 라우트: 로그인했지만 SUPER가 아니면 → 대시보드
  const isSuperRoute = superRoutes.some((r) => to.path.startsWith(r))
  if (isSuperRoute && authStore.user?.systemRole !== 'SUPER') {
    next('/helper/dashboard')
    return
  }

  // 2.5 강제 뷰 전환 쿼리 처리
  const viewQuery = typeof to.query.view === 'string' ? to.query.view : null
  if (to.path === '/helper/schedule/3d' && viewQuery === 'mobile') {
    const query = { ...to.query }
    delete query.view
    next({ path: '/m/helper/schedule/3d', query, hash: to.hash })
    return
  }
  if (to.path === '/m/helper/schedule/3d' && viewQuery === 'pc') {
    const query = { ...to.query }
    delete query.view
    next({ path: '/helper/schedule/3d', query, hash: to.hash })
    return
  }

  // 3. 이미 로그인 상태에서 /login 접근 → 대시보드
  if (to.path === '/login' && authStore.isAuthenticated) {
    next('/helper/dashboard')
  } else {
    next()
  }
}
