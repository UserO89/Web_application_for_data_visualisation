export const readJsonStorage = (key, fallback = null) => {
  try {
    if (typeof localStorage === 'undefined') return fallback
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch (_) {
    return fallback
  }
}

export const writeJsonStorage = (key, value) => {
  try {
    if (typeof localStorage === 'undefined') return false
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (_) {
    return false
  }
}

export const removeStorageItem = (key) => {
  try {
    if (typeof localStorage === 'undefined') return false
    localStorage.removeItem(key)
    return true
  } catch (_) {
    return false
  }
}
