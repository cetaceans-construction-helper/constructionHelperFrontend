import axios from 'axios'
import { getAccessToken } from './client'
import { useProjectStore } from '@/stores/project'

// 인증이 필요한 일반 API용 클라이언트
const apiClient = axios.create({
  baseURL: '/api',
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

export default apiClient
