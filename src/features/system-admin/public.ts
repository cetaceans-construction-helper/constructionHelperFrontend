export { useCompanyManagement } from '@/features/system-admin/view-model/useCompanyManagement'
export { useMappingManagement } from '@/features/system-admin/view-model/useMappingManagement'
export { useProjectManagement } from '@/features/system-admin/view-model/useProjectManagement'
export { useRoleManagement } from '@/features/system-admin/view-model/useRoleManagement'

// 표준 데이터 (글로벌 RE 관리) — SUPER 전용
export { useWorkClassification } from '@/features/system-admin/view-model/standard/useWorkClassification'
export { useEquipmentMaster } from '@/features/system-admin/view-model/standard/useEquipmentMaster'
export { useLaborType } from '@/features/system-admin/view-model/standard/useLaborType'

export { systemAdminApi } from '@/features/system-admin/infra/system-admin-api'

export type {
  Company,
  CompanyRole,
  CompanyToProject,
  CreateCompanyPayload,
  CreateCompanyToProjectPayload,
  CreateProjectPayload,
  CreateUserToProjectPayload,
  Project,
  SystemRole,
  UpdateCompanyPayload,
  UpdateCompanyToProjectPayload,
  UpdateProjectPayload,
  UpdateUserToProjectPayload,
  User,
  UserToProject,
  WorkType,
} from '@/features/system-admin/model/system-admin-types'

export { default as SystemAdminPageView } from '@/features/system-admin/ui/SystemAdminPage.vue'

export const systemAdminRouteComponents = {
  SystemAdminPage: () => import('@/features/system-admin/ui/SystemAdminPage.vue'),
}
