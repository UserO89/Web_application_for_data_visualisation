const isRefLike = (value) =>
  Boolean(value) &&
  (typeof value === 'object' || typeof value === 'function') &&
  'value' in value

export const resolveRefValue = (value) => {
  if (typeof value === 'function') return value()
  if (isRefLike(value)) return value.value
  return value
}

export const resolveProjectId = (projectId) => {
  const resolved = resolveRefValue(projectId)
  if (resolved === null || resolved === undefined) return ''
  return String(resolved)
}
