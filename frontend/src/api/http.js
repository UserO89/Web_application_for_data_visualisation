import axios from 'axios'

const baseURL = import.meta.env.DEV ? '/api/v1' : (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1')

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
  const url = import.meta.env.DEV
    ? '/sanctum/csrf-cookie'
    : (baseURL.replace(/\/api\/v1\/?$/, '') + '/sanctum/csrf-cookie')
  await axios.get(url, { withCredentials: true })
}
