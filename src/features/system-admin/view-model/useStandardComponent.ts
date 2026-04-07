import { ref, watch } from 'vue'
import { standardApi } from '@/shared/network-core/apis/standard'
import type { IdNameResponse } from '@/shared/network-core/apis/reference'
import type { StdComponentTypeResponse } from '@/features/system-admin/model/standard-types'

export function useStandardComponent() {
  const componentDivisions = ref<IdNameResponse[]>([])
  const componentTypes = ref<StdComponentTypeResponse[]>([])

  const selectedComponentDivisionId = ref<number | null>(null)

  const newComponentDivisionName = ref('')
  const newComponentTypeName = ref('')

  const isCreating = ref(false)
  const isDeleting = ref(false)

  const loadComponentDivisions = async () => {
    try {
      componentDivisions.value = await standardApi.componentDivision.getList()
    } catch (error) {
      console.error('StdComponentDivision 목록 로드 실패:', error)
    }
  }

  const loadComponentTypes = async (componentDivisionId: number) => {
    try {
      componentTypes.value = await standardApi.componentType.getList(componentDivisionId)
    } catch (error) {
      console.error('StdComponentType 목록 로드 실패:', error)
    }
  }

  const selectComponentDivision = (id: number) => {
    selectedComponentDivisionId.value = id
  }

  const addComponentDivision = async () => {
    if (isCreating.value) return
    const name = newComponentDivisionName.value.trim()
    if (!name) return

    isCreating.value = true
    try {
      const result = await standardApi.componentDivision.create({ name })
      newComponentDivisionName.value = ''
      await loadComponentDivisions()
      selectComponentDivision(result.id)
    } catch (error: unknown) {
      console.error('StdComponentDivision 추가 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreating.value = false
    }
  }

  const addComponentType = async () => {
    if (isCreating.value) return
    const name = newComponentTypeName.value.trim()
    if (!name || !selectedComponentDivisionId.value) return

    isCreating.value = true
    try {
      await standardApi.componentType.create({ name, parentId: selectedComponentDivisionId.value })
      newComponentTypeName.value = ''
      await loadComponentTypes(selectedComponentDivisionId.value)
    } catch (error: unknown) {
      console.error('StdComponentType 추가 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreating.value = false
    }
  }

  const deleteComponentDivision = async (id: number) => {
    if (isDeleting.value) return
    isDeleting.value = true
    try {
      await standardApi.componentDivision.delete(id)
      if (selectedComponentDivisionId.value === id) {
        selectedComponentDivisionId.value = null
        componentTypes.value = []
      }
      componentDivisions.value = componentDivisions.value.filter((cd) => cd.id !== id)
    } catch (error: unknown) {
      console.error('StdComponentDivision 삭제 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeleting.value = false
    }
  }

  const deleteComponentType = async (id: number) => {
    if (isDeleting.value) return
    isDeleting.value = true
    try {
      await standardApi.componentType.delete(id)
      componentTypes.value = componentTypes.value.filter((ct) => ct.id !== id)
    } catch (error: unknown) {
      console.error('StdComponentType 삭제 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeleting.value = false
    }
  }

  const updateComponentDivisionName = async (id: number, name: string) => {
    try {
      await standardApi.componentDivision.update(id, { name })
      const item = componentDivisions.value.find((cd) => cd.id === id)
      if (item) item.name = name
    } catch (error: unknown) {
      console.error('StdComponentDivision 수정 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      await loadComponentDivisions()
    }
  }

  const updateComponentTypeName = async (id: number, name: string) => {
    try {
      await standardApi.componentType.update(id, { name })
      const item = componentTypes.value.find((ct) => ct.id === id)
      if (item) item.name = name
    } catch (error: unknown) {
      console.error('StdComponentType 수정 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      if (selectedComponentDivisionId.value) await loadComponentTypes(selectedComponentDivisionId.value)
    }
  }

  watch(selectedComponentDivisionId, (id) => {
    componentTypes.value = []
    if (id) loadComponentTypes(id)
  })

  return {
    componentDivisions,
    componentTypes,
    selectedComponentDivisionId,
    newComponentDivisionName,
    newComponentTypeName,
    isCreating,
    isDeleting,
    loadComponentDivisions,
    selectComponentDivision,
    addComponentDivision,
    addComponentType,
    deleteComponentDivision,
    deleteComponentType,
    updateComponentDivisionName,
    updateComponentTypeName,
  }
}
