import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

const srcRoot = fileURLToPath(new URL('./src', import.meta.url))
const legacyScopes = [
  'pages',
  'api',
  'components',
  'composables',
  'stores',
  'types',
  'lib',
  'utils',
] as const

const isFile = (filePath: string): boolean => {
  if (!existsSync(filePath)) return false
  try {
    return statSync(filePath).isFile()
  } catch {
    return false
  }
}

const resolveLegacyFile = (basePath: string): string | null => {
  const suffixes = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.json']
  for (const suffix of suffixes) {
    const candidate = `${basePath}${suffix}`
    if (isFile(candidate)) return candidate
  }

  const indexNames = [
    'index.ts',
    'index.tsx',
    'index.js',
    'index.jsx',
    'index.mjs',
    'index.cjs',
    'index.vue',
    'index.json',
  ]
  for (const indexName of indexNames) {
    const candidate = join(basePath, indexName)
    if (isFile(candidate)) return candidate
  }

  return null
}

const legacyCompatPlugin = {
  name: 'legacy-compat-resolver',
  enforce: 'pre' as const,
  resolveId(source: string) {
    const tryResolve = (scope: (typeof legacyScopes)[number], subPath: string) => {
      const normalizedSubPath = subPath.replace(/^\/+/, '')
      const legacyBase = join(srcRoot, 'legacy', scope, normalizedSubPath)
      return resolveLegacyFile(legacyBase)
    }

    if (source.startsWith('@/')) {
      const scope = legacyScopes.find(
        (item) => source === `@/${item}` || source.startsWith(`@/${item}/`),
      )
      if (!scope) return null
      const subPath = source.slice(`@/${scope}`.length)
      return tryResolve(scope, subPath)
    }

    if (source.startsWith('/src/')) {
      const scope = legacyScopes.find(
        (item) => source === `/src/${item}` || source.startsWith(`/src/${item}/`),
      )
      if (!scope) return null
      const subPath = source.slice(`/src/${scope}`.length)
      return tryResolve(scope, subPath)
    }

    if (source.startsWith(`${srcRoot}/`)) {
      const scope = legacyScopes.find(
        (item) => source === `${srcRoot}/${item}` || source.startsWith(`${srcRoot}/${item}/`),
      )
      if (!scope) return null
      const subPath = source.slice(`${srcRoot}/${scope}`.length)
      return tryResolve(scope, subPath)
    }

    return null
  },
}

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    legacyCompatPlugin,
    vue(),
    vueDevTools({
      launchEditor: 'code',
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': srcRoot,
    },
  },
  server: {
    allowedHosts: ['conhelp.kr', 'www.conhelp.kr', 'localhost'],
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
