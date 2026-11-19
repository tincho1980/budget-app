import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

function isCloudflareApiUrl(value: string): boolean {
  if (!URL.canParse(value)) return false

  const url = new URL(value)
  return url.protocol === 'https:'
    && /^\/api\/v1\/?$/.test(url.pathname)
    && !url.username && !url.password && !url.search && !url.hash
}

export default defineConfig(({ mode }) => {
  if (mode === 'cloudflare') {
    const { VITE_API_URL = '' } = loadEnv(mode, process.cwd(), 'VITE_')
    if (!isCloudflareApiUrl(VITE_API_URL)) {
      throw new Error('Configurá VITE_API_URL con la URL HTTPS de Rails terminada en /api/v1 para compilar para Cloudflare.')
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api/v1': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      },
    },
    test: {
      environment: 'jsdom',
    },
  }
})
