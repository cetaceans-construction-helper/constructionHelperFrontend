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
type ProjectSelectionState = 'manual' | 'auto_initial' | 'auto_recovery'
type Schedule2dLayoutMode = 'daily' | 'weekly'
type LayoutChangeTrigger = 'scroll'

interface RouteTrackInput {
  routeName: unknown
  routePath: string
}

interface ProjectSelectedInput {
  projectId: string
  previousProjectId: string | null
  selectionState: ProjectSelectionState
  routeName: unknown
  routePath: string
}

class AnalyticsClient {
  private currentUserId: string | null = null
  private lastRouteKey: string | null = null

  private canTrack() {
    return typeof window !== 'undefined' && typeof window.gtag === 'function'
  }

  private getMeasurementId() {
    const envMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim()
    if (envMeasurementId) return envMeasurementId

    if (typeof window !== 'undefined' && typeof window.__gaMeasurementId === 'string') {
      const runtimeMeasurementId = window.__gaMeasurementId.trim()
      if (runtimeMeasurementId) return runtimeMeasurementId
    }

    return null
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
    const commonParams = this.buildCommonParams()
    const payload = this.sanitizeParams({ ...commonParams, ...params })
    if (!this.canTrack()) return

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

  trackProjectSelected(input: ProjectSelectedInput) {
    const routeName = this.normalizeRouteName(input.routeName)
    const routePath = this.normalizeRoutePath(input.routePath)

    this.trackEvent('project_selected', {
      project_id: input.projectId,
      previous_project_id: input.previousProjectId,
      selection_state: input.selectionState,
      route_name: routeName,
      route_path: routePath,
    })
  }

  trackAction(feature: string, action: string, result: ActionResult, params: AnalyticsParams = {}) {
    this.trackEvent('feature_action', {
      ...params,
      feature,
      action,
      result,
    })
  }

  trackLayoutChangeByScroll(fromLayout: Schedule2dLayoutMode, toLayout: Schedule2dLayoutMode) {
    this.trackAction('schedule_2d', 'change_layout_by_scroll', 'success', {
      from_layout: fromLayout,
      to_layout: toLayout,
      trigger: 'scroll' satisfies LayoutChangeTrigger,
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

    if (!this.canTrack()) return

    const measurementId = this.getMeasurementId()
    if (!measurementId) return

    window.gtag?.('config', measurementId, { user_id: userId ?? null })
  }
}

export const analyticsClient = new AnalyticsClient()
