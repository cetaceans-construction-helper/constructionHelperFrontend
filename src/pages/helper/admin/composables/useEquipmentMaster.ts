import { ref, watch } from 'vue'
import {
  referenceApi,
  type EquipmentTypeResponse,
  type EquipmentSpecResponse,
} from '@/api/reference'

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
    } catch (error: unknown) {
      console.error('EquipmentType 추가 실패:', error)
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
    } catch (error: unknown) {
      console.error('EquipmentSpec 추가 실패:', error)
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
    } catch (error: unknown) {
      console.error('EquipmentType 삭제 실패:', error)
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
    } catch (error: unknown) {
      console.error('EquipmentSpec 삭제 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeleting.value = false
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
  }
}
