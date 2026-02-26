/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_GA_MEASUREMENT_ID?: string
  readonly VITE_GA_API_ERROR_SAMPLE_RATE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  dataLayer: unknown[]
  gtag?: (...args: unknown[]) => void
}
