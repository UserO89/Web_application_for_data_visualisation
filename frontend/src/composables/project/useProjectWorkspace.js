import { computed, nextTick, ref } from 'vue'
import {
  alignPanelsToRightEdge as alignWorkspacePanelsToRightEdge,
  buildPresetLayout,
  hasAnyOverlap,
  readJsonStorage,
  rectsOverlap,
  resolveProjectId,
  sanitizeLayouts,
  writeJsonStorage,
} from '../../utils/project'

const IDS = ['table', 'chart', 'stats']
const STORAGE_PREFIX = 'dataviz.workspace.layout.v5.'
const TABLE_TO_CHART_WIDTH_RATIO = 1.18
const PANEL_GAP = 16
const MIN = {
  table: { w: 420, h: 280 },
  chart: { w: 360, h: 320 },
  stats: { w: 300, h: 220 },
}

export const useProjectWorkspace = ({
  project,
  projectId,
  workspaceRef,
} = {}) => {
  const viewMode = ref('workspace')
  const panelLayouts = ref({})
  const zCounter = ref(1)
  const interaction = ref(null)
  const resizeTick = ref(0)
  const initializedForProjectId = ref(null)
  const activePreset = ref('default')

  const resizeDirs = ['n', 'e', 's', 'w']
  const panelConfig = {
    table: { title: 'Data Table', subtitle: 'Editable' },
    chart: { title: 'Visualization', subtitle: 'Chart + controls' },
    stats: { title: 'Statistics', subtitle: 'Columns / Calculate / Visualization' },
  }

  const canvasW = () => Math.max(320, workspaceRef.value?.clientWidth || 1120)
  const key = () => `${STORAGE_PREFIX}${resolveProjectId(projectId)}`

  const visiblePanelIds = computed(() => {
    if (viewMode.value === 'table') return ['table']
    if (viewMode.value === 'visualization') return ['chart']
    if (viewMode.value === 'statistics') return ['stats']
    return IDS
  })

  const buildFocusLayouts = (mode) => {
    void resizeTick.value
    const width = canvasW()
    if (mode === 'table') {
      return { table: { x: 0, y: 0, w: width, h: 720, z: 1 } }
    }
    if (mode === 'visualization') {
      return { chart: { x: 0, y: 0, w: width, h: 720, z: 1 } }
    }
    if (mode === 'statistics') {
      return { stats: { x: 0, y: 0, w: width, h: 720, z: 1 } }
    }
    return {}
  }

  const focusLayouts = computed(() => buildFocusLayouts(viewMode.value))

  const workspaceHeight = computed(() => {
    const ids = visiblePanelIds.value
    const layouts = viewMode.value === 'workspace' ? panelLayouts.value : focusLayouts.value
    if (!ids.every((id) => layouts[id])) return 760
    return Math.max(760, Math.max(...ids.map((id) => layouts[id].y + layouts[id].h)) + 16)
  })

  const panelStyle = (id) => {
    const layouts = viewMode.value === 'workspace' ? panelLayouts.value : focusLayouts.value
    const panel = layouts[id]
    if (!panel) return {}
    return {
      left: `${panel.x}px`,
      top: `${panel.y}px`,
      width: `${panel.w}px`,
      height: `${panel.h}px`,
      zIndex: panel.z,
    }
  }

  const buildPreset = (preset) =>
    buildPresetLayout({
      preset,
      canvasWidth: canvasW(),
      min: MIN,
      ids: IDS,
    })

  const sanitize = (layouts, savedWidth) =>
    sanitizeLayouts({
      layouts,
      savedWidth,
      canvasWidth: canvasW(),
      min: MIN,
      ids: IDS,
    })

  const alignPanelsToRightEdge = (layouts) =>
    alignWorkspacePanelsToRightEdge({
      layouts,
      canvasWidth: canvasW(),
      min: MIN,
      ids: IDS,
    })

  const centerLayoutsHorizontally = (layouts) => {
    if (!layouts || typeof layouts !== 'object') return layouts

    const panels = IDS.map((id) => layouts[id]).filter(Boolean)
    if (!panels.length) return layouts

    const minX = Math.min(...panels.map((panel) => panel.x))
    const maxX = Math.max(...panels.map((panel) => panel.x + panel.w))
    const usedWidth = maxX - minX
    const width = canvasW()

    if (usedWidth >= width - 2) return layouts

    const targetOffset = Math.round((width - usedWidth) / 2 - minX)
    const minOffset = -minX
    const maxOffset = width - maxX
    const offset = Math.max(minOffset, Math.min(targetOffset, maxOffset))
    if (Math.abs(offset) < 1) return layouts

    const centered = {}
    IDS.forEach((id) => {
      const panel = layouts[id]
      centered[id] = panel ? { ...panel, x: Math.round(panel.x + offset) } : panel
    })
    return centered
  }

  const enforceTopRowRatio = (layouts) => {
    if (!layouts?.table || !layouts?.chart) return layouts

    const width = canvasW()
    const available = Math.max(
      MIN.table.w + MIN.chart.w,
      width - PANEL_GAP
    )

    const table = { ...layouts.table }
    const chart = { ...layouts.chart }
    const ratio = chart.w > 0 ? table.w / chart.w : 0
    if (Number.isFinite(ratio) && ratio >= TABLE_TO_CHART_WIDTH_RATIO) return layouts

    let nextChartWidth = Math.round(available / (TABLE_TO_CHART_WIDTH_RATIO + 1))
    nextChartWidth = Math.max(MIN.chart.w, nextChartWidth)

    let nextTableWidth = available - nextChartWidth
    if (nextTableWidth < MIN.table.w) {
      nextTableWidth = MIN.table.w
      nextChartWidth = Math.max(MIN.chart.w, available - nextTableWidth)
    }

    table.x = 0
    table.w = nextTableWidth
    chart.x = table.w + PANEL_GAP
    chart.w = Math.max(MIN.chart.w, width - chart.x)

    const next = { ...layouts, table, chart }
    if (next.stats) {
      next.stats = { ...next.stats, x: 0, w: width }
    }
    return next
  }

  const normalizeWorkspaceLayouts = (layouts) =>
    centerLayoutsHorizontally(enforceTopRowRatio(alignPanelsToRightEdge(layouts)))

  const setLayouts = (layouts, persist = true) => {
    panelLayouts.value = normalizeWorkspaceLayouts(layouts)
    zCounter.value = Math.max(...IDS.map((id) => panelLayouts.value[id]?.z || 0)) + 1
    if (persist) saveLayouts()
  }

  const saveLayouts = () => {
    if (!project.value?.dataset || !IDS.every((id) => panelLayouts.value[id])) return
    writeJsonStorage(key(), {
      width: canvasW(),
      preset: activePreset.value,
      layouts: panelLayouts.value,
    })
  }

  const loadLayouts = () => {
    try {
      const payload = readJsonStorage(key(), null)
      if (!payload) return false
      const rawPreset = payload?.preset || 'default'
      const preset = rawPreset === 'custom' ? 'custom' : 'default'
      if (preset !== 'custom') {
        activePreset.value = 'default'
        setLayouts(buildPreset('default'), false)
        return true
      }

      const layouts = sanitize(payload.layouts, Number(payload.width))
      if (!layouts) return false

      // Keep the standard workspace proportions: table should be visibly wider than chart.
      const tableWidth = Number(layouts.table?.w || 0)
      const chartWidth = Number(layouts.chart?.w || 0)
      const ratio = chartWidth > 0 ? tableWidth / chartWidth : 0
      if (!Number.isFinite(ratio) || ratio < TABLE_TO_CHART_WIDTH_RATIO) {
        activePreset.value = 'default'
        setLayouts(buildPreset('default'), true)
        return true
      }

      activePreset.value = preset
      setLayouts(layouts, false)
      return true
    } catch (_) {
      return false
    }
  }

  const bringToFront = (id) => {
    if (!panelLayouts.value[id]) return
    panelLayouts.value[id].z = zCounter.value++
  }

  const clampRect = (id, rect) => {
    const width = canvasW()
    const min = MIN[id]
    const out = { x: rect.x, y: rect.y, w: rect.w, h: rect.h }
    out.w = Math.max(min.w, out.w)
    out.h = Math.max(min.h, out.h)
    if (out.w > width) {
      out.w = width
      out.x = 0
    }
    if (out.x < 0) out.x = 0
    if (out.x + out.w > width) out.x = Math.max(0, width - out.w)
    if (out.y < 0) out.y = 0
    return out
  }

  const collides = (id, rect) =>
    IDS.some((otherId) => {
      if (otherId === id) return false
      const other = panelLayouts.value[otherId]
      return other ? rectsOverlap(rect, other) : false
    })

  const applyCandidate = (id, candidate) => {
    const next = clampRect(id, candidate)
    if (collides(id, next)) return false
    Object.assign(panelLayouts.value[id], next)
    return true
  }

  const startDrag = (id, event) => {
    if (viewMode.value !== 'workspace') return
    const panel = panelLayouts.value[id]
    if (!panel) return
    bringToFront(id)
    interaction.value = { type: 'drag', id, sx: event.clientX, sy: event.clientY, base: { ...panel } }
    document.body.style.userSelect = 'none'
  }

  const startResize = (id, dir, event) => {
    if (viewMode.value !== 'workspace') return
    const panel = panelLayouts.value[id]
    if (!panel) return
    bringToFront(id)
    interaction.value = { type: 'resize', id, dir, sx: event.clientX, sy: event.clientY, base: { ...panel } }
    document.body.style.userSelect = 'none'
  }

  const onMove = (event) => {
    const currentInteraction = interaction.value
    if (!currentInteraction) return
    const panel = panelLayouts.value[currentInteraction.id]
    if (!panel) return

    const dx = event.clientX - currentInteraction.sx
    const dy = event.clientY - currentInteraction.sy

    if (currentInteraction.type === 'drag') {
      const base = currentInteraction.base
      const width = canvasW()
      applyCandidate(currentInteraction.id, {
        x: Math.max(0, Math.min(base.x + dx, Math.max(0, width - base.w))),
        y: Math.max(0, base.y + dy),
        w: base.w,
        h: base.h,
      })
      return
    }

    const dir = currentInteraction.dir
    const base = currentInteraction.base
    const min = MIN[currentInteraction.id]
    const right = base.x + base.w
    const bottom = base.y + base.h
    let x = base.x
    let y = base.y
    let w = base.w
    let h = base.h

    if (dir.includes('e')) w = Math.max(min.w, base.w + dx)
    if (dir.includes('s')) h = Math.max(min.h, base.h + dy)
    if (dir.includes('w')) {
      x = Math.min(Math.max(0, base.x + dx), right - min.w)
      w = right - x
    }
    if (dir.includes('n')) {
      y = Math.min(Math.max(0, base.y + dy), bottom - min.h)
      h = bottom - y
    }

    applyCandidate(currentInteraction.id, { x, y, w, h })
  }

  const onUp = () => {
    if (interaction.value) {
      interaction.value = null
      if (viewMode.value === 'workspace') {
        activePreset.value = 'custom'
        saveLayouts()
      }
    }
    document.body.style.userSelect = ''
  }

  const onResizeWindow = () => {
    resizeTick.value += 1
    if (viewMode.value !== 'workspace') return

    const next = {}
    IDS.forEach((id) => {
      if (!panelLayouts.value[id]) return
      next[id] = { ...panelLayouts.value[id], ...clampRect(id, panelLayouts.value[id]) }
    })
    if (!IDS.every((id) => next[id])) return

    const centered = normalizeWorkspaceLayouts(next)
    if (hasAnyOverlap(centered, IDS)) {
      const fallbackPreset = activePreset.value === 'custom' ? 'default' : activePreset.value
      activePreset.value = fallbackPreset
      setLayouts(buildPreset(fallbackPreset), true)
      return
    }

    IDS.forEach((id) => Object.assign(panelLayouts.value[id], centered[id]))
    saveLayouts()
  }

  const setViewMode = (mode) => {
    viewMode.value = mode
  }

  const ensureWorkspaceInitializedForProject = async () => {
    const id = resolveProjectId(projectId)
    if (initializedForProjectId.value === id) return
    await nextTick()
    if (!loadLayouts()) {
      activePreset.value = 'default'
      setLayouts(buildPreset('default'), true)
    }
    requestAnimationFrame(() => onResizeWindow())
    initializedForProjectId.value = id
  }

  const resetWorkspaceRouteState = () => {
    initializedForProjectId.value = null
    viewMode.value = 'workspace'
  }

  const attachWorkspaceListeners = () => {
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('resize', onResizeWindow)
  }

  const detachWorkspaceListeners = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    window.removeEventListener('resize', onResizeWindow)
    document.body.style.userSelect = ''
  }

  return {
    activePreset,
    panelConfig,
    resizeDirs,
    viewMode,
    visiblePanelIds,
    workspaceHeight,
    panelStyle,
    setViewMode,
    bringToFront,
    startDrag,
    startResize,
    onResizeWindow,
    saveLayouts,
    ensureWorkspaceInitializedForProject,
    resetWorkspaceRouteState,
    attachWorkspaceListeners,
    detachWorkspaceListeners,
  }
}
