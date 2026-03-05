import { defineStore } from 'pinia'
import { appConfig } from '@/config'

export interface ChartConfig {
  pixelPerDay: number
  nodeHeight: number
  nodePaddingX: number
  nodePaddingY: number
}

export const CHART_CONFIG: ChartConfig = appConfig.chart

export const useChartConfigStore = defineStore('chartConfig', () => {
  const config = CHART_CONFIG

  return { config }
})
