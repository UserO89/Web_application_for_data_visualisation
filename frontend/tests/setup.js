import { beforeEach } from 'vitest'
import { setLocale } from '../src/i18n'

const ensureEnglishNavigator = () => {
  if (typeof navigator === 'undefined') return

  Object.defineProperty(navigator, 'language', {
    configurable: true,
    value: 'en-US',
  })
  Object.defineProperty(navigator, 'languages', {
    configurable: true,
    value: ['en-US', 'en'],
  })
}

const clearBrowserStorage = () => {
  try {
    globalThis.localStorage?.clear()
  } catch {}

  try {
    globalThis.sessionStorage?.clear()
  } catch {}
}

const ensureMatchMedia = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia === 'function') return

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

ensureMatchMedia()
ensureEnglishNavigator()
clearBrowserStorage()
setLocale('en')

beforeEach(() => {
  ensureMatchMedia()
  ensureEnglishNavigator()
  clearBrowserStorage()
  setLocale('en')
})
