import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

function resolveManualChunk(id) {
  const normalizedId = id.replace(/\\/g, '/')

  if (normalizedId.includes('/node_modules/zrender/')) {
    return 'vendor-zrender'
  }

  if (normalizedId.includes('/node_modules/echarts/charts/')) {
    return 'vendor-echarts-charts'
  }

  if (normalizedId.includes('/node_modules/echarts/components/')) {
    return 'vendor-echarts-components'
  }

  if (normalizedId.includes('/node_modules/echarts/renderers/')) {
    return 'vendor-echarts-renderers'
  }

  if (normalizedId.includes('/node_modules/echarts/features/')) {
    return 'vendor-echarts-features'
  }

  if (normalizedId.includes('/node_modules/echarts/core/')) {
    return 'vendor-echarts-core'
  }

  if (normalizedId.includes('/node_modules/echarts/')) {
    return 'vendor-echarts'
  }

  if (normalizedId.includes('/node_modules/tabulator-tables/')) {
    return 'vendor-tabulator'
  }

  if (
    normalizedId.includes('/node_modules/vue/') ||
    normalizedId.includes('/node_modules/pinia/') ||
    normalizedId.includes('/node_modules/vue-router/') ||
    normalizedId.includes('/node_modules/vue-i18n/')
  ) {
    return 'vendor-vue'
  }

  if (normalizedId.includes('/node_modules/axios/')) {
    return 'vendor-http'
  }

  if (
    normalizedId.includes('/src/charts/') ||
    normalizedId.includes('/src/components/charts/') ||
    normalizedId.includes('/src/components/project/') ||
    normalizedId.includes('/src/composables/project/') ||
    normalizedId.includes('/src/utils/statistics/')
  ) {
    return 'project-workspace'
  }

  return undefined
}

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
    build: {
      rollupOptions: {
        output: {
          manualChunks: resolveManualChunk,
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['tests/**/*.spec.js'],
      exclude: ['tests/system/**'],
      coverage: {
        exclude: ['src/**/index.js'],
      },
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
