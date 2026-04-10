import { readJsonStorage, writeJsonStorage } from '../utils/project/storage'

export const DEFAULT_LOCALE = 'en'
export const FALLBACK_LOCALE = 'en'
export const LOCALE_STORAGE_KEY = 'dataviz.locale'

export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English', nativeLabel: 'English', htmlLang: 'en', dir: 'ltr' },
  { code: 'sk', label: 'Slovak', nativeLabel: 'Slovencina', htmlLang: 'sk', dir: 'ltr' },
  { code: 'ru', label: 'Russian', nativeLabel: 'Russkiy', htmlLang: 'ru', dir: 'ltr' },
  { code: 'uk', label: 'Ukrainian', nativeLabel: 'Ukrayinska', htmlLang: 'uk', dir: 'ltr' },
]

const SUPPORTED_LOCALE_MAP = Object.fromEntries(
  SUPPORTED_LOCALES.map((locale) => [locale.code, locale])
)

function normalizeCandidate(candidate) {
  return String(candidate || '').trim().toLowerCase()
}

function findSupportedLocale(candidate) {
  const normalized = normalizeCandidate(candidate)
  if (!normalized) return null

  if (SUPPORTED_LOCALE_MAP[normalized]) {
    return normalized
  }

  const [baseLocale] = normalized.split('-')
  if (SUPPORTED_LOCALE_MAP[baseLocale]) {
    return baseLocale
  }

  return null
}

export function resolveLocale(candidate) {
  return findSupportedLocale(candidate) || DEFAULT_LOCALE
}

export function resolveInitialLocale() {
  const storedLocale = findSupportedLocale(readJsonStorage(LOCALE_STORAGE_KEY, null))
  if (storedLocale) {
    return storedLocale
  }

  if (typeof navigator !== 'undefined') {
    const browserLocales = Array.isArray(navigator.languages)
      ? navigator.languages
      : [navigator.language]

    for (const localeCandidate of browserLocales) {
      const resolved = findSupportedLocale(localeCandidate)
      if (resolved) {
        return resolved
      }
    }
  }

  return DEFAULT_LOCALE
}

export function getLocaleDefinition(candidate) {
  return SUPPORTED_LOCALE_MAP[resolveLocale(candidate)]
}

export function persistLocale(candidate) {
  const locale = resolveLocale(candidate)
  writeJsonStorage(LOCALE_STORAGE_KEY, locale)
  return locale
}
