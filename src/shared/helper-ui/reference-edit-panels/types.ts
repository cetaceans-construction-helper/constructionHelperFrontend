export type ReferenceEditType =
  | 'equipment'
  | 'labor'
  | 'material'
  | 'work-classification'
  | 'component'
  | 'zone'
  | 'floor'

export const REFERENCE_EDIT_TITLES: Record<ReferenceEditType, string> = {
  equipment: '장비 관리',
  labor: '직종 관리',
  material: '자재 관리',
  'work-classification': '공종분류 관리',
  component: '부재코드 관리',
  zone: '공구 관리',
  floor: '층 관리',
}

export const REFERENCE_EDIT_WIDTHS: Record<ReferenceEditType, string> = {
  equipment: 'sm:max-w-2xl',
  labor: 'sm:max-w-3xl',
  material: 'sm:max-w-2xl',
  'work-classification': 'sm:max-w-5xl',
  component: 'sm:max-w-2xl',
  zone: 'sm:max-w-sm',
  floor: 'sm:max-w-sm',
}
