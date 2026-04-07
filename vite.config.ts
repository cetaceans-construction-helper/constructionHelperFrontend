import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

const srcRoot = fileURLToPath(new URL('./src', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
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
    allowedHosts: ['conhelp.kr', 'www.conhelp.kr', 'dev.conhelp.kr', 'localhost'],
    proxy: {
      '/api': {
        target: 'https://dev.conhelp.kr',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
