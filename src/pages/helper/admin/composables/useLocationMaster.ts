import { ref } from 'vue'
import { referenceApi, type IdNameResponse } from '@/api/reference'

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
      zones.value = await referenceApi.getZoneList()
    } catch (error) {
      console.error('Zone 목록 로드 실패:', error)
    }
  }

  const loadFloors = async () => {
    try {
      floors.value = await referenceApi.getFloorList()
    } catch (error) {
      console.error('Floor 목록 로드 실패:', error)
    }
  }

  const loadSections = async () => {
    try {
      sections.value = await referenceApi.getSectionList()
    } catch (error) {
      console.error('Section 목록 로드 실패:', error)
    }
  }

  const loadUsages = async () => {
    try {
      usages.value = await referenceApi.getUsageList()
    } catch (error) {
      console.error('Usage 목록 로드 실패:', error)
    }
  }

  const loadAll = async () => {
    await Promise.all([loadZones(), loadFloors(), loadSections(), loadUsages()])
  }

  // 추가
  const addZone = async () => {
    if (isCreating.value.zone) return
    const name = newZone.value.trim()
    if (!name) return

    isCreating.value.zone = true
    try {
      await referenceApi.createZone(name)
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
    if (isCreating.value.floor) return
    const name = newFloor.value.trim()
    if (!name) return

    isCreating.value.floor = true
    try {
      await referenceApi.createFloor(name)
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
    if (isCreating.value.section) return
    const name = newSection.value.trim()
    if (!name) return

    isCreating.value.section = true
    try {
      await referenceApi.createSection(name)
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
    if (isCreating.value.usage) return
    const name = newUsage.value.trim()
    if (!name) return

    isCreating.value.usage = true
    try {
      await referenceApi.createUsage(name)
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
