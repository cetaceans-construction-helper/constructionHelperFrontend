import { defineStore } from 'pinia'

export interface ChartConfig {
  pixelPerDay: number
  nodeHeight: number
  nodePaddingX: number
  nodePaddingY: number
}

export const CHART_CONFIG: ChartConfig = {
  pixelPerDay: 40,
  nodeHeight: 50,
  nodePaddingX: 10,
  nodePaddingY: 10,
}

export const useChartConfigStore = defineStore('chartConfig', () => {
  const config = CHART_CONFIG

  return { config }
})
