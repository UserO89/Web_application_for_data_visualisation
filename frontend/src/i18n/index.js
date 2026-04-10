import { createI18n } from 'vue-i18n'
import {
  FALLBACK_LOCALE,
  getLocaleDefinition,
  persistLocale,
  resolveInitialLocale,
  resolveLocale,
  SUPPORTED_LOCALES,
} from './config'

const i18n = createI18n({
  legacy: false,
  locale: resolveInitialLocale(),
  fallbackLocale: FALLBACK_LOCALE,
  globalInjection: true,
  messages: {},
})

function syncDocumentLanguage(localeCode) {
  if (typeof document === 'undefined') return

  const locale = getLocaleDefinition(localeCode)
  document.documentElement.lang = locale?.htmlLang || localeCode
  document.documentElement.dir = locale?.dir || 'ltr'
}

export function setLocale(candidate) {
  const locale = resolveLocale(candidate)
  i18n.global.locale.value = locale
  persistLocale(locale)
  syncDocumentLanguage(locale)
  return locale
}

export function getLocale() {
  return resolveLocale(i18n.global.locale.value)
}

syncDocumentLanguage(i18n.global.locale.value)

export { SUPPORTED_LOCALES }
export default i18n
