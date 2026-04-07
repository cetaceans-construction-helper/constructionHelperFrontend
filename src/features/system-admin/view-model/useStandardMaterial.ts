import { ref, watch } from 'vue'
import { standardApi } from '@/shared/network-core/apis/standard'
import type { IdNameResponse } from '@/shared/network-core/apis/reference'
import type { StdMaterialSpecResponse } from '@/features/system-admin/model/standard-types'

export function useStandardMaterial() {
  const materialTypes = ref<IdNameResponse[]>([])
  const materialSpecs = ref<StdMaterialSpecResponse[]>([])

  const selectedMaterialTypeId = ref<number | null>(null)

  const newMaterialTypeName = ref('')
  const newMaterialSpecName = ref('')

  const isCreating = ref(false)
  const isDeleting = ref(false)

  const loadMaterialTypes = async () => {
    try {
      materialTypes.value = await standardApi.materialType.getList()
    } catch (error) {
      console.error('StdMaterialType 목록 로드 실패:', error)
    }
  }

  const loadMaterialSpecs = async (materialTypeId: number) => {
    try {
      materialSpecs.value = await standardApi.materialSpec.getList(materialTypeId)
    } catch (error) {
      console.error('StdMaterialSpec 목록 로드 실패:', error)
    }
  }

  const selectMaterialType = (id: number) => {
    selectedMaterialTypeId.value = id
  }

  const addMaterialType = async () => {
    if (isCreating.value) return
    const name = newMaterialTypeName.value.trim()
    if (!name) return

    isCreating.value = true
    try {
      const result = await standardApi.materialType.create({ name })
      newMaterialTypeName.value = ''
      await loadMaterialTypes()
      selectMaterialType(result.id)
    } catch (error: unknown) {
      console.error('StdMaterialType 추가 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreating.value = false
    }
  }

  const addMaterialSpec = async () => {
    if (isCreating.value) return
    const name = newMaterialSpecName.value.trim()
    if (!name || !selectedMaterialTypeId.value) return

    isCreating.value = true
    try {
      await standardApi.materialSpec.create({ name, parentId: selectedMaterialTypeId.value })
      newMaterialSpecName.value = ''
      await loadMaterialSpecs(selectedMaterialTypeId.value)
    } catch (error: unknown) {
      console.error('StdMaterialSpec 추가 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreating.value = false
    }
  }

  const deleteMaterialType = async (id: number) => {
    if (isDeleting.value) return
    isDeleting.value = true
    try {
      await standardApi.materialType.delete(id)
      if (selectedMaterialTypeId.value === id) {
        selectedMaterialTypeId.value = null
        materialSpecs.value = []
      }
      materialTypes.value = materialTypes.value.filter((mt) => mt.id !== id)
    } catch (error: unknown) {
      console.error('StdMaterialType 삭제 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeleting.value = false
    }
  }

  const deleteMaterialSpec = async (id: number) => {
    if (isDeleting.value) return
    isDeleting.value = true
    try {
      await standardApi.materialSpec.delete(id)
      materialSpecs.value = materialSpecs.value.filter((ms) => ms.id !== id)
    } catch (error: unknown) {
      console.error('StdMaterialSpec 삭제 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeleting.value = false
    }
  }

  const updateMaterialTypeName = async (id: number, name: string) => {
    try {
      await standardApi.materialType.update(id, { name })
      const item = materialTypes.value.find((mt) => mt.id === id)
      if (item) item.name = name
    } catch (error: unknown) {
      console.error('StdMaterialType 수정 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      await loadMaterialTypes()
    }
  }

  const updateMaterialSpecName = async (id: number, name: string) => {
    try {
      await standardApi.materialSpec.update(id, { name })
      const item = materialSpecs.value.find((ms) => ms.id === id)
      if (item) item.name = name
    } catch (error: unknown) {
      console.error('StdMaterialSpec 수정 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      if (selectedMaterialTypeId.value) await loadMaterialSpecs(selectedMaterialTypeId.value)
    }
  }

  watch(selectedMaterialTypeId, (id) => {
    materialSpecs.value = []
    if (id) loadMaterialSpecs(id)
  })

  return {
    materialTypes,
    materialSpecs,
    selectedMaterialTypeId,
    newMaterialTypeName,
    newMaterialSpecName,
    isCreating,
    isDeleting,
    loadMaterialTypes,
    selectMaterialType,
    addMaterialType,
    addMaterialSpec,
    deleteMaterialType,
    deleteMaterialSpec,
    updateMaterialTypeName,
    updateMaterialSpecName,
  }
}
