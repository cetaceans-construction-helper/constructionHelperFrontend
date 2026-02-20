import { ref } from 'vue'
import { superApi } from '@/api/super'
import type { Project, CreateProjectPayload } from '@/types/super'

export function useProjectManagement() {
  const projects = ref<Project[]>([])
  const isLoading = ref(false)
  const isCreating = ref(false)

  const loadProjects = async () => {
    isLoading.value = true
    try {
      projects.value = await superApi.getProjectList()
    } catch (error) {
      console.error('프로젝트 목록 조회 실패:', error)
    } finally {
      isLoading.value = false
    }
  }

  const createProject = async (payload: CreateProjectPayload) => {
    if (isCreating.value) return
    isCreating.value = true
    try {
      await superApi.createProject(payload)
      await loadProjects()
      return true
    } catch (error: unknown) {
      console.error('프로젝트 생성 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      return false
    } finally {
      isCreating.value = false
    }
  }

  return {
    projects,
    isLoading,
    isCreating,
    loadProjects,
    createProject,
  }
}
