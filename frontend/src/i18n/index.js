import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import sk from './locales/sk.json'
import ru from './locales/ru.json'
import uk from './locales/uk.json'
import {
  FALLBACK_LOCALE,
  getLocaleDefinition,
  persistLocale,
  resolveInitialLocale,
  resolveLocale,
  SUPPORTED_LOCALES,
} from './config'

const messages = {
  en,
  sk,
  ru,
  uk,
}

const i18n = createI18n({
  legacy: false,
  locale: resolveInitialLocale(),
  fallbackLocale: FALLBACK_LOCALE,
  globalInjection: true,
  messages,
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

export function translate(key, params = {}) {
  return i18n.global.t(key, params)
}

syncDocumentLanguage(i18n.global.locale.value)

export { SUPPORTED_LOCALES }
export default i18n
