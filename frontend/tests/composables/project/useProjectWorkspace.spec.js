import { ref } from 'vue'
import { vi } from 'vitest'
import { useProjectWorkspace } from '../../../src/composables/project/useProjectWorkspace'

const STORAGE_PREFIX = 'dataviz.workspace.layout.v5.'

const createLocalStorageMock = () => {
  const store = new Map()

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null
    },
    setItem(key, value) {
      store.set(String(key), String(value))
    },
    removeItem(key) {
      store.delete(String(key))
    },
    clear() {
      store.clear()
    },
  }
}

const setElementWidth = (element, width) => {
  Object.defineProperty(element, 'clientWidth', {
    configurable: true,
    value: width,
  })
}

const customPayload = (tableWidth) => ({
  preset: 'custom',
  width: 1000,
  layouts: {
    table: { x: 0, y: 0, w: tableWidth, h: 430, z: 1 },
    chart: { x: tableWidth + 16, y: 0, w: 1000 - tableWidth - 16, h: 430, z: 2 },
    stats: { x: 0, y: 446, w: 1000, h: 500, z: 3 },
  },
})

const createWorkspaceState = (id = '1', width = 1000) => {
  const projectId = ref(id)
  const project = ref({
    id: Number(id),
    dataset: { id: Number(id) * 10 },
  })
  const workspaceElement = document.createElement('div')
  setElementWidth(workspaceElement, width)
  const workspaceRef = ref(workspaceElement)

  const state = useProjectWorkspace({
    project,
    projectId,
    workspaceRef,
  })

  return {
    state,
    projectId,
    project,
    workspaceRef,
  }
}

describe('useProjectWorkspace', () => {
  let localStorageMock

  beforeEach(() => {
    localStorageMock = createLocalStorageMock()
    vi.stubGlobal('localStorage', localStorageMock)
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb()
      return 1
    })
  })

  afterEach(() => {
    localStorageMock.clear()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('recovers safely from invalid JSON in localStorage', async () => {
    localStorage.setItem(`${STORAGE_PREFIX}1`, '{"broken-json"')
    const { state } = createWorkspaceState('1')

    await state.ensureWorkspaceInitializedForProject()

    const persisted = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}1`))
    expect(persisted.preset).toBe('default')
    expect(persisted.layouts.table).toBeTruthy()
    expect(persisted.layouts.chart).toBeTruthy()
    expect(persisted.layouts.stats).toBeTruthy()
  })

  it('falls back to default and rewrites storage when saved custom layout is stale', async () => {
    localStorage.setItem(
      `${STORAGE_PREFIX}1`,
      JSON.stringify({
        preset: 'custom',
        width: 1000,
        layouts: {
          table: { x: 0, y: 0, w: 700, h: 430, z: 1 },
          chart: { x: 620, y: 0, w: 380, h: 430, z: 2 },
          stats: { x: 0, y: 446, w: 1000, h: 500, z: 3 },
        },
      })
    )
    const { state } = createWorkspaceState('1')

    await state.ensureWorkspaceInitializedForProject()

    const persisted = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}1`))
    expect(persisted.preset).toBe('default')
  })

  it('restores layouts by project-specific key and does not leak across projects', async () => {
    localStorage.setItem(`${STORAGE_PREFIX}1`, JSON.stringify(customPayload(560)))
    localStorage.setItem(`${STORAGE_PREFIX}2`, JSON.stringify(customPayload(540)))

    const { state, projectId } = createWorkspaceState('1')
    await state.ensureWorkspaceInitializedForProject()

    const tableWidthProject1 = Number.parseInt(state.panelStyle('table').width, 10)
    expect(tableWidthProject1).toBe(560)

    state.resetWorkspaceRouteState()
    projectId.value = '2'
    await state.ensureWorkspaceInitializedForProject()

    const tableWidthProject2 = Number.parseInt(state.panelStyle('table').width, 10)
    expect(tableWidthProject2).toBe(540)
  })

  it('uses compact stacked layouts on narrow workspaces and switches focus modes', async () => {
    const { state } = createWorkspaceState('3', 900)

    await state.ensureWorkspaceInitializedForProject()

    expect(state.isCompactWorkspace.value).toBe(true)
    expect(state.visiblePanelIds.value).toEqual(['table', 'chart', 'stats'])
    expect(state.panelStyle('table')).toMatchObject({
      left: '0px',
      width: '900px',
    })
    expect(state.panelStyle('chart')).toMatchObject({
      left: '0px',
      width: '900px',
    })

    state.setViewMode('library')
    expect(state.visiblePanelIds.value).toEqual(['library'])
    expect(state.panelStyle('library')).toMatchObject({
      left: '0px',
      width: '900px',
      height: '720px',
    })
    expect(state.workspaceHeight.value).toBe(760)

    state.setViewMode('workspace')
    const compactTableStyle = state.panelStyle('table')
    state.startDrag('table', { clientX: 10, clientY: 10 })
    state.startResize('table', 'e', { clientX: 10, clientY: 10 })
    expect(state.panelStyle('table')).toEqual(compactTableStyle)
  })

  it('persists custom layouts after drag and resize interactions', async () => {
    const { state } = createWorkspaceState('4', 1120)

    await state.ensureWorkspaceInitializedForProject()
    state.attachWorkspaceListeners()

    const initialStats = state.panelStyle('stats')
    state.startDrag('stats', { clientX: 20, clientY: 20 })
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 70, clientY: 80 }))
    window.dispatchEvent(new MouseEvent('mouseup'))

    const draggedStats = state.panelStyle('stats')
    expect(Number.parseInt(draggedStats.top, 10)).toBeGreaterThan(Number.parseInt(initialStats.top, 10))

    state.startResize('stats', 's', { clientX: 0, clientY: 0 })
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, clientY: 80 }))
    window.dispatchEvent(new MouseEvent('mouseup'))

    const resizedStats = state.panelStyle('stats')
    expect(Number.parseInt(resizedStats.height, 10)).toBeGreaterThan(Number.parseInt(draggedStats.height, 10))

    const persisted = JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}4`))
    expect(persisted.preset).toBe('custom')
    expect(persisted.layouts.stats.h).toBeGreaterThan(0)

    state.detachWorkspaceListeners()
    state.resetWorkspaceRouteState()
    expect(state.viewMode.value).toBe('workspace')
    expect(state.panelStyle('table')).toEqual({})
  })
})
