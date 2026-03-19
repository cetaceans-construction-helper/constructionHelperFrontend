export type { HomepageCredentials } from '@/features/project-admin/homepage-setting/model/homepage-setting-types'
export { HOMEPAGE_CREDENTIALS_KEY } from '@/features/project-admin/homepage-setting/model/homepage-setting-types'

export const projectAdminHomepageSettingRouteComponents = {
  HomepageSettingPage: () => import('@/features/project-admin/homepage-setting/ui/HomepageSettingPage.vue'),
}
