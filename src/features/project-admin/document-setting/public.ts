export { useDocumentSetting } from '@/features/project-admin/document-setting/view-model/useDocumentSetting'

export { default as DocumentSettingPageView } from '@/features/project-admin/document-setting/ui/DocumentSettingPage.vue'

export const projectAdminDocumentSettingRouteComponents = {
  DocumentSettingPage: () => import('@/features/project-admin/document-setting/ui/DocumentSettingPage.vue'),
}
