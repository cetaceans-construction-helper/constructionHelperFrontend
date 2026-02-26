import { ref, watch, type Ref } from 'vue'
import { referenceApi, type EquipmentSpecResponse } from '@/api/reference'
import {
  equipmentApi,
  type EquipmentDeploymentByDateItem,
  type EquipmentDeploymentEntry,
} from '@/api/equipment'
import type { Contractor } from '@/api/attendance'
import { analyticsClient } from '@/lib/analytics/analyticsClient'

export interface EquipmentBox {
  id: string
  companyId: string | null
  companyName: string
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

  // workTime, count — ref<Map>으로 관리 (useAttendance의 laborCounts 패턴과 동일)
  const equipmentWorkTimes = ref<Map<string, number>>(new Map())
  const equipmentCounts = ref<Map<string, number>>(new Map())

  function getKey(boxId: string, specId: number): string {
    return `${boxId}-${specId}`
  }

  function roundToHalf(time: number): number {
    return Math.round(time * 2) / 2
  }

  // --- workTime ---
  function getWorkTime(boxId: string, specId: number): number {
    return equipmentWorkTimes.value.get(getKey(boxId, specId)) ?? 0
  }

  function setWorkTime(boxId: string, specId: number, time: number) {
    const key = getKey(boxId, specId)
    const newMap = new Map(equipmentWorkTimes.value)
    newMap.set(key, roundToHalf(Math.max(0, time)))
    equipmentWorkTimes.value = newMap
  }

  function incrementWorkTime(boxId: string, specId: number) {
    setWorkTime(boxId, specId, getWorkTime(boxId, specId) + 0.5)
  }

  function decrementWorkTime(boxId: string, specId: number) {
    setWorkTime(boxId, specId, getWorkTime(boxId, specId) - 0.5)
  }

  function setFullDay(boxId: string, specId: number) {
    setWorkTime(boxId, specId, 8.0)
  }

  function setHalfDay(boxId: string, specId: number) {
    setWorkTime(boxId, specId, 4.0)
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
    const newWT = new Map(equipmentWorkTimes.value)
    const newCT = new Map(equipmentCounts.value)
    newWT.set(key, 0)
    newCT.set(key, 1)
    equipmentWorkTimes.value = newWT
    equipmentCounts.value = newCT
  }

  function removeSpecFromBox(boxId: string, specId: number) {
    const box = equipmentBoxes.value.find((b) => b.id === boxId)
    if (!box) return

    box.selectedSpecs = box.selectedSpecs.filter((s) => s.id !== specId)

    const key = getKey(boxId, specId)
    const newWT = new Map(equipmentWorkTimes.value)
    const newCT = new Map(equipmentCounts.value)
    newWT.delete(key)
    newCT.delete(key)
    equipmentWorkTimes.value = newWT
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

    if (todayEquipment.value.length === 0) {
      equipmentWorkTimes.value = new Map()
      equipmentCounts.value = new Map()
      return
    }

    const newWT = new Map<string, number>()
    const newCT = new Map<string, number>()

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

      const selectedSpecs: EquipmentSpecResponse[] = []
      for (const item of items) {
        const spec = allEquipmentSpecs.value.find((s) => s.id === item.equipmentSpecId)
        if (spec) {
          selectedSpecs.push(spec)
          newWT.set(getKey(boxId, spec.id), item.workTime)
          newCT.set(getKey(boxId, spec.id), item.count)
        }
      }

      equipmentBoxes.value.push({
        id: boxId,
        companyId,
        companyName: first.companyDisplayName,
        selectedSpecs,
        isLoading: false,
      })
    }

    // 한 번에 재할당 → 확실한 reactivity 트리거
    equipmentWorkTimes.value = newWT
    equipmentCounts.value = newCT
  }

  // --- 박스 관리 ---
  function addEmptyBox() {
    equipmentBoxes.value.push({
      id: `ebox-${++boxIdCounter}`,
      companyId: null,
      companyName: '',
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
    const newWT = new Map(equipmentWorkTimes.value)
    const newCT = new Map(equipmentCounts.value)
    for (const spec of box.selectedSpecs) {
      newWT.delete(getKey(boxId, spec.id))
      newCT.delete(getKey(boxId, spec.id))
    }
    equipmentWorkTimes.value = newWT
    equipmentCounts.value = newCT

    box.companyId = company.companyId
    box.companyName = company.companyDisplayName
    box.selectedSpecs = []
  }

  function removeEquipmentBox(boxId: string) {
    const box = equipmentBoxes.value.find((b) => b.id === boxId)
    if (box) {
      const newWT = new Map(equipmentWorkTimes.value)
      const newCT = new Map(equipmentCounts.value)
      for (const spec of box.selectedSpecs) {
        newWT.delete(getKey(boxId, spec.id))
        newCT.delete(getKey(boxId, spec.id))
      }
      equipmentWorkTimes.value = newWT
      equipmentCounts.value = newCT
    }
    equipmentBoxes.value = equipmentBoxes.value.filter((b) => b.id !== boxId)
  }

  // --- 제출 ---
  async function submitEquipmentDeployment() {
    const validBoxes = equipmentBoxes.value.filter((box) => box.companyId)

    if (validBoxes.length === 0) {
      alert('제출할 출역장비가 없습니다.')
      return
    }

    const entries: EquipmentDeploymentEntry[] = []

    for (const box of validBoxes) {
      if (!box.companyId) continue

      for (const spec of box.selectedSpecs) {
        const key = getKey(box.id, spec.id)
        const count = equipmentCounts.value.get(key) ?? 0
        const workTime = equipmentWorkTimes.value.get(key) ?? 0
        if (count > 0 && workTime > 0) {
          entries.push({
            equipmentSpecId: spec.id,
            count,
            workTime,
            companyId: box.companyId,
          })
        }
      }
    }

    if (entries.length === 0) {
      alert('입력된 장비가 없습니다. 대수와 시간을 모두 입력해주세요.')
      return
    }

    try {
      isSubmittingEquipment.value = true

      await equipmentApi.createEquipmentDeployment({
        date: selectedDate.value,
        entries,
      })

      analyticsClient.trackAction('material_equipment', 'save_equipment', 'success')
      alert('출역장비가 저장되었습니다.')
      await loadTodayEquipment()
    } catch (error: unknown) {
      console.error('출역장비 저장 실패:', error)
      analyticsClient.trackAction('material_equipment', 'save_equipment', 'fail')
      alert(getErrorMessage(error))
    } finally {
      isSubmittingEquipment.value = false
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
    equipmentWorkTimes,
    equipmentCounts,

    init,
    addEmptyBox,
    selectCompany,
    removeEquipmentBox,
    addSpecToBox,
    removeSpecFromBox,
    getWorkTime,
    setWorkTime,
    incrementWorkTime,
    decrementWorkTime,
    setFullDay,
    setHalfDay,
    getCount,
    setCount,
    incrementCount,
    decrementCount,
    submitEquipmentDeployment,
  }
}
