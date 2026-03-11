import { computed, ref } from 'vue'
import { schedule2dRebuildRepository } from '@/features/schedule/schedule-2d-rebuild/infra/schedule-rebuild-repository'
import type { ScheduleSnapshot } from '@/features/schedule/schedule-2d-rebuild/model/schedule-rebuild-types'
import { scheduleService } from '@/features/schedule/schedule-2d-rebuild/use-cases/schedule-service'
import {
  createClosedScheduleContextMenuState,
  createEmptyScheduleSelectionState,
} from '@/features/schedule/schedule-2d-rebuild/view-model/schedule-interaction-state'

export function useSchedule2dRebuildPage() {
  const snapshot = ref<ScheduleSnapshot | null>(null)
  const isLoading = ref(false)
  const errorMessage = ref('')
  const selectionState = ref(createEmptyScheduleSelectionState())
  const contextMenuState = ref(createClosedScheduleContextMenuState())

  const summary = computed(() => {
    if (!snapshot.value) {
      return {
        rows: 0,
        items: 0,
        dependencies: 0,
        groups: 0,
        milestones: 0,
        pendingContracts: 0,
      }
    }

    return {
      rows: snapshot.value.rows.length,
      items: snapshot.value.items.length,
      dependencies: snapshot.value.dependencies.length,
      groups: snapshot.value.groups.length,
      milestones: snapshot.value.milestones.length,
      pendingContracts: snapshot.value.pendingContracts.length,
    }
  })

  const previewRows = computed(() => snapshot.value?.rows.slice(0, 8) ?? [])
  const previewItems = computed(() => snapshot.value?.items.slice(0, 8) ?? [])
  const previewDependencies = computed(() => snapshot.value?.dependencies.slice(0, 8) ?? [])

  async function loadSnapshot() {
    isLoading.value = true
    errorMessage.value = ''

    try {
      snapshot.value = await scheduleService.loadSnapshot(schedule2dRebuildRepository)
    } catch (error: unknown) {
      console.error('2D 공정표 리빌드 snapshot 로드 실패:', error)
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      errorMessage.value = err.response?.data?.message || err.message || 'Snapshot 로드 실패'
    } finally {
      isLoading.value = false
    }
  }

  return {
    snapshot,
    isLoading,
    errorMessage,
    summary,
    selectionState,
    contextMenuState,
    previewRows,
    previewItems,
    previewDependencies,
    loadSnapshot,
  }
}
