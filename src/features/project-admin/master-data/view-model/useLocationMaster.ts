import { ref } from 'vue'
import { referenceApi, type IdNameResponse } from '@/api/reference'
import { analyticsClient } from '@/shared/analytics/analyticsClient'

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

  const isDeleting = ref<Record<string, boolean>>({
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
      analyticsClient.trackAction('admin_master_data', 'create_zone', 'success')
    } catch (error: unknown) {
      console.error('Zone 추가 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'create_zone', 'fail')
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
      analyticsClient.trackAction('admin_master_data', 'create_floor', 'success')
    } catch (error: unknown) {
      console.error('Floor 추가 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'create_floor', 'fail')
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
      analyticsClient.trackAction('admin_master_data', 'create_section', 'success')
    } catch (error: unknown) {
      console.error('Section 추가 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'create_section', 'fail')
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
      analyticsClient.trackAction('admin_master_data', 'create_usage', 'success')
    } catch (error: unknown) {
      console.error('Usage 추가 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'create_usage', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isCreating.value.usage = false
    }
  }

  // 삭제
  const deleteZone = async (id: number) => {
    if (isDeleting.value.zone) return
    isDeleting.value.zone = true
    try {
      await referenceApi.deleteZone(id)
      zones.value = zones.value.filter((z) => z.id !== id)
      analyticsClient.trackAction('admin_master_data', 'delete_zone', 'success')
    } catch (error: unknown) {
      console.error('Zone 삭제 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'delete_zone', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeleting.value.zone = false
    }
  }

  const deleteFloor = async (id: number) => {
    if (isDeleting.value.floor) return
    isDeleting.value.floor = true
    try {
      await referenceApi.deleteFloor(id)
      floors.value = floors.value.filter((f) => f.id !== id)
      analyticsClient.trackAction('admin_master_data', 'delete_floor', 'success')
    } catch (error: unknown) {
      console.error('Floor 삭제 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'delete_floor', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeleting.value.floor = false
    }
  }

  const deleteSection = async (id: number) => {
    if (isDeleting.value.section) return
    isDeleting.value.section = true
    try {
      await referenceApi.deleteSection(id)
      sections.value = sections.value.filter((s) => s.id !== id)
      analyticsClient.trackAction('admin_master_data', 'delete_section', 'success')
    } catch (error: unknown) {
      console.error('Section 삭제 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'delete_section', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeleting.value.section = false
    }
  }

  const deleteUsage = async (id: number) => {
    if (isDeleting.value.usage) return
    isDeleting.value.usage = true
    try {
      await referenceApi.deleteUsage(id)
      usages.value = usages.value.filter((u) => u.id !== id)
      analyticsClient.trackAction('admin_master_data', 'delete_usage', 'success')
    } catch (error: unknown) {
      console.error('Usage 삭제 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'delete_usage', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    } finally {
      isDeleting.value.usage = false
    }
  }

  // 수정 (이름 변경)
  const updateZoneName = async (id: number, name: string) => {
    try {
      await referenceApi.updateZone({ id, name })
      const item = zones.value.find((z) => z.id === id)
      if (item) item.name = name
      analyticsClient.trackAction('admin_master_data', 'update_zone', 'success')
    } catch (error: unknown) {
      console.error('Zone 이름 수정 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'update_zone', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      await loadZones()
    }
  }

  const updateFloorName = async (id: number, name: string) => {
    try {
      await referenceApi.updateFloor({ id, name })
      const item = floors.value.find((f) => f.id === id)
      if (item) item.name = name
      analyticsClient.trackAction('admin_master_data', 'update_floor', 'success')
    } catch (error: unknown) {
      console.error('Floor 이름 수정 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'update_floor', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      await loadFloors()
    }
  }

  const updateSectionName = async (id: number, name: string) => {
    try {
      await referenceApi.updateSection({ id, name })
      const item = sections.value.find((s) => s.id === id)
      if (item) item.name = name
      analyticsClient.trackAction('admin_master_data', 'update_section', 'success')
    } catch (error: unknown) {
      console.error('Section 이름 수정 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'update_section', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      await loadSections()
    }
  }

  const updateUsageName = async (id: number, name: string) => {
    try {
      await referenceApi.updateUsage({ id, name })
      const item = usages.value.find((u) => u.id === id)
      if (item) item.name = name
      analyticsClient.trackAction('admin_master_data', 'update_usage', 'success')
    } catch (error: unknown) {
      console.error('Usage 이름 수정 실패:', error)
      analyticsClient.trackAction('admin_master_data', 'update_usage', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      await loadUsages()
    }
  }

  // 정렬 변경
  const reorderZones = async (ids: number[]) => {
    try {
      await referenceApi.updateZone({ ids })
      await loadZones()
    } catch (error: unknown) {
      console.error('Zone 정렬 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      await loadZones()
    }
  }

  const reorderFloors = async (ids: number[]) => {
    try {
      await referenceApi.updateFloor({ ids })
      await loadFloors()
    } catch (error: unknown) {
      console.error('Floor 정렬 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      await loadFloors()
    }
  }

  const reorderSections = async (ids: number[]) => {
    try {
      await referenceApi.updateSection({ ids })
      await loadSections()
    } catch (error: unknown) {
      console.error('Section 정렬 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      await loadSections()
    }
  }

  const reorderUsages = async (ids: number[]) => {
    try {
      await referenceApi.updateUsage({ ids })
      await loadUsages()
    } catch (error: unknown) {
      console.error('Usage 정렬 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      await loadUsages()
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
    isDeleting,
    loadAll,
    addZone,
    addFloor,
    addSection,
    addUsage,
    deleteZone,
    deleteFloor,
    deleteSection,
    deleteUsage,
    updateZoneName,
    updateFloorName,
    updateSectionName,
    updateUsageName,
    reorderZones,
    reorderFloors,
    reorderSections,
    reorderUsages,
  }
}
