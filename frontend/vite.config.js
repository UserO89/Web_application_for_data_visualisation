import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isDevelopment = mode === 'development'
  const backendUrlRaw = env.VITE_BACKEND_URL
  const backendUrl = typeof backendUrlRaw === 'string' ? backendUrlRaw.trim().replace(/\/+$/, '') : ''

  if (isDevelopment && !backendUrl) {
    throw new Error('[config] Missing VITE_BACKEND_URL. Set it in frontend/.env.development for local dev proxying.')
  }

  return {
    plugins: [vue()],
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['tests/**/*.spec.js'],
    },
    server: isDevelopment
      ? {
          port: 5173,
          proxy: {
            '/api': {
              target: backendUrl,
              changeOrigin: true,
            },
            '/sanctum': {
              target: backendUrl,
              changeOrigin: true,
            },
          },
        }
      : undefined,
  }
})
