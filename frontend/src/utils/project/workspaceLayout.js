export const rectsOverlap = (a, b) =>
  a.x < b.x + b.w &&
  a.x + a.w > b.x &&
  a.y < b.y + b.h &&
  a.y + a.h > b.y

export const hasAnyOverlap = (layouts, ids) => {
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const first = layouts[ids[i]]
      const second = layouts[ids[j]]
      if (first && second && rectsOverlap(first, second)) return true
    }
  }
  return false
}

export const buildPresetLayout = ({ preset, canvasWidth, min, ids }) => {
  const gap = 16
  const preferredChartWidth = 460
  const defaultTableShare = 0.72
  const w = canvasWidth

  const resolveChartWidth = () => {
    const maxBySpace = Math.max(min.chart.w, w - gap - min.table.w)
    return Math.min(preferredChartWidth, maxBySpace)
  }

  const singleColumn = () => {
    let y = 0
    const heights = { table: 420, chart: 420, stats: 300 }
    const out = {}
    ids.forEach((id, index) => {
      out[id] = { x: 0, y, w, h: heights[id], z: index + 1 }
      y += heights[id] + gap
    })
    return out
  }

  if (w < 980) return singleColumn()

  if (preset === 'wide-stack') {
    return {
      table: { x: 0, y: 0, w, h: 380, z: 1 },
      chart: { x: 0, y: 396, w, h: 360, z: 2 },
      stats: { x: 0, y: 772, w, h: 260, z: 3 },
    }
  }

  if (preset === 'analysis-focus') {
    const right = Math.floor(w * 0.38)
    const left = w - right - gap
    return {
      chart: { x: 0, y: 0, w: left, h: 460, z: 1 },
      table: { x: 0, y: 476, w: left, h: 360, z: 2 },
      stats: { x: left + gap, y: 0, w: right, h: 836, z: 3 },
    }
  }

  if (preset === 'quad') {
    const chartWidth = resolveChartWidth()
    const tableWidth = Math.max(min.table.w, w - gap - chartWidth)
    const topHeight = 430
    const lowerY = topHeight + gap
    return {
      table: { x: 0, y: 0, w: tableWidth, h: topHeight, z: 1 },
      chart: { x: tableWidth + gap, y: 0, w: chartWidth, h: topHeight, z: 2 },
      stats: { x: 0, y: lowerY, w, h: 500, z: 3 },
    }
  }

  const availableWidth = w - gap
  let left = Math.round(availableWidth * defaultTableShare)
  let right = availableWidth - left

  left = Math.max(min.table.w, left)
  right = Math.max(min.chart.w, right)

  const total = left + right + gap
  if (total > w) {
    right = Math.max(min.chart.w, w - gap - left)
    left = Math.max(min.table.w, w - gap - right)
  }

  const topHeight = 430
  const statsY = topHeight + gap
  return {
    table: { x: 0, y: 0, w: left, h: topHeight, z: 1 },
    chart: { x: left + gap, y: 0, w: right, h: topHeight, z: 2 },
    stats: { x: 0, y: statsY, w, h: 1000, z: 3 },
  }
}

export const sanitizeLayouts = ({ layouts, savedWidth, canvasWidth, min, ids }) => {
  if (!layouts || typeof layouts !== 'object') return null
  if (!Array.isArray(ids) || !ids.length) return null
  if (!min || typeof min !== 'object') return null
  if (!Number.isFinite(canvasWidth) || canvasWidth <= 0) return null

  const safeSavedWidth = Number(savedWidth)
  const ratio = Number.isFinite(safeSavedWidth) && safeSavedWidth > 0 ? canvasWidth / safeSavedWidth : 1
  const maxPanelHeight = 2200
  const maxPanelY = 4800
  const out = {}

  for (const [index, id] of ids.entries()) {
    const panel = layouts[id]
    if (!panel || typeof panel !== 'object') return null
    if (!min[id] || typeof min[id] !== 'object') return null

    let x = Number(panel.x) * ratio
    let y = Number(panel.y)
    let w = Number(panel.w) * ratio
    let h = Number(panel.h)
    let z = Number(panel.z)

    if ([x, y, w, h].some((value) => !Number.isFinite(value))) return null

    w = Math.max(min[id].w, w)
    h = Math.max(min[id].h, h)
    h = Math.min(maxPanelHeight, h)
    y = Math.min(maxPanelY, y)

    if (w > canvasWidth) {
      w = canvasWidth
      x = 0
    }

    x = Math.max(0, x)
    y = Math.max(0, y)
    if (x + w > canvasWidth) x = Math.max(0, canvasWidth - w)

    out[id] = {
      x: Math.round(x),
      y: Math.round(y),
      w: Math.round(w),
      h: Math.round(h),
      z: Number.isFinite(z) && z > 0 ? Math.round(z) : index + 1,
    }
  }

  if (hasAnyOverlap(out, ids)) return null
  return out
}

export const alignPanelsToRightEdge = ({ layouts, canvasWidth, min, ids }) => {
  if (!layouts || typeof layouts !== 'object') return layouts

  const out = {}
  ids.forEach((id) => {
    out[id] = layouts[id] ? { ...layouts[id] } : null
  })

  ;['chart', 'stats'].forEach((id) => {
    const current = out[id]
    if (!current) return

    const candidate = {
      ...current,
      w: Math.round(Math.max(min[id].w, canvasWidth - current.x)),
    }

    if (Math.abs((candidate.x + candidate.w) - (current.x + current.w)) < 2) return

    const hasCollision = ids.some((otherId) => {
      if (otherId === id) return false
      const other = out[otherId]
      return other ? rectsOverlap(candidate, other) : false
    })

    if (!hasCollision) {
      out[id] = candidate
    }
  })

  return out
}
