export { useHolidayManagement } from '@/features/project-admin/holiday/view-model/useHolidayManagement'
export type { CalendarCell } from '@/features/project-admin/holiday/view-model/useHolidayManagement'

export { default as HolidayManagementPageView } from '@/features/project-admin/holiday/ui/HolidayManagementPage.vue'

export const projectAdminHolidayRouteComponents = {
  HolidayManagementPage: () => import('@/features/project-admin/holiday/ui/HolidayManagementPage.vue'),
}
