export interface ScheduleProcessColorOption {
  id: string
  name: string
  colorHex: string
}

type RgbColor = {
  red: number
  green: number
  blue: number
}

export interface ScheduleProcessToneColors {
  fillColorHex: string
  surfaceColorHex: string
  borderColorHex: string
  textColorHex: string
}

const WHITE_RGB: RgbColor = { red: 255, green: 255, blue: 255 }
const BLACK_RGB: RgbColor = { red: 0, green: 0, blue: 0 }

export const SCHEDULE_PROCESS_COLOR_OPTIONS: ScheduleProcessColorOption[] = [
  { id: 'rose', name: '로즈', colorHex: '#d8a4b2' },
  { id: 'peach', name: '피치', colorHex: '#ddb08f' },
  { id: 'amber', name: '앰버', colorHex: '#d9c08d' },
  { id: 'olive', name: '올리브', colorHex: '#b8ca93' },
  { id: 'sage', name: '세이지', colorHex: '#99c3a5' },
  { id: 'teal', name: '틸', colorHex: '#92c8c1' },
  { id: 'sky', name: '스카이', colorHex: '#9dbde0' },
  { id: 'lavender', name: '라벤더', colorHex: '#b1ace0' },
  { id: 'violet', name: '바이올렛', colorHex: '#c6a8df' },
]

export function normalizeHexColor(colorHex: string | null | undefined): string | null {
  if (!colorHex) return null

  const sanitized = colorHex.trim().replace('#', '')
  if (/^[0-9a-fA-F]{3}$/.test(sanitized)) {
    return `#${sanitized.split('').map((character) => `${character}${character}`).join('').toLowerCase()}`
  }

  return /^[0-9a-fA-F]{6}$/.test(sanitized) ? `#${sanitized.toLowerCase()}` : null
}

function hexToRgb(colorHex: string): RgbColor {
  const normalizedHex = normalizeHexColor(colorHex) ?? '#94a3b8'
  return {
    red: Number.parseInt(normalizedHex.slice(1, 3), 16),
    green: Number.parseInt(normalizedHex.slice(3, 5), 16),
    blue: Number.parseInt(normalizedHex.slice(5, 7), 16),
  }
}

function rgbToHex(color: RgbColor): string {
  return `#${[color.red, color.green, color.blue]
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0'))
    .join('')}`
}

function mixColors(source: string, target: RgbColor, amount: number): string {
  const sourceRgb = hexToRgb(source)
  const clampedAmount = Math.max(0, Math.min(1, amount))

  return rgbToHex({
    red: sourceRgb.red + (target.red - sourceRgb.red) * clampedAmount,
    green: sourceRgb.green + (target.green - sourceRgb.green) * clampedAmount,
    blue: sourceRgb.blue + (target.blue - sourceRgb.blue) * clampedAmount,
  })
}

export function tintHexColor(colorHex: string, amount: number): string {
  return mixColors(colorHex, WHITE_RGB, amount)
}

export function shadeHexColor(colorHex: string, amount: number): string {
  return mixColors(colorHex, BLACK_RGB, amount)
}

export function toAlphaColor(colorHex: string, alpha: number): string {
  const normalizedHex = normalizeHexColor(colorHex)
  if (!normalizedHex) return colorHex

  const { red, green, blue } = hexToRgb(normalizedHex)
  return `rgba(${red}, ${green}, ${blue}, ${Math.max(0, Math.min(1, alpha))})`
}

export function getContrastingTextColor(
  backgroundColorHex: string,
  lightColor = '#ffffff',
  darkColor = '#475569',
): string {
  const normalizedHex = normalizeHexColor(backgroundColorHex)
  if (!normalizedHex) return darkColor

  const { red, green, blue } = hexToRgb(normalizedHex)
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255
  return luminance > 0.7 ? darkColor : lightColor
}

export function getAutoProcessBaseColor(index: number): string {
  const paletteIndex = ((index % SCHEDULE_PROCESS_COLOR_OPTIONS.length) + SCHEDULE_PROCESS_COLOR_OPTIONS.length) % SCHEDULE_PROCESS_COLOR_OPTIONS.length
  return SCHEDULE_PROCESS_COLOR_OPTIONS[paletteIndex]!.colorHex
}

export function getProcessToneColors(baseColorHex: string, tone: 'parent' | 'child'): ScheduleProcessToneColors {
  const normalizedBaseColor = normalizeHexColor(baseColorHex) ?? getAutoProcessBaseColor(0)
  const fillColorHex = tone === 'parent'
    ? tintHexColor(normalizedBaseColor, 0.58)
    : tintHexColor(normalizedBaseColor, 0.84)
  const surfaceColorHex = tone === 'parent'
    ? tintHexColor(normalizedBaseColor, 0.97)
    : tintHexColor(normalizedBaseColor, 0.993)
  const borderColorHex = tone === 'parent'
    ? tintHexColor(normalizedBaseColor, 0.2)
    : tintHexColor(normalizedBaseColor, 0.38)

  return {
    fillColorHex,
    surfaceColorHex,
    borderColorHex,
    textColorHex: getContrastingTextColor(fillColorHex),
  }
}
