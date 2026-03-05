import { ref, watch } from 'vue'
import {
  referenceApi,
  type EquipmentTypeResponse,
  type EquipmentSpecResponse,
} from '@/api/reference'
import { analyticsClient } from '@/lib/analytics/analyticsClient'

export function useEquipmentMaster() {
  const equipmentTypes = ref<EquipmentTypeResponse[]>([])
  const equipmentSpecs = ref<EquipmentSpecResponse[]>([])

  const selectedEquipmentTypeId = ref<number | null>(null)

  const newEquipmentTypeName = ref('')
  const newEquipmentSpecName = ref('')

  const isCreating = ref(false)
  const isDeleting = ref(false)

  // 목록 로드
  const loadEquipmentTypes = async () => {
    try {
      equipmentTypes.value = await referenceApi.getEquipmentTypeList()
    } catch (error) {
      console.error('EquipmentType 목록 로드 실패:', error)
    }
  }

  const loadEquipmentSpecs = async (equipmentTypeId: number) => {
    try {
      equipmentSpecs.value = await referenceApi.getEquipmentSpecList(equipmentTypeId)
    } catch (error) {
      console.error('EquipmentSpec 목록 로드 실패:', error)
    }
  }

  // 선택
  const selectEquipmentType = (id: number) => {
    selectedEquipmentTypeId.value = id
  }

  // 추가
  const addEquipmentType = async () => {
    if (isCreating.value) return
    const name = newEquipmentTypeName.value.trim()
    if (!name) return

    isCreating.value = true
    try {
      await referenceApi.createEquipmentType(name)
      newEquipmentTypeName.value = ''
      await loadEquipmentTypes()
      analyticsClient.trackAction('admin_resource_data', 'create_equipment_type', 'success')
    } catch (error: unknown) {
      console.error('EquipmentType 추가 실패:', error)
      analyticsClient.trackAction('admin_resource_data', 'create_equipment_type', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreating.value = false
    }
  }

  const addEquipmentSpec = async () => {
    if (isCreating.value) return
    const name = newEquipmentSpecName.value.trim()
    if (!name || !selectedEquipmentTypeId.value) return

    isCreating.value = true
    try {
      await referenceApi.createEquipmentSpec(selectedEquipmentTypeId.value, name)
      newEquipmentSpecName.value = ''
      await loadEquipmentSpecs(selectedEquipmentTypeId.value)
      analyticsClient.trackAction('admin_resource_data', 'create_equipment_spec', 'success')
    } catch (error: unknown) {
      console.error('EquipmentSpec 추가 실패:', error)
      analyticsClient.trackAction('admin_resource_data', 'create_equipment_spec', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreating.value = false
    }
  }

  // 삭제
  const deleteEquipmentType = async (id: number) => {
    if (isDeleting.value) return
    isDeleting.value = true
    try {
      await referenceApi.deleteEquipmentType(id)
      if (selectedEquipmentTypeId.value === id) {
        selectedEquipmentTypeId.value = null
        equipmentSpecs.value = []
      }
      equipmentTypes.value = equipmentTypes.value.filter((et) => et.id !== id)
      analyticsClient.trackAction('admin_resource_data', 'delete_equipment_type', 'success')
    } catch (error: unknown) {
      console.error('EquipmentType 삭제 실패:', error)
      analyticsClient.trackAction('admin_resource_data', 'delete_equipment_type', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeleting.value = false
    }
  }

  const deleteEquipmentSpec = async (id: number) => {
    if (isDeleting.value) return
    isDeleting.value = true
    try {
      await referenceApi.deleteEquipmentSpec(id)
      equipmentSpecs.value = equipmentSpecs.value.filter((es) => es.id !== id)
      analyticsClient.trackAction('admin_resource_data', 'delete_equipment_spec', 'success')
    } catch (error: unknown) {
      console.error('EquipmentSpec 삭제 실패:', error)
      analyticsClient.trackAction('admin_resource_data', 'delete_equipment_spec', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeleting.value = false
    }
  }

  // 수정 (이름 변경)
  const updateEquipmentTypeName = async (id: number, name: string) => {
    try {
      await referenceApi.updateEquipmentType({ id, name })
      const item = equipmentTypes.value.find((et) => et.id === id)
      if (item) item.name = name
      analyticsClient.trackAction('admin_resource_data', 'update_equipment_type', 'success')
    } catch (error: unknown) {
      console.error('EquipmentType 이름 수정 실패:', error)
      analyticsClient.trackAction('admin_resource_data', 'update_equipment_type', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      await loadEquipmentTypes()
    }
  }

  const updateEquipmentSpecName = async (id: number, name: string) => {
    try {
      await referenceApi.updateEquipmentSpec({ id, name })
      const item = equipmentSpecs.value.find((es) => es.id === id)
      if (item) item.name = name
      analyticsClient.trackAction('admin_resource_data', 'update_equipment_spec', 'success')
    } catch (error: unknown) {
      console.error('EquipmentSpec 이름 수정 실패:', error)
      analyticsClient.trackAction('admin_resource_data', 'update_equipment_spec', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      if (selectedEquipmentTypeId.value) await loadEquipmentSpecs(selectedEquipmentTypeId.value)
    }
  }

  // 정렬 변경
  const reorderEquipmentTypes = async (ids: number[]) => {
    try {
      await referenceApi.updateEquipmentType({ ids })
      await loadEquipmentTypes()
    } catch (error: unknown) {
      console.error('EquipmentType 정렬 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      await loadEquipmentTypes()
    }
  }

  const reorderEquipmentSpecs = async (ids: number[]) => {
    if (!selectedEquipmentTypeId.value) return
    try {
      await referenceApi.updateEquipmentSpec({ ids, parentId: selectedEquipmentTypeId.value })
      await loadEquipmentSpecs(selectedEquipmentTypeId.value)
    } catch (error: unknown) {
      console.error('EquipmentSpec 정렬 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      if (selectedEquipmentTypeId.value) await loadEquipmentSpecs(selectedEquipmentTypeId.value)
    }
  }

  // 캐스케이딩 로드
  watch(selectedEquipmentTypeId, (id) => {
    equipmentSpecs.value = []
    if (id) loadEquipmentSpecs(id)
  })

  return {
    equipmentTypes,
    equipmentSpecs,
    selectedEquipmentTypeId,
    newEquipmentTypeName,
    newEquipmentSpecName,
    isCreating,
    isDeleting,
    loadEquipmentTypes,
    selectEquipmentType,
    addEquipmentType,
    addEquipmentSpec,
    deleteEquipmentType,
    deleteEquipmentSpec,
    updateEquipmentTypeName,
    updateEquipmentSpecName,
    reorderEquipmentTypes,
    reorderEquipmentSpecs,
  }
}
