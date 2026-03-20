export { useAuthStore } from '@/features/auth/view-model/auth-store'
export { authApi } from '@/features/auth/infra/auth-api'
export { companyApi } from '@/features/auth/infra/company-api'
export {
  default as authHttpClient,
  getAccessToken,
  setAccessToken,
  ValidationError,
  RateLimitError,
} from '@/features/auth/infra/auth-client'
export { authGuard } from '@/features/auth/use-cases/auth-guard'
export { getAuthErrorType } from '@/features/auth/use-cases/getAuthErrorType'
export type {
  ApiError,
  AuthState,
  Company,
  FieldErrors,
  TokenResponse,
  User,
} from '@/features/auth/model/auth-types'
export type { AuthErrorType } from '@/features/auth/use-cases/getAuthErrorType'

export const authRouteComponents = {
  LoginPage: () => import('@/features/auth/ui/LoginPage.vue'),
  SignupPage: () => import('@/features/auth/ui/SignupPage.vue'),
}

export { default as LoginPageView } from '@/features/auth/ui/LoginPage.vue'
export { default as SignupPageView } from '@/features/auth/ui/SignupPage.vue'
