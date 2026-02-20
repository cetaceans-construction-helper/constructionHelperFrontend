import apiClient from './apiClient'

// 기존 entry 타입 (내부 사용)
export interface AttendanceEntry {
  laborTypeId: number
  companyId: string
  count: number
}

// 조회 응답 타입
export interface AttendanceByDateItem {
  laborTypeId: number
  laborTypeName: string
  workTypeId: number
  workTypeName: string
  companyId: string
  companyName: string
  companyDisplayName: string
  count: number
}

// 제출 요청 타입 (company 기준 그룹핑)
export interface CompanyAttendanceEntry {
  companyId: string
  attendances: { laborTypeId: number; count: number }[]
}

export interface UpdateAttendancePayload {
  date: string
  entries: CompanyAttendanceEntry[]
}

// 출역 가능 업체 (원청 + 협력업체)
export interface Contractor {
  companyId: string
  companyName: string
  companyDisplayName: string
  roleName: string
  workTypeId: number | null
  workTypeName: string | null
  eligible: boolean
}

export const attendanceApi = {
  // 날짜별 출역 가능 업체 목록 조회
  async getContractorList(date: string): Promise<Contractor[]> {
    const { data } = await apiClient.get<Contractor[]>('/attendance/getContractorList', {
      params: { date },
    })
    return data
  },

  // 날짜별 출역인원 조회
  async getAttendanceListByDate(date: string): Promise<AttendanceByDateItem[]> {
    const response = await apiClient.get<AttendanceByDateItem[]>(
      '/attendance/getAttendanceListByDate',
      { params: { date } },
    )
    return response.data
  },

  // 출역인원 저장
  async updateAttendance(payload: UpdateAttendancePayload): Promise<void> {
    await apiClient.post('/attendance/updateAttendance', payload)
  },
}
