export { useCompanyManagement } from '@/features/system-admin/view-model/useCompanyManagement'
export { useMappingManagement } from '@/features/system-admin/view-model/useMappingManagement'
export { useProjectManagement } from '@/features/system-admin/view-model/useProjectManagement'
export { useRoleManagement } from '@/features/system-admin/view-model/useRoleManagement'
export { useWorkerManagement } from '@/features/system-admin/view-model/useWorkerManagement'
export { useStandardWorkClassification } from '@/features/system-admin/view-model/useStandardWorkClassification'
export { useStandardMaterial } from '@/features/system-admin/view-model/useStandardMaterial'
export { useStandardEquipment } from '@/features/system-admin/view-model/useStandardEquipment'
export { useStandardComponent } from '@/features/system-admin/view-model/useStandardComponent'
export { useStandardLabor } from '@/features/system-admin/view-model/useStandardLabor'
export { useWorkRules } from '@/features/system-admin/view-model/useWorkRules'

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
  UpdateWorkerPayload,
  User,
  UserToProject,
  Worker,
  WorkType,
} from '@/features/system-admin/model/system-admin-types'

export type {
  StdWorkTypeResponse,
  StdSubWorkTypeResponse,
  StdWorkStepResponse,
  StdComponentTypeResponse,
  StdMaterialSpecResponse,
  StdEquipmentSpecResponse,
  WorkRule,
} from '@/features/system-admin/model/standard-types'

export { default as SystemAdminPageView } from '@/features/system-admin/ui/SystemAdminPage.vue'

export const systemAdminRouteComponents = {
  SystemAdminPage: () => import('@/features/system-admin/ui/SystemAdminPage.vue'),
}
