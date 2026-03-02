import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import router from '@/router'
import type { FieldErrors, TokenResponse } from '@/types/auth'
import { appConfig } from '@/config'

// Access Token 저장소 (메모리)
let accessToken: string | null = null

export const setAccessToken = (token: string | null) => {
  accessToken = token
}

export const getAccessToken = () => accessToken

// ValidationError class for field-level errors
export class ValidationError extends Error {
  fieldErrors: FieldErrors

  constructor(message: string, fieldErrors: FieldErrors) {
    super(message)
    this.name = 'ValidationError'
    this.fieldErrors = fieldErrors
  }
}

const client = axios.create({
  baseURL: `${appConfig.apiBaseUrl}/auth`,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - Authorization 헤더 추가
client.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// Token refresh state management
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: unknown) => void
}> = []

const processQueue = (error: AxiosError | null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve()
    }
  })
  failedQueue = []
}

// Error response type
interface ErrorResponseData {
  message?: string
  error?: string
  messages?: FieldErrors
}

// Error extraction helper
const extractError = (error: AxiosError): Error => {
  const data = error.response?.data as ErrorResponseData | undefined

  // 필드별 에러가 있으면 ValidationError 반환
  if (data?.messages && Object.keys(data.messages).length > 0) {
    const message = data.error || data.message || '입력값을 확인해주세요'
    return new ValidationError(message, data.messages)
  }

  // 일반 에러 메시지
  const message = data?.message || data?.error || '요청 처리 중 오류가 발생했습니다'
  return new Error(message)
}

// Response interceptor for automatic token refresh
client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Handle 401/403 - Token expired or missing
    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      // Skip refresh for login/refresh endpoints
      if (originalRequest.url === '/login' || originalRequest.url === '/refresh') {
        return Promise.reject(error)
      }

      if (isRefreshing) {
        // Queue this request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => client(originalRequest))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await client.post<TokenResponse>('/refresh')
        setAccessToken(data.accessToken)
        processQueue(null)
        return client(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError as AxiosError)
        setAccessToken(null) // 토큰 초기화
        // Redirect to login
        router.push('/login')
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // 에러 객체 반환 (ValidationError 또는 일반 Error)
    const enhancedError = extractError(error)
    return Promise.reject(enhancedError)
  }
)

export default client
