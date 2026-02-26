import { ref, watch } from 'vue'
import { referenceApi, type LaborTypeResponse } from '@/api/reference'
import {
  attendanceApi,
  type AttendanceByDateItem,
  type CompanyAttendanceEntry,
  type Contractor,
} from '@/api/attendance'
import { analyticsClient } from '@/lib/analytics/analyticsClient'

export interface WorkTypeBox {
  id: string
  companyId: string | null
  companyName: string
  workTypeId: number | null
  workTypeName: string
  laborTypes: LaborTypeResponse[]
  isLoading: boolean
}

interface ApiError {
  response?: { data?: { message?: string } }
  message?: string
}

function getTodayString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getErrorMessage(error: unknown): string {
  const err = error as ApiError
  return err.response?.data?.message || err.message || '알 수 없는 오류가 발생했습니다.'
}

let boxIdCounter = 0

export function useAttendance() {
  // 상태
  const selectedDate = ref<string>(getTodayString())
  const isSubmitting = ref(false)

  // 오늘 출역인원 (서버에서 조회)
  const todayAttendance = ref<AttendanceByDateItem[]>([])
  const isLoadingToday = ref(false)

  // 업체 목록 (원청 + 협력업체)
  const contractors = ref<Contractor[]>([])

  // 추가된 공종 박스 목록
  const workTypeBoxes = ref<WorkTypeBox[]>([])

  // 인원 수 관리 (Map<boxId-laborTypeId, count>)
  const laborCounts = ref<Map<string, number>>(new Map())

  // 업체 목록 로드
  async function loadContractors() {
    try {
      contractors.value = await attendanceApi.getContractorList(selectedDate.value)
    } catch (error: unknown) {
      console.error('업체 목록 로드 실패:', error)
      alert(getErrorMessage(error))
    }
  }

  // 선택된 날짜의 출역인원 조회
  async function loadTodayAttendance() {
    try {
      isLoadingToday.value = true
      todayAttendance.value = await attendanceApi.getAttendanceListByDate(selectedDate.value)
    } catch (error: unknown) {
      console.error('출역인원 조회 실패:', error)
      // 조회 실패 시 빈 배열로 설정 (에러 알림은 생략 - 데이터가 없을 수 있음)
      todayAttendance.value = []
    } finally {
      isLoadingToday.value = false
    }
    // 조회된 데이터로 입력 카드 자동 생성
    await populateBoxesFromAttendance()
  }

  // 조회된 출역인원 데이터로 입력 박스 자동 생성
  async function populateBoxesFromAttendance() {
    workTypeBoxes.value = []
    laborCounts.value.clear()

    if (todayAttendance.value.length === 0) return

    // companyId 기준으로 그룹핑
    const companyGroups = new Map<string, AttendanceByDateItem[]>()
    for (const item of todayAttendance.value) {
      if (!companyGroups.has(item.companyId)) {
        companyGroups.set(item.companyId, [])
      }
      companyGroups.get(item.companyId)!.push(item)
    }

    // 각 업체별 박스 생성 + 직종 목록 로드
    const loadPromises: Promise<void>[] = []

    for (const [companyId, items] of companyGroups) {
      const first = items[0]
      if (!first) continue
      const boxId = `box-${++boxIdCounter}`

      workTypeBoxes.value.push({
        id: boxId,
        companyId,
        companyName: first.companyDisplayName,
        workTypeId: first.workTypeId,
        workTypeName: first.workTypeName,
        laborTypes: [],
        isLoading: true,
      })

      const loadPromise = referenceApi
        .getLaborTypeListByWorkType(first.workTypeId)
        .then((laborTypes) => {
          // reactive proxy를 통해 접근해야 Vue가 변경을 감지함
          const box = workTypeBoxes.value.find((b) => b.id === boxId)
          if (!box) return
          box.laborTypes = laborTypes
          for (const lt of laborTypes) {
            const existing = items.find((item) => item.laborTypeId === lt.id)
            laborCounts.value.set(`${boxId}-${lt.id}`, existing ? existing.count : 0)
          }
        })
        .catch((error: unknown) => {
          console.error(`직종 목록 로드 실패 (${first.companyDisplayName}):`, error)
        })
        .finally(() => {
          const box = workTypeBoxes.value.find((b) => b.id === boxId)
          if (box) box.isLoading = false
        })

      loadPromises.push(loadPromise)
    }

    await Promise.all(loadPromises)

    // Map 재할당으로 reactivity 강제 트리거
    laborCounts.value = new Map(laborCounts.value)
  }

  // 날짜 변경 시 자동으로 업체 목록 + 출역인원 조회
  watch(selectedDate, () => {
    loadContractors()
    loadTodayAttendance()
  })

  // 빈 박스 추가
  function addEmptyBox() {
    const newBox: WorkTypeBox = {
      id: `box-${++boxIdCounter}`,
      companyId: null,
      companyName: '',
      workTypeId: null,
      workTypeName: '',
      laborTypes: [],
      isLoading: false,
    }
    workTypeBoxes.value.push(newBox)
  }

  // 협력업체 선택 시 laborType 로드
  async function selectCompany(boxId: string, companyId: string) {
    const box = workTypeBoxes.value.find((b) => b.id === boxId)
    if (!box) return

    const company = contractors.value.find((c) => c.companyId === companyId)
    if (!company) return

    // 이미 같은 업체가 추가되어 있는지 확인
    const exists = workTypeBoxes.value.some(
      (b) => b.id !== boxId && b.companyId === companyId,
    )
    if (exists) {
      alert('이미 추가된 업체입니다.')
      return
    }

    // 업체에 workTypeId가 없는 경우
    if (!company.workTypeId) {
      alert('해당 업체에 등록된 공종이 없습니다.')
      return
    }

    // 기존 laborCounts 정리
    if (box.laborTypes.length > 0) {
      box.laborTypes.forEach((lt) => {
        laborCounts.value.delete(`${boxId}-${lt.id}`)
      })
    }

    box.companyId = company.companyId
    box.companyName = company.companyDisplayName
    box.workTypeId = company.workTypeId
    box.workTypeName = company.workTypeName || ''
    box.isLoading = true

    try {
      const laborTypes = await referenceApi.getLaborTypeListByWorkType(company.workTypeId)
      box.laborTypes = laborTypes

      // 초기 인원 수 설정
      laborTypes.forEach((lt) => {
        laborCounts.value.set(`${boxId}-${lt.id}`, 0)
      })
    } catch (error: unknown) {
      console.error('직종 목록 로드 실패:', error)
      alert(getErrorMessage(error))
      // 실패 시 초기화
      box.companyId = null
      box.companyName = ''
      box.workTypeId = null
      box.workTypeName = ''
    } finally {
      box.isLoading = false
    }
  }

  // 박스 삭제
  function removeWorkTypeBox(boxId: string) {
    const box = workTypeBoxes.value.find((b) => b.id === boxId)
    if (box) {
      box.laborTypes.forEach((lt) => {
        laborCounts.value.delete(`${boxId}-${lt.id}`)
      })
    }
    workTypeBoxes.value = workTypeBoxes.value.filter((b) => b.id !== boxId)
  }

  // 인원 수 키 생성
  function getCountKey(boxId: string, laborTypeId: number): string {
    return `${boxId}-${laborTypeId}`
  }

  // 인원 수 가져오기
  function getCount(boxId: string, laborTypeId: number): number {
    return laborCounts.value.get(getCountKey(boxId, laborTypeId)) || 0
  }

  // 인원 수 설정
  function setCount(boxId: string, laborTypeId: number, count: number) {
    laborCounts.value.set(getCountKey(boxId, laborTypeId), Math.max(0, count))
  }

  // 인원 증가
  function incrementCount(boxId: string, laborTypeId: number) {
    const current = getCount(boxId, laborTypeId)
    setCount(boxId, laborTypeId, current + 1)
  }

  // 인원 감소
  function decrementCount(boxId: string, laborTypeId: number) {
    const current = getCount(boxId, laborTypeId)
    setCount(boxId, laborTypeId, current - 1)
  }

  // 출석 제출
  async function submitAttendance() {
    // 유효한 박스만 필터링 (협력업체가 선택된 박스)
    const validBoxes = workTypeBoxes.value.filter(
      (box) => box.companyId && box.workTypeId,
    )

    if (validBoxes.length === 0) {
      alert('제출할 출역인원이 없습니다.')
      return
    }

    // company 기준으로 그룹핑
    const companyMap = new Map<string, { laborTypeId: number; count: number }[]>()

    for (const box of validBoxes) {
      if (!box.companyId) continue

      for (const lt of box.laborTypes) {
        const count = getCount(box.id, lt.id)
        if (count > 0) {
          if (!companyMap.has(box.companyId)) {
            companyMap.set(box.companyId, [])
          }
          companyMap.get(box.companyId)!.push({
            laborTypeId: lt.id,
            count,
          })
        }
      }
    }

    if (companyMap.size === 0) {
      alert('입력된 인원이 없습니다.')
      return
    }

    // CompanyAttendanceEntry 배열로 변환
    const entries: CompanyAttendanceEntry[] = []
    companyMap.forEach((attendances, companyId) => {
      entries.push({ companyId, attendances })
    })

    try {
      isSubmitting.value = true

      await attendanceApi.updateAttendance({
        date: selectedDate.value,
        entries,
      })

      analyticsClient.trackAction('material_attendance', 'save_attendance', 'success')
      alert('출역인원이 저장되었습니다.')

      // 저장 후 출역인원 다시 조회 (입력 카드도 자동 재생성)
      await loadTodayAttendance()
    } catch (error: unknown) {
      console.error('출역인원 저장 실패:', error)
      analyticsClient.trackAction('material_attendance', 'save_attendance', 'fail')
      alert(getErrorMessage(error))
    } finally {
      isSubmitting.value = false
    }
  }

  // 초기 데이터 로드
  async function init() {
    await Promise.all([loadContractors(), loadTodayAttendance()])
  }

  return {
    // 상태
    selectedDate,
    isSubmitting,
    todayAttendance,
    isLoadingToday,
    contractors,
    workTypeBoxes,
    laborCounts,

    // 메서드
    loadContractors,
    loadTodayAttendance,
    addEmptyBox,
    selectCompany,
    removeWorkTypeBox,
    getCount,
    setCount,
    incrementCount,
    decrementCount,
    submitAttendance,
    init,
  }
}
