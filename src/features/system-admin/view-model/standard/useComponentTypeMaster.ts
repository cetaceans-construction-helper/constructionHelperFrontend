import { ref, watch } from 'vue'
import { referenceApi, type ComponentTypeResponse } from '@/shared/network-core/apis/reference'
import { analyticsClient } from '@/shared/analytics/analyticsClient'

export function useComponentTypeMaster() {
  const selectedIsStructure = ref<boolean | null>(null)
  const componentTypes = ref<ComponentTypeResponse[]>([])
  const newComponentTypeName = ref('')
  const isCreating = ref(false)
  const isDeleting = ref(false)

  const loadComponentTypes = async (isStructure: boolean) => {
    try {
      componentTypes.value = await referenceApi.getComponentTypeList(isStructure)
    } catch (error) {
      console.error('ComponentType 목록 로드 실패:', error)
      componentTypes.value = []
    }
  }

  const addComponentType = async () => {
    if (isCreating.value) return
    if (selectedIsStructure.value == null) return
    const name = newComponentTypeName.value.trim()
    if (!name) return

    isCreating.value = true
    try {
      await referenceApi.createComponentType(name, selectedIsStructure.value)
      newComponentTypeName.value = ''
      await loadComponentTypes(selectedIsStructure.value)
      analyticsClient.trackAction('system_admin', 'create_component_type', 'success')
    } catch (error: unknown) {
      console.error('ComponentType 추가 실패:', error)
      analyticsClient.trackAction('system_admin', 'create_component_type', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreating.value = false
    }
  }

  const deleteComponentType = async (id: number) => {
    if (isDeleting.value) return
    isDeleting.value = true
    try {
      await referenceApi.deleteComponentType(id)
      componentTypes.value = componentTypes.value.filter((ct) => ct.id !== id)
      analyticsClient.trackAction('system_admin', 'delete_component_type', 'success')
    } catch (error: unknown) {
      console.error('ComponentType 삭제 실패:', error)
      analyticsClient.trackAction('system_admin', 'delete_component_type', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeleting.value = false
    }
  }

  const updateComponentTypeName = async (id: number, name: string) => {
    try {
      await referenceApi.updateComponentType({ id, name })
      const item = componentTypes.value.find((ct) => ct.id === id)
      if (item) item.name = name
      analyticsClient.trackAction('system_admin', 'update_component_type', 'success')
    } catch (error: unknown) {
      console.error('ComponentType 이름 수정 실패:', error)
      analyticsClient.trackAction('system_admin', 'update_component_type', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      if (selectedIsStructure.value != null) await loadComponentTypes(selectedIsStructure.value)
    }
  }

  const reorderComponentTypes = async (ids: number[]) => {
    if (selectedIsStructure.value == null) return
    try {
      await referenceApi.updateComponentType({ ids, isStructure: selectedIsStructure.value })
      await loadComponentTypes(selectedIsStructure.value)
    } catch (error: unknown) {
      console.error('ComponentType 정렬 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      if (selectedIsStructure.value != null) await loadComponentTypes(selectedIsStructure.value)
    }
  }

  watch(selectedIsStructure, (isStructure) => {
    componentTypes.value = []
    if (isStructure != null) {
      loadComponentTypes(isStructure)
    }
  })

  return {
    selectedIsStructure,
    componentTypes,
    newComponentTypeName,
    isCreating,
    isDeleting,
    loadComponentTypes,
    addComponentType,
    deleteComponentType,
    updateComponentTypeName,
    reorderComponentTypes,
  }
}
