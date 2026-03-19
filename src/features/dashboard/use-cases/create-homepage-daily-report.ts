import type { HomepageCredentials } from '@/features/project-admin/homepage-setting/public'
import { HOMEPAGE_CREDENTIALS_KEY } from '@/features/project-admin/homepage-setting/public'
import type { WeatherByDateResponse } from '@/shared/network-core/contracts/calendar'
import type { WorkResponse } from '@/shared/network-core/apis/work'
import type { DeliveryQuantityByDate } from '@/features/material/public'
import type { AttendanceGroup, EquipmentGroup } from '@/features/dashboard/model/dashboard-types'
import type { CreateDailyReportInWebPayload } from '@/features/dashboard/model/homepage-daily-report-types'
import { homepageApi } from '@/features/dashboard/infra/homepage-api'
import {
  formatWorksByType,
  formatMaterials,
  formatEquipment,
  formatManpower,
} from '@/features/dashboard/use-cases/format-homepage-daily-report'

interface CreateHomepageDailyReportParams {
  todayDayName: string
  todayWeather: WeatherByDateResponse | null
  todayWorksByType: Map<string, WorkResponse[]>
  tomorrowWorksByType: Map<string, WorkResponse[]>
  simpleTomorrowWorksByType: Map<string, WorkResponse[]>
  deliveryByWorkType: Map<string, DeliveryQuantityByDate[]>
  equipmentByGroup: EquipmentGroup[]
  attendanceByGroup: AttendanceGroup[]
}

async function importPublicKey(pem: string): Promise<CryptoKey> {
  const pemBody = pem.replace(/-----.*-----/g, '').replace(/\s/g, '')
  const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0))
  return crypto.subtle.importKey(
    'spki',
    binaryDer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt'],
  )
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

async function rsaEncrypt(cryptoKey: CryptoKey, text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text)
  const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, cryptoKey, encoded)
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)))
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

  const tomorrowWorks = (creds.tomorrowWorkMode ?? 1) === 1
    ? params.tomorrowWorksByType
    : params.simpleTomorrowWorksByType

  const payload: CreateDailyReportInWebPayload = {
    navigateTo: creds.url,
    weather: mapWeather(params.todayWeather?.weather ?? ''),
    temperature: params.todayWeather
      ? `${params.todayWeather.minTemperature} ~ ${params.todayWeather.maxTemperature}`
      : '',
    todayWork: `${params.todayDayName}요일\n\n${formatWorksByType(params.todayWorksByType)}`,
    tomorrowWork: formatWorksByType(tomorrowWorks),
    materials: formatMaterials(params.deliveryByWorkType),
    equipment: formatEquipment(params.equipmentByGroup),
    manpower: formatManpower(params.attendanceByGroup),
    safetyCheck: creds.safetyCheck ?? '',
    encrypted: {
      id: await rsaEncrypt(cryptoKey, creds.id),
      pw: await rsaEncrypt(cryptoKey, creds.password),
    },
  }

  await homepageApi.createDailyReportInWeb(payload)
}
