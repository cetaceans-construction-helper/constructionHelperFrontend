type AnalyticsPrimitive = string | number | boolean | null
type AnalyticsValue = AnalyticsPrimitive | undefined
type AnalyticsParams = Record<string, AnalyticsValue>

type AuthEventName =
  | 'login_attempt'
  | 'login_result'
  | 'signup_attempt'
  | 'signup_result'
  | 'logout'

type ActionResult = 'success' | 'fail'
type StatusGroup = '4xx' | '5xx' | 'network'

interface AnalyticsContextState {
  routeName: string | null
  routePath: string | null
  userRole: string | null
  platformView: 'pc' | 'mobile_route' | null
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim()
const PROJECT_STORAGE_KEY = 'selectedProjectId'

let currentUserId: string | null = null

const contextState: AnalyticsContextState = {
  routeName: null,
  routePath: null,
  userRole: null,
  platformView: null,
}

function hasWindow() {
  return typeof window !== 'undefined'
}

function canTrack() {
  return Boolean(GA_MEASUREMENT_ID) && hasWindow() && typeof window.gtag === 'function'
}

function getCurrentPath() {
  if (!hasWindow()) return ''
  const hashPath = window.location.hash?.replace(/^#/, '')
  return hashPath || window.location.pathname || ''
}

function getSectionFromPath(path: string) {
  if (path === '/' || path === '') return 'main'
  if (path.startsWith('/login') || path.startsWith('/signup')) return 'auth'
  if (path.startsWith('/m/')) return 'mobile'
  if (path.startsWith('/system-admin')) return 'system_admin'
  if (path.startsWith('/helper/dashboard')) return 'dashboard'
  if (path.startsWith('/helper/schedule')) return 'process'
  if (path.startsWith('/helper/material')) return 'material'
  if (path.startsWith('/helper/safety')) return 'safety'
  if (path.startsWith('/helper/document')) return 'document'
  if (path.startsWith('/helper/functions')) return 'utility'
  if (path.startsWith('/helper/admin')) return 'admin'
  return 'main'
}

function getPlatformViewFromPath(path: string): 'pc' | 'mobile_route' {
  return path.startsWith('/m/') ? 'mobile_route' : 'pc'
}

function sanitizeParams(params: AnalyticsParams) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined),
  ) as Record<string, AnalyticsPrimitive>
}

function buildCommonParams(params: AnalyticsParams = {}) {
  const routePath = String(params.route_path ?? contextState.routePath ?? getCurrentPath())
  const routeName = String(params.route_name ?? contextState.routeName ?? 'unknown')
  const section = String(params.section ?? getSectionFromPath(routePath))
  const projectSelected =
    params.project_selected ??
    (hasWindow() && window.localStorage.getItem(PROJECT_STORAGE_KEY) ? 'yes' : 'no')
  const userRole = params.user_role ?? contextState.userRole ?? 'anonymous'
  const platformView =
    params.platform_view ??
    contextState.platformView ??
    getPlatformViewFromPath(routePath)

  return sanitizeParams({
    route_name: routeName,
    route_path: routePath,
    section,
    user_id: currentUserId,
    user_role: String(userRole),
    project_selected: String(projectSelected),
    platform_view: String(platformView),
  })
}

export function setAnalyticsContext(next: Partial<AnalyticsContextState>) {
  if (typeof next.routeName === 'string' || next.routeName === null) {
    contextState.routeName = next.routeName
  }
  if (typeof next.routePath === 'string' || next.routePath === null) {
    contextState.routePath = next.routePath
  }
  if (typeof next.userRole === 'string' || next.userRole === null) {
    contextState.userRole = next.userRole
  }
  if (
    next.platformView === 'pc' ||
    next.platformView === 'mobile_route' ||
    next.platformView === null
  ) {
    contextState.platformView = next.platformView
  }
}

export function trackEvent(eventName: string, params: AnalyticsParams = {}) {
  if (!canTrack()) return
  const commonParams = buildCommonParams(params)
  const payload = sanitizeParams({ ...commonParams, ...params })
  window.gtag?.('event', eventName, payload)
}

export function trackPageView(params: AnalyticsParams = {}) {
  trackEvent('page_view', params)
}

export function trackAction(
  feature: string,
  action: string,
  result: ActionResult,
  params: AnalyticsParams = {},
) {
  trackEvent('feature_action', {
    ...params,
    feature,
    action,
    result,
  })
}

export function trackAuth(
  eventName: AuthEventName,
  result?: ActionResult,
  params: AnalyticsParams = {},
) {
  trackEvent(
    eventName,
    result
      ? {
          ...params,
          result,
        }
      : params,
  )
}

export function trackError(
  feature: string,
  statusGroup: StatusGroup,
  params: AnalyticsParams = {},
) {
  trackEvent('api_error', {
    ...params,
    feature,
    status_group: statusGroup,
  })
}

export function setUserId(userId: string | null) {
  currentUserId = userId
  if (!canTrack() || !GA_MEASUREMENT_ID) return
  window.gtag?.('config', GA_MEASUREMENT_ID, { user_id: userId ?? null })
}

export function getGaMeasurementId() {
  return GA_MEASUREMENT_ID ?? null
}
