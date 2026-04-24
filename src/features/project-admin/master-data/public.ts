export { useComponentCode } from '@/features/project-admin/master-data/view-model/useComponentCode'
export { useLocationMaster } from '@/features/project-admin/master-data/view-model/useLocationMaster'
export { useMaterialMaster } from '@/features/project-admin/master-data/view-model/useMaterialMaster'

export { default as AdminPageView } from '@/features/project-admin/master-data/ui/AdminPage.vue'

export const projectAdminMasterDataRouteComponents = {
  AdminPage: () => import('@/features/project-admin/master-data/ui/AdminPage.vue'),
}
