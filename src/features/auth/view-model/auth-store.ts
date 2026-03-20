import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { authApi } from '@/features/auth/infra/auth-api'
import { ValidationError, RateLimitError } from '@/features/auth/infra/auth-client'
import { analyticsClient } from '@/shared/analytics/analyticsClient'
import { getAuthErrorType } from '@/features/auth/use-cases/getAuthErrorType'
import type {
  User,
  FieldErrors,
} from '@/features/auth/model/auth-types'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<FieldErrors>({})
  const isInitialized = ref(false)

  // Rate limit state
  const blockCountdown = ref(0)
  const isLoginBlocked = computed(() => blockCountdown.value > 0)
  let blockTimer: ReturnType<typeof setInterval> | null = null

  function startBlockCountdown(seconds: number) {
    if (blockTimer) clearInterval(blockTimer)
    blockCountdown.value = seconds
    blockTimer = setInterval(() => {
      blockCountdown.value--
      if (blockCountdown.value <= 0) {
        clearInterval(blockTimer!)
        blockTimer = null
        error.value = null
      }
    }, 1000)
  }

  // Getters
  const isAuthenticated = computed(() => !!user.value)

  // Actions
  const login = async (email: string, password: string) => {
    isLoading.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      const loggedInUser = await authApi.login(email, password)
      user.value = loggedInUser
      analyticsClient.setUserId(String(loggedInUser.id))
      analyticsClient.trackAuth('login_result', 'success')
    } catch (e) {
      if (e instanceof RateLimitError) {
        error.value = e.message
        startBlockCountdown(e.remainingSeconds)
      } else if (e instanceof ValidationError) {
        error.value = e.message
        fieldErrors.value = e.fieldErrors
      } else if (e instanceof Error) {
        error.value = e.message
      } else {
        error.value = '로그인에 실패했습니다'
      }
      analyticsClient.trackAuth('login_result', 'fail', {
        error_type: getAuthErrorType(e),
      })
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    isLoading.value = true
    const previousUserId = user.value?.id ? String(user.value.id) : null

    try {
      await authApi.logout()
      analyticsClient.trackAuth('logout', 'success', {
        user_id: previousUserId,
      })
    } catch (e) {
      console.error('Logout error:', e)
      analyticsClient.trackAuth('logout', 'fail', {
        user_id: previousUserId,
        error_type: getAuthErrorType(e),
      })
    } finally {
      analyticsClient.setUserId(null)
      user.value = null
      isLoading.value = false
    }
  }

  const signup = async (params: {
    email: string
    password: string
    passwordConfirm: string
    userName: string
    phoneNumber: string
    jobTitle?: string
    companyId?: string
  }) => {
    isLoading.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      await authApi.signup(params)
      analyticsClient.trackAuth('signup_result', 'success')
      // 회원가입 성공 - 로그인 상태는 변경하지 않음
    } catch (e) {
      if (e instanceof ValidationError) {
        error.value = e.message
        fieldErrors.value = e.fieldErrors
      } else if (e instanceof Error) {
        error.value = e.message
      } else {
        error.value = '회원가입에 실패했습니다'
      }
      analyticsClient.trackAuth('signup_result', 'fail', {
        error_type: getAuthErrorType(e),
      })
      throw e
    } finally {
      isLoading.value = false
    }
  }

  // Check auth status on app initialization
  const initialize = async () => {
    if (isInitialized.value) return

    isLoading.value = true

    try {
      await authApi.refresh()
      const currentUser = await authApi.me()
      user.value = currentUser
      analyticsClient.setUserId(String(currentUser.id))
    } catch {
      // Not authenticated - this is expected
      user.value = null
      analyticsClient.setUserId(null)
    } finally {
      isLoading.value = false
      isInitialized.value = true
    }
  }

  const clearError = () => {
    error.value = null
    fieldErrors.value = {}
    if (blockTimer) {
      clearInterval(blockTimer)
      blockTimer = null
    }
    blockCountdown.value = 0
  }

  return {
    // State
    user,
    isLoading,
    error,
    fieldErrors,
    isInitialized,
    blockCountdown,
    // Getters
    isAuthenticated,
    isLoginBlocked,
    // Actions
    login,
    logout,
    signup,
    initialize,
    clearError,
  }
})
