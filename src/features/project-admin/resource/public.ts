export { useEquipmentMaster } from '@/features/project-admin/resource/view-model/useEquipmentMaster'
export { useLaborType } from '@/features/project-admin/resource/view-model/useLaborType'

export { default as ResourceManagementPageView } from '@/features/project-admin/resource/ui/ResourceManagementPage.vue'

export const projectAdminResourceRouteComponents = {
  ResourceManagementPage: () => import('@/features/project-admin/resource/ui/ResourceManagementPage.vue'),
}
