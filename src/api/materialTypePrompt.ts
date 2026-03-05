import apiClient from '@/api/apiClient'

export interface MaterialTypePromptResponse {
  id: number
  materialTypeId: number
  prompt: string
}

export const materialTypePromptApi = {
  async getMaterialTypePromptList(): Promise<MaterialTypePromptResponse[]> {
    const { data } = await apiClient.get<MaterialTypePromptResponse[]>(
      '/materialTypePrompt/getMaterialTypePromptList',
    )
    return data
  },

  async createMaterialTypePrompt(
    materialTypeId: number,
    prompt: string,
  ): Promise<MaterialTypePromptResponse> {
    const { data } = await apiClient.post<MaterialTypePromptResponse>(
      '/materialTypePrompt/createMaterialTypePrompt',
      { materialTypeId, prompt },
    )
    return data
  },

  async updateMaterialTypePrompt(
    materialTypeId: number,
    prompt: string,
  ): Promise<MaterialTypePromptResponse> {
    const { data } = await apiClient.post<MaterialTypePromptResponse>(
      `/materialTypePrompt/updateMaterialTypePrompt/${materialTypeId}`,
      { prompt },
    )
    return data
  },

  async deleteMaterialTypePrompt(materialTypeId: number): Promise<void> {
    await apiClient.delete(`/materialTypePrompt/deleteMaterialTypePrompt/${materialTypeId}`)
  },
}
