// 표준 레퍼런스 엔티티 타입 (프로젝트 무관, super 계정 관리)

// 루트 엔티티는 IdNameResponse 재사용 (Division, ComponentDivision, MaterialType, EquipmentType, LaborType)
// 응답: { id, name }

// 자식 엔티티는 parent: { id, name } 포함
export interface StdParent {
  id: number
  name: string
}

export interface StdWorkTypeResponse {
  id: number
  name: string
  parent: StdParent
}

export interface StdSubWorkTypeResponse {
  id: number
  name: string
  parent: StdParent
}

export interface StdWorkStepResponse {
  id: number
  name: string
  parent: StdParent
}

export interface StdComponentTypeResponse {
  id: number
  name: string
  parent: StdParent
}

export interface StdMaterialSpecResponse {
  id: number
  name: string
  parent: StdParent
}

export interface StdEquipmentSpecResponse {
  id: number
  name: string
  parent: StdParent
}

// WorkRules

export interface WorkRule {
  id: number
  stdWorkTypeId: number | null
  stdSubWorkTypeId: number | null
  rules: string
  createdAt: string
  updatedAt: string
}
