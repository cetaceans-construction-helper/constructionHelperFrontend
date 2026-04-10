type Env = 'development' | 'production'

const env = (import.meta.env.MODE || 'development') as Env

const apiBaseUrls: Record<Env, string> = {
  development: 'http://localhost:8080/api',
  production: 'https://api.conelp.kr/api',
}

const batApiBaseUrls: Record<Env, string> = {
  development: 'https://bat.conelp.kr',
  production: 'https://bat.conelp.kr',
}

export const appConfig = {
  apiBaseUrl: apiBaseUrls[env],
  batApiBaseUrl: batApiBaseUrls[env],

  chart: {
    pixelPerDay: 60,
    nodeHeight: 50,
    nodePaddingX: 10,
    nodePaddingY: 10,
  },

  work: {
    defaultLeadTime: 3,
  },
} as const
