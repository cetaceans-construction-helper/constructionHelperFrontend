import { ref } from 'vue'
import { defineStore } from 'pinia'

const STORAGE_KEY = 'selectedProjectId'

export const useProjectStore = defineStore('project', () => {
  // localStorage에서 초기값 로드
  const selectedProjectId = ref<string | null>(
    localStorage.getItem(STORAGE_KEY)
  )

  const setProject = (projectId: string) => {
    selectedProjectId.value = projectId
    localStorage.setItem(STORAGE_KEY, projectId)
  }

  return { selectedProjectId, setProject }
})
