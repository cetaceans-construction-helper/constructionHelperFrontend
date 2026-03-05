import { ref, computed } from 'vue'
import { referenceApi } from '@/shared/network-core/apis/reference'
import { materialTypePromptApi } from '@/shared/network-core/apis/materialTypePrompt'
import type { MaterialTypeResponse } from '@/shared/network-core/apis/reference'

export function usePromptManagement() {
  const materialTypes = ref<MaterialTypeResponse[]>([])
  const promptMap = ref<Map<number, string>>(new Map())
  const selectedMaterialTypeId = ref<number | null>(null)
  const editingPrompt = ref('')
  const isLoading = ref(false)
  const isSaving = ref(false)

  const selectedMaterialType = computed(() =>
    materialTypes.value.find((mt) => mt.id === selectedMaterialTypeId.value),
  )

  const hasExistingPrompt = computed(() =>
    selectedMaterialTypeId.value !== null && promptMap.value.has(selectedMaterialTypeId.value),
  )

  async function load() {
    isLoading.value = true
    try {
      const [types, prompts] = await Promise.all([
        referenceApi.getMaterialTypeList(),
        materialTypePromptApi.getMaterialTypePromptList(),
      ])
      materialTypes.value = types

      const map = new Map<number, string>()
      for (const p of prompts) {
        map.set(p.materialTypeId, p.prompt)
      }
      promptMap.value = map
    } catch (error: unknown) {
      console.error('프롬프트 관리 데이터 로드 실패:', error)
      const e = error as { response?: { data?: { message?: string } }; message?: string }
      alert(e.response?.data?.message || e.message)
    } finally {
      isLoading.value = false
    }
  }

  function selectMaterialType(id: number) {
    selectedMaterialTypeId.value = id
    editingPrompt.value = promptMap.value.get(id) ?? ''
  }

  async function savePrompt() {
    if (selectedMaterialTypeId.value === null) return
    isSaving.value = true
    try {
      const id = selectedMaterialTypeId.value
      if (hasExistingPrompt.value) {
        await materialTypePromptApi.updateMaterialTypePrompt(id, editingPrompt.value)
      } else {
        await materialTypePromptApi.createMaterialTypePrompt(id, editingPrompt.value)
      }
      promptMap.value = new Map(promptMap.value).set(id, editingPrompt.value)
      alert('저장되었습니다.')
    } catch (error: unknown) {
      console.error('프롬프트 저장 실패:', error)
      const e = error as { response?: { data?: { message?: string } }; message?: string }
      alert(e.response?.data?.message || e.message)
    } finally {
      isSaving.value = false
    }
  }

  async function deletePrompt() {
    if (selectedMaterialTypeId.value === null) return
    isSaving.value = true
    try {
      const id = selectedMaterialTypeId.value
      await materialTypePromptApi.deleteMaterialTypePrompt(id)
      const newMap = new Map(promptMap.value)
      newMap.delete(id)
      promptMap.value = newMap
      editingPrompt.value = ''
      alert('삭제되었습니다.')
    } catch (error: unknown) {
      console.error('프롬프트 삭제 실패:', error)
      const e = error as { response?: { data?: { message?: string } }; message?: string }
      alert(e.response?.data?.message || e.message)
    } finally {
      isSaving.value = false
    }
  }

  return {
    materialTypes,
    promptMap,
    selectedMaterialTypeId,
    selectedMaterialType,
    editingPrompt,
    hasExistingPrompt,
    isLoading,
    isSaving,
    load,
    selectMaterialType,
    savePrompt,
    deletePrompt,
  }
}
