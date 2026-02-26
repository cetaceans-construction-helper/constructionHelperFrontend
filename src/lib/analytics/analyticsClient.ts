type AnalyticsPrimitive = string | number | boolean | null
type AnalyticsParams = Record<string, AnalyticsPrimitive | undefined>

type AuthEventName =
  | 'login_attempt'
  | 'login_result'
  | 'signup_attempt'
  | 'signup_result'
  | 'logout'

type ActionResult = 'success' | 'fail'
type StatusGroup = '4xx' | '5xx' | 'network'

interface RouteTrackInput {
  routeName: unknown
  routePath: string
}

class AnalyticsClient {
  private readonly measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim()

  private currentUserId: string | null = null
  private lastRouteKey: string | null = null

  private canTrack() {
    return (
      typeof window !== 'undefined' &&
      typeof window.gtag === 'function' &&
      Boolean(this.measurementId)
    )
  }

  private normalizeRouteName(routeNameRaw: unknown) {
    return typeof routeNameRaw === 'string' ? routeNameRaw : 'unknown'
  }

  private normalizeRoutePath(routePathRaw: string) {
    return routePathRaw || '/'
  }

  private sanitizeParams(params: AnalyticsParams) {
    return Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined),
    ) as Record<string, AnalyticsPrimitive>
  }

  private buildCommonParams() {
    return this.sanitizeParams({
      user_id: this.currentUserId,
    })
  }

  trackEvent(eventName: string, params: AnalyticsParams = {}) {
    if (!this.canTrack()) return
    const commonParams = this.buildCommonParams()
    const payload = this.sanitizeParams({ ...commonParams, ...params })
    window.gtag?.('event', eventName, payload)
  }

  trackPageView(params: AnalyticsParams = {}) {
    this.trackEvent('page_view', params)
  }

  trackRouteView(input: RouteTrackInput) {
    const routeName = this.normalizeRouteName(input.routeName)
    const routePath = this.normalizeRoutePath(input.routePath)

    const routeKey = `${routeName}|${routePath}`
    if (routeKey === this.lastRouteKey) return

    this.trackPageView({
      route_name: routeName,
      route_path: routePath,
    })
    this.lastRouteKey = routeKey
  }

  trackAction(feature: string, action: string, result: ActionResult, params: AnalyticsParams = {}) {
    this.trackEvent('feature_action', {
      ...params,
      feature,
      action,
      result,
    })
  }

  trackAuth(eventName: AuthEventName, result?: ActionResult, params: AnalyticsParams = {}) {
    this.trackEvent(eventName, {
      ...params,
      ...(result ? { result } : {}),
    })
  }

  trackError(feature: string, statusGroup: StatusGroup, params: AnalyticsParams = {}) {
    this.trackEvent('api_error', {
      ...params,
      feature,
      status_group: statusGroup,
    })
  }

  setUserId(userId: string | null) {
    this.currentUserId = userId
    if (!this.canTrack() || !this.measurementId) return
    window.gtag?.('config', this.measurementId, { user_id: userId ?? null })
  }
}

export const analyticsClient = new AnalyticsClient()
