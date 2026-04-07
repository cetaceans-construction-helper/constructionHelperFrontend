import apiClient from '@/shared/network-core/apiClient'
import type { IdNameResponse } from '@/shared/network-core/apis/reference'
import type {
  StdWorkTypeResponse,
  StdSubWorkTypeResponse,
  StdWorkStepResponse,
  StdComponentTypeResponse,
  StdMaterialSpecResponse,
  StdEquipmentSpecResponse,
} from '@/features/system-admin/model/standard-types'

function createStdEntityApi<T>(entityName: string, parentParam?: string) {
  return {
    async getList(parentId?: number): Promise<T[]> {
      const params = parentId != null && parentParam ? { [parentParam]: parentId } : undefined
      const { data } = await apiClient.get<T[]>(`/standard/getStd${entityName}List`, { params })
      return data
    },

    async create(payload: { name: string; parentId?: number }): Promise<T> {
      const { data } = await apiClient.post<T>(
        `/super/standard/createStd${entityName}`,
        payload,
      )
      return data
    },

    async update(id: number, payload: { name: string }): Promise<void> {
      await apiClient.put(`/super/standard/updateStd${entityName}/${id}`, payload)
    },

    async delete(id: number): Promise<void> {
      await apiClient.delete(`/super/standard/deleteStd${entityName}/${id}`)
    },
  }
}

export const standardApi = {
  division: createStdEntityApi<IdNameResponse>('Division'),
  workType: createStdEntityApi<StdWorkTypeResponse>('WorkType', 'stdDivisionId'),
  subWorkType: createStdEntityApi<StdSubWorkTypeResponse>('SubWorkType', 'stdWorkTypeId'),
  workStep: createStdEntityApi<StdWorkStepResponse>('WorkStep', 'stdSubWorkTypeId'),
  componentDivision: createStdEntityApi<IdNameResponse>('ComponentDivision'),
  componentType: createStdEntityApi<StdComponentTypeResponse>('ComponentType', 'stdComponentDivisionId'),
  materialType: createStdEntityApi<IdNameResponse>('MaterialType'),
  materialSpec: createStdEntityApi<StdMaterialSpecResponse>('MaterialSpec', 'stdMaterialTypeId'),
  equipmentType: createStdEntityApi<IdNameResponse>('EquipmentType'),
  equipmentSpec: createStdEntityApi<StdEquipmentSpecResponse>('EquipmentSpec', 'stdEquipmentTypeId'),
  laborType: createStdEntityApi<IdNameResponse>('LaborType'),
}
