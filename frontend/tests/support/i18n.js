import i18n, { setLocale } from '../../src/i18n'

export function withI18n(options = {}) {
  setLocale('en')

  const global = options.global || {}
  const plugins = Array.isArray(global.plugins) ? global.plugins : []

  return {
    ...options,
    global: {
      ...global,
      plugins: [...plugins, i18n],
    },
  }
}
