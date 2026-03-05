export { useAuthStore } from '@/features/auth/view-model/auth-store'
export { authApi } from '@/features/auth/infra/auth-api'
export { companyApi } from '@/features/auth/infra/company-api'
export {
  default as authHttpClient,
  getAccessToken,
  setAccessToken,
  ValidationError,
} from '@/features/auth/infra/auth-client'
export { authGuard } from '@/features/auth/use-cases/auth-guard'
export type {
  ApiError,
  AuthState,
  Company,
  FieldErrors,
  LoginCredentials,
  SignupCredentials,
  TokenResponse,
  User,
} from '@/features/auth/model/auth-types'

export const authRouteComponents = {
  LoginPage: () => import('@/features/auth/ui/LoginPage.vue'),
  SignupPage: () => import('@/features/auth/ui/SignupPage.vue'),
}
