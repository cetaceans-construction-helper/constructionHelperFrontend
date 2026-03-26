import { ref } from 'vue'
import { scheduleVersionApi, type ScheduleVersionResponse } from '@/shared/network-core/apis/scheduleVersion'

const MAX_VERSIONS = 5

export function useScheduleVersion() {
  const versions = ref<ScheduleVersionResponse[]>([])
  const activeVersion = ref<number>(0)
  const isLoading = ref(false)

  const loadVersions = async () => {
    isLoading.value = true
    try {
      versions.value = await scheduleVersionApi.getScheduleVersionList()
      if (versions.value.length > 0 && !versions.value.some(v => v.id === activeVersion.value)) {
        activeVersion.value = versions.value[0]!.id
      }
    } finally {
      isLoading.value = false
    }
  }

  const createVersion = async () => {
    if (versions.value.length >= MAX_VERSIONS) return null
    const nextNum = versions.value.length + 1
    const created = await scheduleVersionApi.createScheduleVersion(`새 공정표${nextNum}`)
    versions.value = [...versions.value, created]
    activeVersion.value = created.id
    return created
  }

  const duplicateVersion = async (scheduleVersionId: number) => {
    if (versions.value.length >= MAX_VERSIONS) return null
    const source = versions.value.find(v => v.id === scheduleVersionId)
    const versionName = source ? `${source.versionName} 복사본` : '복사본'
    const created = await scheduleVersionApi.duplicateScheduleVersion(scheduleVersionId, versionName)
    versions.value = [...versions.value, created]
    activeVersion.value = created.id
    return created
  }

  const updateVersionName = async (scheduleVersionId: number, versionName: string) => {
    const updated = await scheduleVersionApi.updateScheduleVersion(scheduleVersionId, versionName)
    versions.value = versions.value.map(v => v.id === updated.id ? updated : v)
    return updated
  }

  const deleteVersion = async (scheduleVersionId: number) => {
    await scheduleVersionApi.deleteScheduleVersion(scheduleVersionId)
    const deleted = versions.value.find(v => v.id === scheduleVersionId)
    versions.value = versions.value.filter(v => v.id !== scheduleVersionId)
    if (deleted && activeVersion.value === deleted.id && versions.value.length > 0) {
      activeVersion.value = versions.value[0]!.id
    }
  }

  const setMainVersion = async (scheduleVersionId: number) => {
    const target = versions.value.find(v => v.id === scheduleVersionId)
    if (!target || target.isMain) return
    await scheduleVersionApi.updateScheduleVersion(scheduleVersionId, target.versionName, true)
    versions.value = versions.value.map(v => ({ ...v, isMain: v.id === scheduleVersionId }))
  }

  const canCreate = () => versions.value.length < MAX_VERSIONS

  return {
    versions,
    activeVersion,
    isLoading,
    loadVersions,
    createVersion,
    duplicateVersion,
    updateVersionName,
    deleteVersion,
    setMainVersion,
    canCreate,
  }
}
