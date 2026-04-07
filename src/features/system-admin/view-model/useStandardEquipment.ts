import { ref, watch } from 'vue'
import { standardApi } from '@/shared/network-core/apis/standard'
import type { IdNameResponse } from '@/shared/network-core/apis/reference'
import type { StdEquipmentSpecResponse } from '@/features/system-admin/model/standard-types'

export function useStandardEquipment() {
  const equipmentTypes = ref<IdNameResponse[]>([])
  const equipmentSpecs = ref<StdEquipmentSpecResponse[]>([])

  const selectedEquipmentTypeId = ref<number | null>(null)

  const newEquipmentTypeName = ref('')
  const newEquipmentSpecName = ref('')

  const isCreating = ref(false)
  const isDeleting = ref(false)

  const loadEquipmentTypes = async () => {
    try {
      equipmentTypes.value = await standardApi.equipmentType.getList()
    } catch (error) {
      console.error('StdEquipmentType 목록 로드 실패:', error)
    }
  }

  const loadEquipmentSpecs = async (equipmentTypeId: number) => {
    try {
      equipmentSpecs.value = await standardApi.equipmentSpec.getList(equipmentTypeId)
    } catch (error) {
      console.error('StdEquipmentSpec 목록 로드 실패:', error)
    }
  }

  const selectEquipmentType = (id: number) => {
    selectedEquipmentTypeId.value = id
  }

  const addEquipmentType = async () => {
    if (isCreating.value) return
    const name = newEquipmentTypeName.value.trim()
    if (!name) return

    isCreating.value = true
    try {
      const result = await standardApi.equipmentType.create({ name })
      newEquipmentTypeName.value = ''
      await loadEquipmentTypes()
      selectEquipmentType(result.id)
    } catch (error: unknown) {
      console.error('StdEquipmentType 추가 실패:', error)
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
      await standardApi.equipmentSpec.create({ name, parentId: selectedEquipmentTypeId.value })
      newEquipmentSpecName.value = ''
      await loadEquipmentSpecs(selectedEquipmentTypeId.value)
    } catch (error: unknown) {
      console.error('StdEquipmentSpec 추가 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreating.value = false
    }
  }

  const deleteEquipmentType = async (id: number) => {
    if (isDeleting.value) return
    isDeleting.value = true
    try {
      await standardApi.equipmentType.delete(id)
      if (selectedEquipmentTypeId.value === id) {
        selectedEquipmentTypeId.value = null
        equipmentSpecs.value = []
      }
      equipmentTypes.value = equipmentTypes.value.filter((et) => et.id !== id)
    } catch (error: unknown) {
      console.error('StdEquipmentType 삭제 실패:', error)
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
      await standardApi.equipmentSpec.delete(id)
      equipmentSpecs.value = equipmentSpecs.value.filter((es) => es.id !== id)
    } catch (error: unknown) {
      console.error('StdEquipmentSpec 삭제 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeleting.value = false
    }
  }

  const updateEquipmentTypeName = async (id: number, name: string) => {
    try {
      await standardApi.equipmentType.update(id, { name })
      const item = equipmentTypes.value.find((et) => et.id === id)
      if (item) item.name = name
    } catch (error: unknown) {
      console.error('StdEquipmentType 수정 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      await loadEquipmentTypes()
    }
  }

  const updateEquipmentSpecName = async (id: number, name: string) => {
    try {
      await standardApi.equipmentSpec.update(id, { name })
      const item = equipmentSpecs.value.find((es) => es.id === id)
      if (item) item.name = name
    } catch (error: unknown) {
      console.error('StdEquipmentSpec 수정 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      if (selectedEquipmentTypeId.value) await loadEquipmentSpecs(selectedEquipmentTypeId.value)
    }
  }

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
  }
}
