import { ref } from 'vue'
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { useProjectChartState } from '../../../src/composables/project/useProjectChartState'

const STORAGE_PREFIX = 'dataviz.chart.colors.v1.'

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

const buildSchemaColumns = () => ([
  { id: 1, name: 'Order Date', fieldKey: 'orderDate', semanticType: 'temporal' },
  { id: 2, name: 'Revenue', fieldKey: 'revenue', semanticType: 'metric' },
  { id: 3, name: 'Region', fieldKey: 'region', semanticType: 'nominal' },
])

const buildAnalysisRows = () => ([
  { orderDate: '2024-01-02', revenue: '20', region: 'North' },
  { orderDate: '2024-01-01', revenue: '10', region: 'North' },
  { orderDate: '2024-01-01', revenue: '5', region: 'South' },
])

const buildValidLineDefinition = () => ({
  chartType: 'line',
  bindings: {
    x: 1,
    y: { field: 2, aggregation: 'sum' },
    group: 3,
  },
})

const createChartState = (id = '42') => {
  const projectId = ref(id)
  const schemaColumns = ref(buildSchemaColumns())
  const analysisRows = ref(buildAnalysisRows())
  const state = useProjectChartState({
    projectId,
    schemaColumns,
    analysisRows,
  })

  return {
    state,
    projectId,
    schemaColumns,
    analysisRows,
  }
}

describe('useProjectChartState', () => {
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

  it('builds chart state from a valid definition and stores the normalized definition', () => {
    const { state } = createChartState()

    state.buildChart(buildValidLineDefinition())

    expect(state.chartType.value).toBe('line')
    expect(state.chartDefinition.value).toMatchObject({
      chartType: 'line',
      bindings: {
        x: 1,
        y: { field: 2, aggregation: 'sum' },
        group: 3,
        value: { field: null, aggregation: 'none' },
        category: null,
      },
    })
    expect(state.chartLabels.value).toEqual(['2024-01-01', '2024-01-02'])
    expect(state.chartDatasets.value).toEqual([
      { label: 'North', data: [10, 20], color: '#1db954' },
      { label: 'South', data: [5, 0], color: '#35c9a3' },
    ])
    expect(state.chartMeta.value).toEqual({
      xAxisLabel: 'Order Date',
      yAxisLabel: 'SUM(Revenue)',
    })
  })

  it('clears chart output when the next definition is invalid', () => {
    const { state } = createChartState()

    state.buildChart(buildValidLineDefinition())
    state.buildChart({
      chartType: 'line',
      bindings: {
        x: 1,
        y: { field: null, aggregation: 'sum' },
      },
    })

    expect(state.chartType.value).toBe('line')
    expect(state.chartLabels.value).toEqual([])
    expect(state.chartDatasets.value).toEqual([])
    expect(state.chartMeta.value).toEqual({})
    expect(state.chartDefinition.value).toMatchObject({
      chartType: 'line',
      bindings: {
        x: 1,
        y: { field: null, aggregation: 'sum' },
      },
    })
  })

  it('loads stored series colors and resolves label or index specific colors', () => {
    const { state } = createChartState('project-7')

    localStorage.setItem(
      `${STORAGE_PREFIX}project-7`,
      JSON.stringify({ North: '#112233', series_1: '#445566' })
    )

    state.seriesColors.value = state.loadSeriesColors()

    expect(state.seriesColors.value).toEqual({
      North: '#112233',
      series_1: '#445566',
    })
    expect(state.getSeriesColor('North', 0)).toBe('#112233')
    expect(state.getSeriesColor('', 1)).toBe('#445566')
    expect(state.getSeriesColor('South', 2)).toBe('#4cc9f0')
  })

  it('persists series colors and reapplies them to the current chart', () => {
    const { state } = createChartState('project-8')
    state.buildChart(buildValidLineDefinition())

    state.setSeriesColor('North', 0, '#123456')

    expect(state.seriesColors.value).toEqual({ North: '#123456' })
    expect(state.chartDatasets.value).toEqual([
      { label: 'North', data: [10, 20], color: '#123456' },
      { label: 'South', data: [5, 0], color: '#35c9a3' },
    ])
    expect(localStorage.getItem(`${STORAGE_PREFIX}project-8`)).toBe('{"North":"#123456"}')
  })

  it('resets series colors to palette defaults and persists the empty state', () => {
    const { state } = createChartState('project-9')
    state.buildChart(buildValidLineDefinition())
    state.setSeriesColor('North', 0, '#123456')
    state.setSeriesColor(null, 1, '#abcdef')

    state.resetSeriesColors()

    expect(state.seriesColors.value).toEqual({})
    expect(state.chartDatasets.value).toEqual([
      { label: 'North', data: [10, 20], color: '#1db954' },
      { label: 'South', data: [5, 0], color: '#35c9a3' },
    ])
    expect(localStorage.getItem(`${STORAGE_PREFIX}project-9`)).toBe('{}')
  })

  it('sets preset viewport height and exposes matching preset value and style', () => {
    const { state } = createChartState()

    state.setChartViewportHeight('520')

    expect(state.chartViewportHeight.value).toBe(520)
    expect(state.chartViewportCustom.value).toBe(false)
    expect(state.chartViewportPresetValue.value).toBe('520')
    expect(state.chartViewportStyle.value).toEqual({
      height: '520px',
      minHeight: '280px',
    })
  })

  it('ignores resize sync in preset mode and updates height only in custom mode with a meaningful delta', () => {
    const { state } = createChartState()

    state.syncViewportHeightFromResize(540)
    expect(state.chartViewportHeight.value).toBe(320)

    state.chartViewportCustom.value = true
    state.syncViewportHeightFromResize(541)
    expect(state.chartViewportHeight.value).toBe(541)

    state.syncViewportHeightFromResize(542)
    expect(state.chartViewportHeight.value).toBe(541)
  })

  it('applies resize height while a preset height change is still being processed', () => {
    const queuedCallbacks = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      queuedCallbacks.push(cb)
      return queuedCallbacks.length
    })

    const { state } = createChartState()

    state.setChartViewportHeight('520')
    state.syncViewportHeightFromResize(540)

    expect(state.chartViewportHeight.value).toBe(540)
    expect(queuedCallbacks).toHaveLength(1)

    queuedCallbacks[0]()
  })
})
