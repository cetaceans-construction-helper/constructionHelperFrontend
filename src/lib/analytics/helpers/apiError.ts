import type { AxiosError } from 'axios'
import { analyticsClient } from '@/lib/analytics/analyticsClient'

type StatusGroup = '4xx' | '5xx' | 'network'

const DEFAULT_SAMPLE_RATE = 1

function getSampleRate() {
  const parsed = Number(import.meta.env.VITE_GA_API_ERROR_SAMPLE_RATE ?? DEFAULT_SAMPLE_RATE)
  if (!Number.isFinite(parsed)) return DEFAULT_SAMPLE_RATE
  return Math.min(1, Math.max(0, parsed))
}

function normalizePath(rawUrl?: string) {
  if (!rawUrl) return ''
  try {
    return new URL(rawUrl, 'https://local.invalid').pathname
  } catch {
    return rawUrl
  }
}

function getStatusGroup(status?: number): StatusGroup {
  if (!status) return 'network'
  if (status >= 500) return '5xx'
  return '4xx'
}

function getFeatureFromUrl(rawUrl?: string, fallback = 'unknown') {
  const path = normalizePath(rawUrl)
  const [feature] = path.split('/').filter(Boolean)
  if (!feature) return fallback
  return feature.toLowerCase()
}

function shouldSkipApiErrorTracking(error: AxiosError) {
  const status = error.response?.status
  if (status === 401 || status === 403) {
    return true
  }

  const path = normalizePath(error.config?.url)
  if (path === '/refresh') {
    return true
  }

  return false
}

function getDebugPayload(error: AxiosError, feature: string, statusGroup: StatusGroup) {
  return {
    feature,
    status_group: statusGroup,
    status_code: error.response?.status ?? null,
    method: error.config?.method?.toUpperCase() ?? 'UNKNOWN',
    url: normalizePath(error.config?.url),
    message: error.message,
  }
}

export function trackApiErrorFromAxiosError(
  error: AxiosError,
  defaultFeature = 'unknown',
) {
  const feature = getFeatureFromUrl(error.config?.url, defaultFeature)
  const statusGroup = getStatusGroup(error.response?.status)
  const debugPayload = getDebugPayload(error, feature, statusGroup)

  if (shouldSkipApiErrorTracking(error)) {
    console.log('[GA][api_error][skip]', debugPayload)
    return
  }

  const sampleRate = getSampleRate()
  if (sampleRate < 1 && Math.random() >= sampleRate) {
    console.log('[GA][api_error][sampled_out]', { ...debugPayload, sample_rate: sampleRate })
    return
  }

  analyticsClient.trackError(feature, statusGroup)
  console.log('[GA][api_error][tracked]', { ...debugPayload, sample_rate: sampleRate })
}
