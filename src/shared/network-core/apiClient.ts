import axios from 'axios'
import { getAccessToken } from '@/features/auth/public'
import { useProjectStore } from '@/app/context/stores/project'
import { appConfig } from '@/app/bootstrap/config'
import type { AxiosError } from 'axios'
import { analyticsClient } from '@/shared/analytics/analyticsClient'
import {
  getApiErrorFeature,
  getCurrentRoutePath,
  getApiErrorStatusGroup,
  shouldSkipApiErrorTracking,
  shouldTrackApiError,
} from '@/shared/analytics/helpers/apiErrorTracking'

// 인증이 필요한 일반 API용 클라이언트
const apiClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - Authorization 및 Project 헤더 추가
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // 프로젝트 헤더 추가
  const projectStore = useProjectStore()
  if (projectStore.selectedProjectId) {
    config.headers['X-Project-Id'] = projectStore.selectedProjectId
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const statusGroup = getApiErrorStatusGroup(error)
    if (
      statusGroup &&
      !shouldSkipApiErrorTracking(error) &&
      shouldTrackApiError()
    ) {
      analyticsClient.trackError(getApiErrorFeature(error, 'api'), statusGroup, {
        route_path: getCurrentRoutePath(),
      })
    }

    return Promise.reject(error)
  },
)

export default apiClient
