import type { HomepageCredentials } from '@/features/project-admin/homepage-setting/public'
import { HOMEPAGE_CREDENTIALS_KEY } from '@/features/project-admin/homepage-setting/public'
import type { WeatherByDateResponse } from '@/shared/network-core/contracts/calendar'
import type { DeliveryQuantityByDate } from '@/features/material/public'
import type {
  ActualWorkGroup,
  AttendanceGroup,
  EquipmentGroup,
} from '@/features/dashboard/model/dashboard-types'
import type { CreateDailyReportInWebPayload } from '@/features/dashboard/model/homepage-daily-report-types'
import { homepageApi } from '@/features/dashboard/infra/homepage-api'
import {
  formatWorksByType,
  formatMaterials,
  formatEquipment,
  formatManpower,
} from '@/features/dashboard/use-cases/format-homepage-daily-report'
import { importPublicKey, rsaEncrypt } from '@/shared/utils/rsa-encrypt'

interface CreateHomepageDailyReportParams {
  todayDayName: string
  todayWeather: WeatherByDateResponse | null
  todayWorksByType: Map<number, ActualWorkGroup>
  tomorrowWorksByType: Map<number, ActualWorkGroup>
  deliveryByWorkType: Map<string, DeliveryQuantityByDate[]>
  equipmentByGroup: EquipmentGroup[]
  attendanceByGroup: AttendanceGroup[]
}

function mapWeather(weather: string): string {
  switch (weather) {
    case '맑음':
      return '맑음'
    case '구름많음':
    case '흐림':
      return '흐림'
    case '비':
    case '소나기':
      return '비'
    case '눈':
      return '눈'
    case '비/눈':
      return '눈'
    default:
      return weather
  }
}

export async function createHomepageDailyReport(params: CreateHomepageDailyReportParams): Promise<void> {
  const raw = localStorage.getItem(HOMEPAGE_CREDENTIALS_KEY)
  if (!raw) {
    throw new Error('홈페이지 로그인 정보가 설정되지 않았습니다. 관리자 > 홈페이지 입력정보에서 설정해주세요.')
  }

  const creds: HomepageCredentials = JSON.parse(raw)
  if (!creds.id || !creds.password || !creds.url) {
    throw new Error('홈페이지 로그인 정보가 불완전합니다. 관리자 > 홈페이지 입력정보에서 확인해주세요.')
  }

  const publicKeyPem = await homepageApi.getPublicKey()
  const cryptoKey = await importPublicKey(publicKeyPem)

  const payload: CreateDailyReportInWebPayload = {
    navigateTo: creds.url,
    id: await rsaEncrypt(cryptoKey, creds.id),
    pw: await rsaEncrypt(cryptoKey, creds.password),
    weather: mapWeather(params.todayWeather?.weather ?? ''),
    temperature: params.todayWeather
      ? `${params.todayWeather.minTemperature} ~ ${params.todayWeather.maxTemperature}`
      : '',
    todayWork: `${params.todayDayName}요일\n\n${formatWorksByType(params.todayWorksByType)}`,
    tomorrowWork: formatWorksByType(params.tomorrowWorksByType),
    materials: formatMaterials(params.deliveryByWorkType),
    equipment: formatEquipment(params.equipmentByGroup),
    manpower: formatManpower(params.attendanceByGroup),
    safetyCheck: creds.safetyCheck ?? '',
  }

  await homepageApi.createDailyReportInWeb(payload)
}
