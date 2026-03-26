import { computed, type Ref } from 'vue'
import type { Edge } from '@vue-flow/core'
import { workDepApi, type WorkDepResponse } from '@/shared/network-core/apis/workDep'
import type { MutationResponse } from '@/shared/network-core/apis/work'
import { analyticsClient } from '@/shared/analytics/analyticsClient'

const DEP_COLOR = '#3b82f6'

export function useDependencyEditor(
  edges: Ref<Edge[]>,
  deps: Ref<WorkDepResponse[]>,
  activeVersion: Ref<number>,
  onMutation: (mutation: MutationResponse) => void,
) {
  // 엣지 스타일링
  const styledEdges = computed(() => {
    return edges.value.map(e => {
      const offset = e.data?.offset || 0
      const isFollowing = e.data?.isFollowing !== false
      const edgeColor = DEP_COLOR
      return {
        ...e,
        style: {
          stroke: edgeColor,
          strokeDasharray: isFollowing ? undefined : '12 8',
          transform: `translate(${offset}px, ${offset}px)`,
        },
      }
    })
  })

  // 의존관계 생성 — 후행작업추가(lagDays=null) 또는 따라가기추가(lagDays=0)
  const createDep = async (sourceWorkId: number, targetWorkId: number, lagDays: number | null) => {
    try {
      const mutation = await workDepApi.createWorkDep({
        sourceWorkId,
        targetWorkId,
        lagDays,
        scheduleVersionId: activeVersion.value,
      })
      onMutation(mutation)
      analyticsClient.trackAction('schedule_2d', 'create_dep', 'success')
      return mutation
    } catch (error: unknown) {
      console.error('의존관계 생성 실패:', error)
      analyticsClient.trackAction('schedule_2d', 'create_dep', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
      return null
    }
  }

  // lagDays 수정
  const updateLagDays = async (depId: number, lagDays: number | null) => {
    try {
      const mutation = await workDepApi.updateWorkDep(depId, { lagDays })
      onMutation(mutation)
      analyticsClient.trackAction('schedule_2d', 'update_dep_lag_days', 'success')
    } catch (error: unknown) {
      console.error('lagDays 수정 실패:', error)
      analyticsClient.trackAction('schedule_2d', 'update_dep_lag_days', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    }
  }

  // lagDays 로컬 업데이트 (저장 전 UI 반영)
  const updateLagDaysLocal = (depId: number, lagDays: number | null) => {
    const idx = deps.value.findIndex(d => d.id === depId)
    if (idx === -1) return
    deps.value = deps.value.map(d => d.id === depId ? { ...d, lagDays } : d)

    // 엣지 동기화
    const edgeId = `dep-${depId}`
    const edgeIdx = edges.value.findIndex(e => e.id === edgeId)
    if (edgeIdx !== -1) {
      const e = edges.value[edgeIdx]!
      edges.value[edgeIdx] = {
        ...e,
        data: { ...e.data, isFollowing: lagDays !== null, lagDays },
      }
      edges.value = [...edges.value]
    }
  }

  // 의존관계 삭제
  const deleteDep = async (depId: number) => {
    try {
      const mutation = await workDepApi.deleteWorkDep(depId)
      onMutation(mutation)
      analyticsClient.trackAction('schedule_2d', 'delete_dep', 'success')
    } catch (error: unknown) {
      console.error('의존관계 삭제 실패:', error)
      analyticsClient.trackAction('schedule_2d', 'delete_dep', 'fail')
      const err = error as { response?: { data?: { message?: string } }; message?: string }
      alert(err.response?.data?.message || err.message)
    }
  }

  return {
    styledEdges,
    createDep,
    updateLagDays,
    updateLagDaysLocal,
    deleteDep,
  }
}
