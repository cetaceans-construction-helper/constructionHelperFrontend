import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { authApi } from '@/api/auth'
import { ValidationError } from '@/api/client'
import type { User, LoginCredentials, SignupCredentials, FieldErrors } from '@/types/auth'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const fieldErrors = ref<FieldErrors>({})
  const isInitialized = ref(false)

  // Getters
  const isAuthenticated = computed(() => !!user.value)

  // Actions
  const login = async (credentials: LoginCredentials) => {
    isLoading.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      user.value = await authApi.login(credentials)
    } catch (e) {
      if (e instanceof ValidationError) {
        error.value = e.message
        fieldErrors.value = e.fieldErrors
      } else if (e instanceof Error) {
        error.value = e.message
      } else {
        error.value = '로그인에 실패했습니다'
      }
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    isLoading.value = true

    try {
      await authApi.logout()
    } catch (e) {
      console.error('Logout error:', e)
    } finally {
      user.value = null
      isLoading.value = false
    }
  }

  const signup = async (credentials: SignupCredentials) => {
    isLoading.value = true
    error.value = null
    fieldErrors.value = {}

    try {
      await authApi.signup(credentials)
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
      user.value = await authApi.me()
    } catch {
      // Not authenticated - this is expected
      user.value = null
    } finally {
      isLoading.value = false
      isInitialized.value = true
    }
  }

  const clearError = () => {
    error.value = null
    fieldErrors.value = {}
  }

  return {
    // State
    user,
    isLoading,
    error,
    fieldErrors,
    isInitialized,
    // Getters
    isAuthenticated,
    // Actions
    login,
    logout,
    signup,
    initialize,
    clearError,
  }
})
