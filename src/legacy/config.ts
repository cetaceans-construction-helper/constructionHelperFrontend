type Env = 'development' | 'production'

const env = (import.meta.env.MODE || 'development') as Env

const apiBaseUrls: Record<Env, string> = {
  development: 'https://api.conhelp.kr/api',
  production: 'https://api.conhelp.kr/api',
}

export const appConfig = {
  apiBaseUrl: apiBaseUrls[env],

  chart: {
    pixelPerDay: 40,
    nodeHeight: 50,
    nodePaddingX: 10,
    nodePaddingY: 10,
  },

  work: {
    defaultLeadTime: 3,
  },
} as const
