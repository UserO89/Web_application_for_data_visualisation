import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockEcharts = vi.hoisted(() => ({
  use: vi.fn(),
  init: vi.fn(),
}))

const mockBuildEChartOption = vi.hoisted(() => vi.fn())

vi.mock('echarts/core', () => mockEcharts)
vi.mock('echarts/charts', () => ({
  LineChart: {},
  BarChart: {},
  PieChart: {},
  ScatterChart: {},
  BoxplotChart: {},
}))
vi.mock('echarts/components', () => ({
  GridComponent: {},
  TooltipComponent: {},
  LegendComponent: {},
  TitleComponent: {},
  DatasetComponent: {},
  TransformComponent: {},
}))
vi.mock('echarts/features', () => ({
  LegacyGridContainLabel: {},
}))
vi.mock('echarts/renderers', () => ({
  CanvasRenderer: {},
}))
vi.mock('../../../src/charts/chartTransformers/chartDefinitionToEChartsOption', () => ({
  buildEChartOption: mockBuildEChartOption,
}))

import { downloadSavedChartPng } from '../../../src/utils/project/chartLibrary'

describe('downloadSavedChartPng', () => {
  let chartInstance
  let createElementSpy
  let anchor

  beforeEach(() => {
    chartInstance = {
      setOption: vi.fn(),
      resize: vi.fn(),
      getDataURL: vi.fn(() => 'data:image/png;base64,chart'),
      dispose: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    }

    mockEcharts.use.mockClear()
    mockEcharts.init.mockReset()
    mockEcharts.init.mockReturnValue(chartInstance)

    mockBuildEChartOption.mockReset()
    mockBuildEChartOption.mockReturnValue({
      animation: true,
      series: [
        {
          type: 'line',
          data: [10, 20],
        },
      ],
    })

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback()
      return 1
    })
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback) => {
      callback()
      return 1
    })

    const originalCreateElement = document.createElement.bind(document)
    anchor = null
    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      const element = originalCreateElement(tagName)
      if (String(tagName).toLowerCase() === 'a') {
        anchor = element
        element.click = vi.fn()
      }
      return element
    })
  })

  afterEach(() => {
    createElementSpy.mockRestore()
    vi.restoreAllMocks()
  })

  it('renders a detached chart and downloads a sanitized PNG file', async () => {
    const initialBodyChildren = document.body.childElementCount

    await downloadSavedChartPng({
      type: 'bar',
      labels: ['Jan', 'Feb'],
      datasets: [{ label: 'Revenue', data: [10, 20] }],
      meta: { yAxisLabel: 'Revenue' },
    }, 'Revenue Chart')

    expect(mockBuildEChartOption).toHaveBeenCalledWith({
      type: 'bar',
      labels: ['Jan', 'Feb'],
      datasets: [{ label: 'Revenue', data: [10, 20] }],
      meta: { yAxisLabel: 'Revenue' },
    })
    expect(mockEcharts.init).toHaveBeenCalledTimes(1)
    expect(chartInstance.setOption).toHaveBeenCalledTimes(1)

    const exportedOption = chartInstance.setOption.mock.calls[0][0]
    expect(exportedOption.animation).toBe(false)
    expect(exportedOption.series[0]).toMatchObject({
      animation: false,
      animationDuration: 0,
      animationDurationUpdate: 0,
      progressive: 0,
      progressiveThreshold: 0,
    })

    expect(chartInstance.resize).toHaveBeenCalledWith({
      width: 1200,
      height: 720,
      silent: true,
    })
    expect(chartInstance.getDataURL).toHaveBeenCalledWith({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#111111',
    })
    expect(anchor.download).toBe('Revenue_Chart.png')
    expect(anchor.click).toHaveBeenCalledTimes(1)
    expect(chartInstance.dispose).toHaveBeenCalledTimes(1)
    expect(document.body.childElementCount).toBe(initialBodyChildren)
  })

  it('normalizes missing chart fields to safe defaults', async () => {
    await downloadSavedChartPng({}, '')

    expect(mockBuildEChartOption).toHaveBeenCalledWith({
      type: 'line',
      labels: [],
      datasets: [],
      meta: {},
    })
    expect(anchor.download).toBe('chart.png')
  })
})
