import { ref, watch, type Ref } from 'vue'
import { referenceApi, type EquipmentSpecResponse } from '@/shared/network-core/apis/reference'
import {
  equipmentApi,
  type EquipmentDeploymentByDateItem,
  type EquipmentDeploymentEntry,
} from '@/features/attendance/infra/equipment-api'
import type { Contractor } from '@/features/attendance/infra/attendance-api'
import { analyticsClient } from '@/shared/analytics/analyticsClient'

export interface EquipmentBox {
  id: string
  companyId: string | null
  workTypeId: number | null
  companyName: string
  workTypeName: string
  selectedSpecs: EquipmentSpecResponse[]
  isLoading: boolean
}

interface ApiError {
  response?: { data?: { message?: string } }
  message?: string
}

function getErrorMessage(error: unknown): string {
  const err = error as ApiError
  return err.response?.data?.message || err.message || '알 수 없는 오류가 발생했습니다.'
}

let boxIdCounter = 0

export function useEquipmentDeployment(
  selectedDate: Ref<string>,
  contractors: Ref<Contractor[]>,
) {
  const isSubmittingEquipment = ref(false)
  const allEquipmentSpecs = ref<EquipmentSpecResponse[]>([])
  const todayEquipment = ref<EquipmentDeploymentByDateItem[]>([])
  const isLoadingEquipment = ref(false)
  const equipmentBoxes = ref<EquipmentBox[]>([])

  const equipmentCounts = ref<Map<string, number>>(new Map())

  function getKey(boxId: string, specId: number): string {
    return `${boxId}-${specId}`
  }

  // --- count ---
  function getCount(boxId: string, specId: number): number {
    return equipmentCounts.value.get(getKey(boxId, specId)) ?? 0
  }

  function setCount(boxId: string, specId: number, count: number) {
    const key = getKey(boxId, specId)
    const newMap = new Map(equipmentCounts.value)
    newMap.set(key, Math.max(0, Math.round(count)))
    equipmentCounts.value = newMap
  }

  function incrementCount(boxId: string, specId: number) {
    setCount(boxId, specId, getCount(boxId, specId) + 1)
  }

  function decrementCount(boxId: string, specId: number) {
    setCount(boxId, specId, getCount(boxId, specId) - 1)
  }

  // --- 박스에 장비규격 추가/제거 ---
  function addSpecToBox(boxId: string, specId: number) {
    const box = equipmentBoxes.value.find((b) => b.id === boxId)
    if (!box) return
    if (box.selectedSpecs.some((s) => s.id === specId)) return

    const spec = allEquipmentSpecs.value.find((s) => s.id === specId)
    if (!spec) return

    box.selectedSpecs.push(spec)

    const key = getKey(boxId, specId)
    const newCT = new Map(equipmentCounts.value)
    newCT.set(key, 1)
    equipmentCounts.value = newCT
  }

  function removeSpecFromBox(boxId: string, specId: number) {
    const box = equipmentBoxes.value.find((b) => b.id === boxId)
    if (!box) return

    box.selectedSpecs = box.selectedSpecs.filter((s) => s.id !== specId)

    const key = getKey(boxId, specId)
    const newCT = new Map(equipmentCounts.value)
    newCT.delete(key)
    equipmentCounts.value = newCT
  }

  // --- 데이터 로드 ---
  async function loadAllEquipmentSpecs() {
    try {
      allEquipmentSpecs.value = await referenceApi.getEquipmentSpecList()
    } catch (error: unknown) {
      console.error('장비규격 전체 목록 로드 실패:', error)
    }
  }

  async function loadTodayEquipment() {
    try {
      isLoadingEquipment.value = true
      todayEquipment.value = await equipmentApi.getEquipmentDeploymentListByDate(selectedDate.value)
    } catch (error: unknown) {
      console.error('출역장비 조회 실패:', error)
      todayEquipment.value = []
    } finally {
      isLoadingEquipment.value = false
    }
    populateBoxesFromDeployment()
  }

  function populateBoxesFromDeployment() {
    equipmentBoxes.value = []

    const newCT = new Map<string, number>()

    if (todayEquipment.value.length > 0) {
      const companyGroups = new Map<string, EquipmentDeploymentByDateItem[]>()
      for (const item of todayEquipment.value) {
        if (!companyGroups.has(item.companyId)) {
          companyGroups.set(item.companyId, [])
        }
        companyGroups.get(item.companyId)!.push(item)
      }

      for (const [companyId, items] of companyGroups) {
        const first = items[0]
        if (!first) continue
        const boxId = `ebox-${++boxIdCounter}`

        // contractors에서 workType 조회
        const contractor = contractors.value.find((c) => c.companyId === companyId)

        const selectedSpecs: EquipmentSpecResponse[] = []
        for (const item of items) {
          const spec = allEquipmentSpecs.value.find((s) => s.id === item.equipmentSpecId)
          if (spec) {
            selectedSpecs.push(spec)
            newCT.set(getKey(boxId, spec.id), item.count)
          }
        }

        equipmentBoxes.value.push({
          id: boxId,
          companyId,
          workTypeId: first.workTypeId ?? contractor?.workTypeId ?? null,
          companyName: first.companyDisplayName,
          workTypeName: first.workTypeName ?? contractor?.workTypeName ?? '',
          selectedSpecs,
          isLoading: false,
        })
      }
    }

    // eligible 업체 중 아직 박스가 없는 업체 자동 생성
    const existingCompanyIds = new Set(
      equipmentBoxes.value.map((b) => b.companyId).filter(Boolean),
    )
    const newContractors = contractors.value.filter(
      (c) => c.eligible && c.workTypeId && !existingCompanyIds.has(c.companyId),
    )
    for (const company of newContractors) {
      const boxId = `ebox-${++boxIdCounter}`
      equipmentBoxes.value.push({
        id: boxId,
        companyId: company.companyId,
        workTypeId: company.workTypeId,
        companyName: company.companyDisplayName,
        workTypeName: company.workTypeName || '',
        selectedSpecs: [],
        isLoading: false,
      })
    }

    equipmentCounts.value = newCT
  }

  // --- 박스 관리 ---
  function addEmptyBox() {
    equipmentBoxes.value.push({
      id: `ebox-${++boxIdCounter}`,
      companyId: null,
      workTypeId: null,
      companyName: '',
      workTypeName: '',
      selectedSpecs: [],
      isLoading: false,
    })
  }

  function selectCompany(boxId: string, companyId: string) {
    const box = equipmentBoxes.value.find((b) => b.id === boxId)
    if (!box) return

    const company = contractors.value.find((c) => c.companyId === companyId)
    if (!company) return

    const exists = equipmentBoxes.value.some(
      (b) => b.id !== boxId && b.companyId === companyId,
    )
    if (exists) {
      alert('이미 추가된 업체입니다.')
      return
    }

    // 기존 데이터 정리
    const newCT = new Map(equipmentCounts.value)
    for (const spec of box.selectedSpecs) {
      newCT.delete(getKey(boxId, spec.id))
    }
    equipmentCounts.value = newCT

    box.companyId = company.companyId
    box.workTypeId = company.workTypeId
    box.companyName = company.companyDisplayName
    box.workTypeName = company.workTypeName || ''
    box.selectedSpecs = []
  }

  function removeEquipmentBox(boxId: string) {
    const box = equipmentBoxes.value.find((b) => b.id === boxId)
    if (box) {
      const newCT = new Map(equipmentCounts.value)
      for (const spec of box.selectedSpecs) {
        newCT.delete(getKey(boxId, spec.id))
      }
      equipmentCounts.value = newCT
    }
    equipmentBoxes.value = equipmentBoxes.value.filter((b) => b.id !== boxId)
  }

  // --- 제출 ---
  async function submitEquipmentDeployment(): Promise<boolean> {
    const validBoxes = equipmentBoxes.value.filter((box) => box.companyId)

    if (validBoxes.length === 0) {
      alert('제출할 출역장비가 없습니다.')
      return false
    }

    const entries: EquipmentDeploymentEntry[] = []
    const warnings: string[] = []

    for (const box of validBoxes) {
      if (!box.companyId) continue

      // workTypeId가 null이면 contractors에서 재조회 (race condition 대응)
      const workTypeId =
        box.workTypeId ??
        contractors.value.find((c) => c.companyId === box.companyId)?.workTypeId ??
        null
      if (workTypeId == null) {
        warnings.push(`${box.workTypeName || box.companyName}: 공종 정보를 찾을 수 없습니다.`)
        continue
      }

      for (const spec of box.selectedSpecs) {
        const key = getKey(box.id, spec.id)
        const count = equipmentCounts.value.get(key) ?? 0
        entries.push({
          equipmentSpecId: spec.id,
          count,
          workTypeId,
        })
      }
    }

    if (warnings.length > 0) {
      alert(warnings.join('\n'))
      return false
    }

    if (entries.length === 0) {
      alert('제출할 장비가 없습니다.')
      return false
    }

    try {
      isSubmittingEquipment.value = true

      await equipmentApi.createEquipmentDeployment({
        date: selectedDate.value,
        entries,
      })

      alert('출역장비가 저장되었습니다.')
      analyticsClient.trackAction('material_equipment', 'save_equipment', 'success')
      await loadTodayEquipment()
      return true
    } catch (error: unknown) {
      console.error('출역장비 저장 실패:', error)
      analyticsClient.trackAction('material_equipment', 'save_equipment', 'fail')
      alert(getErrorMessage(error))
      return false
    } finally {
      isSubmittingEquipment.value = false
    }
  }

  // 출역장비 초기화 (일괄 삭제)
  async function resetEquipmentDeployment() {
    if (!confirm(`${selectedDate.value} 출역장비를 초기화하시겠습니까?`)) return

    try {
      await equipmentApi.deleteEquipmentDeploymentList(selectedDate.value)
      await loadTodayEquipment()
      analyticsClient.trackAction('material_equipment', 'reset_equipment', 'success')
    } catch (error: unknown) {
      console.error('출역장비 초기화 실패:', error)
      analyticsClient.trackAction('material_equipment', 'reset_equipment', 'fail')
      alert(getErrorMessage(error))
    }
  }

  watch(selectedDate, () => {
    loadTodayEquipment()
  })

  async function init() {
    await loadAllEquipmentSpecs()
    await loadTodayEquipment()
  }

  return {
    isSubmittingEquipment,
    allEquipmentSpecs,
    todayEquipment,
    isLoadingEquipment,
    equipmentBoxes,
    equipmentCounts,

    init,
    addEmptyBox,
    selectCompany,
    removeEquipmentBox,
    addSpecToBox,
    removeSpecFromBox,
    getCount,
    setCount,
    incrementCount,
    decrementCount,
    submitEquipmentDeployment,
    resetEquipmentDeployment,
  }
}
