import type { AxiosError } from 'axios'

type ApiErrorStatusGroup = '4xx' | '5xx' | 'network'

const DEFAULT_SAMPLE_RATE = 1

const clampSampleRate = (value: number) => {
  if (Number.isNaN(value)) return DEFAULT_SAMPLE_RATE
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

const parseSampleRate = () => {
  const raw = import.meta.env.VITE_GA_API_ERROR_SAMPLE_RATE
  if (!raw || raw.trim() === '') return DEFAULT_SAMPLE_RATE

  return clampSampleRate(Number(raw))
}

const API_ERROR_SAMPLE_RATE = parseSampleRate()

const normalizePath = (rawUrl: string) => {
  if (!rawUrl) return ''

  const withoutQuery = rawUrl.split('?')[0] ?? ''
  const absoluteUrl = withoutQuery.replace(/^https?:\/\/[^/]+/i, '')
  return absoluteUrl.startsWith('/') ? absoluteUrl : `/${absoluteUrl}`
}

export const shouldTrackApiError = () => {
  return Math.random() < API_ERROR_SAMPLE_RATE
}

export const getApiErrorStatusGroup = (error: AxiosError): ApiErrorStatusGroup | null => {
  const status = error.response?.status
  if (status == null) return 'network'
  if (status >= 400 && status < 500) return '4xx'
  if (status >= 500) return '5xx'
  return null
}

export const shouldSkipApiErrorTracking = (error: AxiosError) => {
  const status = error.response?.status
  if (status === 401 || status === 403) return true

  const path = normalizePath(error.config?.url ?? '')
  if (path.endsWith('/refresh')) return true

  return false
}

export const getApiErrorFeature = (error: AxiosError, fallbackFeature: string) => {
  const path = normalizePath(error.config?.url ?? '')
  if (!path) return fallbackFeature

  const segments = path.split('/').filter(Boolean)
  if (segments.length === 0) return fallbackFeature

  return segments[0] ?? fallbackFeature
}

export const getCurrentRoutePath = () => {
  if (typeof window === 'undefined') return '/'

  const hash = window.location.hash ?? ''
  if (hash.startsWith('#/')) {
    return hash.slice(1) || '/'
  }

  const pathname = window.location.pathname || '/'
  const search = window.location.search || ''
  return `${pathname}${search}`
}
