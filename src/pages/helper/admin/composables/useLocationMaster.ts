import { ref } from 'vue'
import { workLocationApi } from '@/api/workLocation'
import type { IdNameResponse } from '@/api/subWorkType'

export function useLocationMaster() {
  const zones = ref<IdNameResponse[]>([])
  const floors = ref<IdNameResponse[]>([])
  const sections = ref<IdNameResponse[]>([])
  const usages = ref<IdNameResponse[]>([])

  const newZone = ref('')
  const newFloor = ref('')
  const newSection = ref('')
  const newUsage = ref('')

  const isCreating = ref<Record<string, boolean>>({
    zone: false,
    floor: false,
    section: false,
    usage: false,
  })

  // 개별 목록 로드
  const loadZones = async () => {
    try {
      zones.value = await workLocationApi.getZoneList()
    } catch (error) {
      console.error('Zone 목록 로드 실패:', error)
    }
  }

  const loadFloors = async () => {
    try {
      floors.value = await workLocationApi.getFloorList()
    } catch (error) {
      console.error('Floor 목록 로드 실패:', error)
    }
  }

  const loadSections = async () => {
    try {
      sections.value = await workLocationApi.getSectionList()
    } catch (error) {
      console.error('Section 목록 로드 실패:', error)
    }
  }

  const loadUsages = async () => {
    try {
      usages.value = await workLocationApi.getUsageList()
    } catch (error) {
      console.error('Usage 목록 로드 실패:', error)
    }
  }

  const loadAll = async () => {
    await Promise.all([loadZones(), loadFloors(), loadSections(), loadUsages()])
  }

  // 추가
  const addZone = async () => {
    const name = newZone.value.trim()
    if (!name) return

    isCreating.value.zone = true
    try {
      await workLocationApi.createZone(name)
      newZone.value = ''
      await loadZones()
    } catch (error: unknown) {
      console.error('Zone 추가 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreating.value.zone = false
    }
  }

  const addFloor = async () => {
    const name = newFloor.value.trim()
    if (!name) return

    isCreating.value.floor = true
    try {
      await workLocationApi.createFloor(name)
      newFloor.value = ''
      await loadFloors()
    } catch (error: unknown) {
      console.error('Floor 추가 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreating.value.floor = false
    }
  }

  const addSection = async () => {
    const name = newSection.value.trim()
    if (!name) return

    isCreating.value.section = true
    try {
      await workLocationApi.createSection(name)
      newSection.value = ''
      await loadSections()
    } catch (error: unknown) {
      console.error('Section 추가 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreating.value.section = false
    }
  }

  const addUsage = async () => {
    const name = newUsage.value.trim()
    if (!name) return

    isCreating.value.usage = true
    try {
      await workLocationApi.createUsage(name)
      newUsage.value = ''
      await loadUsages()
    } catch (error: unknown) {
      console.error('Usage 추가 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreating.value.usage = false
    }
  }

  return {
    zones,
    floors,
    sections,
    usages,
    newZone,
    newFloor,
    newSection,
    newUsage,
    isCreating,
    loadAll,
    addZone,
    addFloor,
    addSection,
    addUsage,
  }
}
