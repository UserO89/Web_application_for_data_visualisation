import axios from 'axios'

function resolveApiBaseUrl() {
  const value = import.meta.env.VITE_API_BASE_URL

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      '[config] Missing VITE_API_BASE_URL. Set it in frontend/.env.development and frontend/.env.production.'
    )
  }

  return value.trim().replace(/\/+$/, '')
}

function resolveCsrfUrl(apiBaseUrl) {
  return apiBaseUrl.replace(/\/api\/v1$/, '') + '/sanctum/csrf-cookie'
}

const baseURL = resolveApiBaseUrl()
const csrfUrl = resolveCsrfUrl(baseURL)

export const http = axios.create({
  baseURL,
  withCredentials: true,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

export async function csrf() {
  await axios.get(csrfUrl, { withCredentials: true })
}
